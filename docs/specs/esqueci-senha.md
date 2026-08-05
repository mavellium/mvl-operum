# Especificação Técnica — Recuperação de Senha ("Esqueci minha senha") — MVL Operum

> **Escopo:** fluxo completo de recuperação de senha, backend (auth-service NestJS) + frontend (Next.js). Consistente com a arquitetura de autenticação existente (JWT RS256, bcrypt, Redis, multi-tenant por subdomínio).
>
> **Pré-existente na arquitetura:** endpoints `/auth/password/*`, campos `resetToken`/`resetTokenExpiry`, rate limit `reset_rate:{email}`, `PasswordSchema`. Esta spec **formaliza** esses pontos e **preenche** as lacunas (entrega de e-mail, limite de tentativas, wizard de UI).
>
> Marcações: **✅** decidido • **⚠️ DECISÃO** pendente • **🔧** adição/lacuna preenchida.

---

## 1. Visão geral do fluxo

Recuperação em **3 etapas**, com proteção contra enumeração de usuários e contra brute-force do código:

```
Etapa 1 — Solicitar          Etapa 2 — Validar código       Etapa 3 — Redefinir
┌────────────────┐           ┌────────────────┐             ┌────────────────┐
│ usuário informa│           │ usuário digita │             │ usuário define │
│ o e-mail       │──────────▶│ o código de 8  │────────────▶│ a nova senha   │
│                │  e-mail   │ caracteres     │  código ok  │ (+ confirmação)│
└────────────────┘  enviado  └────────────────┘             └────────────────┘
                                                                     │
                                                          tokenVersion++ → invalida
                                                          todas as sessões anteriores
```

**Princípios de segurança (✅):**
1. **Anti-enumeração:** a Etapa 1 **sempre** responde sucesso, exista o e-mail ou não.
2. **Código nunca volta ao cliente:** o código só vai por e-mail; a API nunca o retorna no corpo da resposta.
3. **Armazenamento por hash:** o banco guarda `SHA256(código)`, nunca o código em claro.
4. **Expiração curta:** 15 minutos.
5. **Uso único:** o código é limpo após redefinição bem-sucedida.
6. **Rate limit duplo:** por e-mail (solicitação) **e** por tentativas de validação (anti-brute-force). 🔧
7. **Invalidação de sessões:** redefinir senha incrementa `tokenVersion` e revoga as sessões no Redis.

---

## 2. Modelo de dados

Campos já existentes no `model User` (`prisma/schema.prisma`) — **nenhuma migration nova obrigatória**:

```prisma
resetToken        String?    // SHA256(código) em hex
resetTokenExpiry  DateTime?  // agora + 15 min
tokenVersion      Int        @default(0)
```

🔧 **Adição recomendada** (anti-brute-force, ver §5.3) — requer migration:

```prisma
resetAttempts     Int        @default(0)  // tentativas de validação do código atual
```

> Alternativa sem migration: manter o contador de tentativas **só no Redis** (`reset_attempts:{userId}`, TTL 15 min). ⚠️ DECISÃO — recomendo o Redis (zero migration, expira sozinho). A spec assume **Redis** a partir daqui; se preferir a coluna, ajustar o service.

---

## 3. Entrega do código por e-mail ⚠️ DECISÃO (a única que bloqueia o fluxo)

A arquitetura atual gera o código mas **não o entrega**. Sem entrega o usuário não recebe nada. Proposta:

**Recomendado:** `MailerService` no auth-service, com abstração de provedor.

- **Interface:** `MailerService.sendPasswordResetCode(email, code, tenantName): Promise<void>`
- **Implementação default:** SMTP via `nodemailer` (env vars abaixo). Funciona com qualquer provedor (Gmail SMTP, Amazon SES SMTP, Mailtrap em dev, etc.).
- **Template:** e-mail HTML simples e responsivo, com o código em destaque, validade de 15 min e aviso "se não foi você, ignore".
- **Dev/local sem SMTP:** se as env vars de SMTP não estiverem setadas, **logar o código no console** do auth-service (nível `warn`) em vez de enviar — permite testar sem provedor. **Nunca** retornar o código na resposta HTTP.
- **Falha de envio:** logar o erro internamente, mas **a resposta ao cliente continua sucesso** (anti-enumeração). Não vazar falha de SMTP para o cliente.

> Alternativas: (a) usar um provedor transacional via API (SendGrid/Resend/SES) em vez de SMTP; (b) despachar o envio via fila BullMQ/notification-service para desacoplar. ⚠️ Confirmar provedor e se quer envio assíncrono. A spec assume **SMTP síncrono via nodemailer** com fallback de log em dev.

