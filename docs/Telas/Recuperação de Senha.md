> Tela responsável por permitir que usuários redefinam sua senha de forma segura, seguindo fluxo anti-abuso e garantindo rastreabilidade.

---

## 🖥️ Campos

- **Email** (string) – obrigatório, usado para envio do código de recuperação
- **Código de recuperação** (string) – enviado por email, obrigatório para validação
- **Nova senha** (string) – obrigatória, mascarada
- **Confirmar senha** (string) – obrigatória, deve coincidir com nova senha
- Botões:
    - **Enviar código**
    - **Validar código**
    - **Redefinir senha**

---

## 🔐 Regras de Segurança

1. **Solicitação de código**
    - Email fornecido não deve revelar existência no sistema
    - Intervalo mínimo entre solicitações para prevenir spam
    - Limite de envios por período configurável
2. **Geração do código**
    - Código aleatório e único por solicitação
    - Comprimento: 8 caracteres
    - Letras maiúsculas e minúsculas, números e símbolos
    - Não previsível, sem padrões sequenciais
    - Expiração curta (ex: 10–15 minutos)
    - Apenas código mais recente é válido
3. **Validação do código**
    - Confirma se código está correto, active e não expirou
    - Após 3 tentativas inválidas → bloqueio temporário 5 minutos
    - Próximo ciclo de 3 tentativas inválidas → bloqueio permanente
    - Bloqueio permanente só pode ser revertido por administrador
4. **Redefinição de senha**
    - Nova senha deve cumprir critérios de complexidade
    - Não pode ser igual à anterior
    - Alteração válida só após confirmação de sucesso
    - Todas sessões ativas do usuário são invalidadas automaticamente
5. **Sessões e MFA**
    - Sessões expiradas ou invalidadas não podem ser reutilizadas
    - MFA continua aplicável para usuários administractives

---

## 🔄 Fluxos

### 1. Solicitação de Código

- Usuário informa email
- Sistema envia código aleatório para o email
- Registro do envio para auditoria
- Bloqueios anti-spam aplicados se necessário

### 2. Validação do Código

- Usuário informa código recebido
- Sistema verifica:
    - Correção do código
    - Validade (não expirado)
    - Código active (último gerado)
- Em caso de sucesso, usuário autorizado a redefinir senha
- Falha → contador de tentativas atualizado, bloqueio progressivo se necessário

### 3. Redefinição da Senha

- Usuário informa nova senha e confirmação
- Sistema valida complexidade e igualdade das senhas
- Senha atualizada com hash seguro
- Sessões antigas invalidadas
- Usuário redirecionado para [[Login]]

---

## 📧 Comunicação

- Email enviado quando:
    - Solicitação de código realizada
    - Código validado com sucesso
    - Senha redefinida com sucesso
    - Tentativas suspeitas detectadas
- Notificação de administrador se bloqueio permanente for atingido

---

## 🧠 Regras Implícitas Importantes

- Fluxo independente do estado de login
- Proteção contra enumeração de usuários
- Controle de tentativas simultâneas consistente
- Total isolamento entre tenants
- Rastreamento completo de eventos críticos

---

## 🧩 Auditoria

- Registra:
    - Usuário
    - Tenant / subdomínio
    - Horário de solicitação, validação e redefinição
    - Origem / IP
    - Sucesso ou falha de operação

---

## ⚙️ Estados da Tela

- **Normal** → campos de email actives
- **Código enviado** → campos de validação do código actives
- **Código inválido** → mensagens genéricas e contador atualizado
- **Bloqueio temporário** → campos desativados até expiração
- **Bloqueio permanente** → ação bloqueada, admin notificado
- **Senha redefinida** → redirecionamento automático para [[Login]]