**Env vars novas:**

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `SMTP_HOST` | Prod | Host SMTP |
| `SMTP_PORT` | Prod | Porta (587 STARTTLS / 465 SSL) |
| `SMTP_USER` | Prod | Usuário SMTP |
| `SMTP_PASSWORD` | Prod | Senha SMTP |
| `SMTP_FROM` | Prod | Remetente, ex: `"Operum <no-reply@mavellium.com.br>"` |
| `APP_PUBLIC_URL` | Sim | Base para link no e-mail (ex: `https://operum.adm.br`) |

---

## 4. API — auth-service (NestJS, `@Public`)

Base: `AUTH_SERVICE_URL` (default `http://auth-service:4001`). Todas as rotas abaixo são **públicas** (sem JWT). Validação de DTO via **Zod**.

### 4.1 `POST /auth/password/request-reset`

**Request:**
```json
{ "email": "user@exemplo.com", "subdomain": "nairim" }
```
**Lógica:**
1. Rate limit Redis `reset_rate:{email}` — máx **3 / 15 min**. Excedeu → `429` (mensagem genérica de "muitas solicitações").
2. Resolve `tenantId` pelo `subdomain`.
3. Busca `User` por `(email, tenantId)` com `deletedAt = null` e `isActive = true`.
4. **Se existe:** gera código (§5.1), salva `resetToken = SHA256(code)`, `resetTokenExpiry = agora+15min`, zera `reset_attempts:{userId}`; envia e-mail (§3).
5. **Se não existe:** não faz nada (mas consome o mesmo tempo médio — ver §5.4).
6. **Sempre responde:**
```json
{ "success": true, "message": "Se o e-mail estiver cadastrado, você receberá um código." }
```

### 4.2 `POST /auth/password/validate-code`

**Request:**
```json
{ "email": "user@exemplo.com", "code": "A7K9P2QX", "subdomain": "nairim" }
```
**Lógica:**
1. Resolve tenant + usuário (como acima).
2. **Anti-brute-force:** incrementa `reset_attempts:{userId}` (Redis, TTL 15 min). Se > **5** → invalida o código (`resetToken = null`) e responde erro genérico. 🔧
3. Confere `resetTokenExpiry > agora` **e** `SHA256(code) === resetToken`.
4. **Ok:** `{ "success": true }`. **NÃO** consome o código aqui (só a Etapa 3 consome).
5. **Falha:** `400 { "success": false, "error": "Código inválido ou expirado." }` (mesma mensagem para inválido e expirado).

### 4.3 `POST /auth/password/reset`

**Request:**
```json
{ "email": "...", "code": "A7K9P2QX", "newPassword": "...", "subdomain": "nairim" }
```
**Lógica:**
1. Resolve tenant + usuário.
2. Re-valida código + expiração (igual §4.2) — não confiar que a Etapa 2 passou.
3. Valida `newPassword` com `PasswordSchema` (min 8, ≥1 número, ≥1 especial).
4. `passwordHash = bcrypt(newPassword, 12)`.
5. Limpa `resetToken = null`, `resetTokenExpiry = null`; deleta `reset_attempts:{userId}`.
6. `tokenVersion++` → invalida sessões antigas.
7. **Revoga sessões Redis** do usuário (best-effort): remove chaves `session:{jti}` ativas (ou confia no `tokenVersion` no gateway).
8. Responde `{ "success": true }`.

> **Erros** em todas as rotas: corpo `{ success: false, error }` com mensagens genéricas; status `400` (validação), `429` (rate limit), `500` (interno — sem detalhe).

---

## 5. Lógica de backend (detalhes)

### 5.1 Geração do código (✅)
- **8 caracteres**, charset **sem ambíguos**: `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (sem `0/O/1/I/L`).
- Gerar com CSPRNG (`crypto.randomInt` / `randomBytes`), **não** `Math.random`.
- Função pura testável: `generateResetCode(): string` em `auth-service/src/lib/crypto.ts`.

### 5.2 Hash do código
- `hashResetCode(code) = sha256(code).hexdigest()`. Comparação por igualdade de hash (tempo constante via `crypto.timingSafeEqual` sobre os buffers). 🔧

### 5.3 Limite de tentativas (anti-brute-force) 🔧
- Chave Redis `reset_attempts:{userId}`, TTL 15 min, máx **5** tentativas de validação por código emitido.
- Estourou → invalida o código atual; usuário precisa solicitar novo.

### 5.4 Tempo constante anti-enumeração
- Quando o e-mail não existe, ainda assim executar um bcrypt "dummy" (ou um delay equivalente) para o tempo de resposta não denunciar a existência da conta. 🔧

### 5.5 Multi-tenant
- `subdomain` → `tenantId`. Toda busca de usuário é escopada por `(email, tenantId)` (constraint `@@unique([email, tenantId])`).

---

## 6. Camada Next.js (Server Actions)

Arquivo: `app/actions/auth.ts` (ou `app/actions/passwordReset.ts`). Cada action chama o auth-service via `lib/authClient.ts` e valida o input com Zod antes.

| Action | Chama | Retorno |
|--------|-------|---------|
| `requestPasswordResetAction(email)` | `POST /auth/password/request-reset` | `{ success: true }` (sempre) |
| `validateResetCodeAction(email, code)` | `POST /auth/password/validate-code` | `{ success } / { error }` |
| `resetPasswordAction(email, code, newPassword)` | `POST /auth/password/reset` | `{ success } / { error }` |

- `subdomain` é derivado do host da request (não vem do cliente).
- Nenhuma dessas actions seta cookie de sessão — após sucesso, o usuário é mandado para `/login`.

---

## 7. Frontend — Wizard de 3 etapas

**Rota:** `app/(auth)/recuperar-senha/page.tsx`
**Componente:** `components/auth/RecuperarSenhaForm.tsx`
**Reutiliza:** `AuthBrandPanel.tsx` (painel de marca compartilhado com o Login, tema claro) e `components/ui/{Button, Modal}`.

### 7.1 Layout
- Mesma linguagem visual do Login (split-screen, tema claro, paleta `--brand-*`).
- Card do formulário à direita; **indicador de progresso** de 3 segmentos no topo do card (preenche conforme avança, transição 300ms).
- **Transição entre etapas:** slide horizontal (etapa que sai → esquerda/opacity 0; entra → da direita), controlado por estado `step`.

### 7.2 Etapa 1 — E-mail
- 1 input de e-mail (floating label), botão "Enviar código".
- Ao submeter: `requestPasswordResetAction`. **Sempre** avança para a Etapa 2 (anti-enumeração), exibindo "Enviamos um código para {email} se ele estiver cadastrado."
- Loading no botão durante a chamada.

### 7.3 Etapa 2 — Código
- Entrada estilo **OTP**: 8 inputs de 1 caractere (ou 1 input monoespaçado `maxLength=8`, uppercase automático).
- Botão "Validar". Ao submeter: `validateResetCodeAction`.
- Erro inline "Código inválido ou expirado." em falha.
- **Reenviar código:** link "Reenviar" com cooldown de 60s (respeita o rate limit de 3/15min — após 3, desabilitar e avisar).
- Botão "Voltar" para a Etapa 1.

### 7.4 Etapa 3 — Nova senha
- Campo "Nova senha" (com botão olho) + "Confirmar senha".
- **Checklist de critérios em tempo real** (marca ✓ conforme digita): mín 8 caracteres • ao menos 1 número • ao menos 1 caractere especial • senhas coincidem.
- Botão "Redefinir senha" habilita só quando todos os critérios passam.
- Ao submeter: `resetPasswordAction`.

### 7.5 Estado de sucesso
- Tela com **checkmark SVG animado** (stroke-dashoffset) + "Senha redefinida com sucesso!" + botão "Ir para o login" → `/login`.
- Não há mais botão "Voltar" nesse estado.

### 7.6 Acessibilidade
- Labels associadas (`htmlFor`/`id`); foco visível; tab order correto; inputs OTP navegáveis por teclado (auto-foco e backspace entre eles).
- `@media (prefers-reduced-motion: reduce)` desliga animações.
- Erros anunciados via `aria-live="polite"`.

---

## 8. Validação (Zod) — `lib/validation/authSchemas.ts`

```typescript
export const RequestResetSchema = z.object({ email: z.string().email() });
export const ValidateCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(8).regex(/^[A-Z2-9]+$/),
});
export const PasswordSchema = z.string()
  .min(8, 'Mínimo de 8 caracteres')
  .regex(/[0-9]/, 'Pelo menos 1 número')
  .regex(/[^A-Za-z0-9]/, 'Pelo menos 1 caractere especial');
export const ResetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(8),
  newPassword: PasswordSchema,
});
```

---

## 9. BDD

```gherkin
Funcionalidade: Solicitar recuperação (anti-enumeração)
  Cenário: E-mail cadastrado
    Dado um usuário ativo com e-mail "ana@x.com" no tenant "nairim"
    Quando solicita recuperação para "ana@x.com"
    Então um código de 8 caracteres é gerado e o SHA256 é salvo em resetToken
    E um e-mail com o código é enviado
    E a resposta é sucesso genérico

  Cenário: E-mail não cadastrado
    Quando solicita recuperação para "naoexiste@x.com"
    Então nenhum código é gerado e nenhum e-mail é enviado
    E a resposta é o MESMO sucesso genérico
    E o tempo de resposta é equivalente ao do caso cadastrado

Funcionalidade: Validar código
  Cenário: Código correto e dentro do prazo
    Dado um resetToken válido para "ana@x.com" gerado há 5 minutos
    Quando valida com o código correto
    Então a resposta é sucesso e o código NÃO é consumido

  Cenário: Código expirado
    Dado um resetToken gerado há 16 minutos
    Quando valida com o código correto
    Então a resposta é "Código inválido ou expirado"

  Cenário: Brute-force bloqueado
    Dado 5 tentativas de validação falhas para "ana@x.com"
    Quando tenta validar pela 6ª vez
    Então o código atual é invalidado
    E é necessário solicitar um novo código

Funcionalidade: Redefinir senha
  Cenário: Sucesso
    Dado um código válido para "ana@x.com"
    Quando envia nova senha que atende ao PasswordSchema
    Então a senha é atualizada (bcrypt 12)
    E resetToken e resetTokenExpiry são limpos
    E tokenVersion é incrementado
    E todas as sessões anteriores são invalidadas

  Cenário: Senha fraca
    Quando envia "abc" como nova senha
    Então a resposta lista os critérios não atendidos
    E a senha NÃO é alterada
```

---

## 10. TDD (Vitest 4.1.2)

**Backend (auth-service)**
- `crypto.test.ts`: `generateResetCode` retorna 8 chars do charset sem ambíguos; alta entropia (sem repetição trivial); `hashResetCode` determinístico.
- `passwordReset.service.test.ts`: e-mail inexistente não gera token e responde sucesso; código correto valida; expirado falha; 6ª tentativa invalida; reset atualiza hash + limpa token + incrementa tokenVersion.
- Tempo constante: caminho de e-mail inexistente executa bcrypt dummy.

**Next.js**
- `authSchemas.test.ts`: `PasswordSchema`, `ValidateCodeSchema` (8 chars, charset), edge cases.
- `passwordReset.actions.test.ts` (integration, MSW mockando auth-service): cada action; `requestPasswordResetAction` sempre sucesso.
- `RecuperarSenhaForm.test.tsx` (component): navega as 3 etapas; mantém e-mail entre etapas; checklist de senha reage à digitação; estado de sucesso aparece.

---

## 11. Segurança — checklist

- [ ] Código por CSPRNG, charset sem ambíguos, 8 chars.
- [ ] Banco guarda só `SHA256(código)`; comparação em tempo constante.
- [ ] Expiração 15 min; uso único (limpo no reset).
- [ ] Rate limit: 3 solicitações/e-mail/15min **e** 5 validações/código.
- [ ] Resposta sempre genérica na Etapa 1 (anti-enumeração) + tempo constante.
- [ ] Código nunca retornado em resposta HTTP; só por e-mail (dev: log).
- [ ] `tokenVersion++` e revogação de sessões no reset.
- [ ] Falha de SMTP não vaza para o cliente.
- [ ] `subdomain` derivado do host, não do cliente.

---

## 12. Checklist de implementação (ordem)

1. (Se optar por coluna) migration `resetAttempts` — ou usar Redis (recomendado, sem migration).
2. `auth-service/src/lib/crypto.ts`: `generateResetCode`, `hashResetCode`. Testes.
3. `auth-service/src/mailer/mailer.service.ts`: `sendPasswordResetCode` + template + fallback de log em dev.
4. `auth-service` password reset: controller (3 rotas `@Public`) + service (lógica §4–5). Testes.
5. `lib/validation/authSchemas.ts`: schemas de reset.
6. `app/actions/*`: `requestPasswordResetAction`, `validateResetCodeAction`, `resetPasswordAction`.
7. `components/auth/AuthBrandPanel.tsx` (se ainda não extraído do Login).
8. `components/auth/RecuperarSenhaForm.tsx`: wizard 3 etapas + sucesso. Testes.
9. `app/(auth)/recuperar-senha/page.tsx`.
10. E-mail end-to-end em staging (SMTP real). `pnpm build` + testes.
```