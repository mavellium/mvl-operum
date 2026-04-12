> Tela principal de autenticação do sistema, responsável por validar o usuário, contexto da empresa e iniciar sessões seguras.

---

## 🖥️ Campos

- **Email** (string) – obrigatório, case-insensitive
- **Senha** (string) – obrigatório, mascarada
- [[Recuperação de Senha]] – link para fluxo de recuperação
- **Botão Entrar** – inicia autenticação
- **Checkbox “Lembrar-me”** (opcional) – persistência de sessão

---

## 🌐 Contexto de Acesso (Multi-Tenant)

- Subdomínio identifica o [[Tenant]] automaticamente:
    - Ex.: `nairim.operum.com.br`, `oceancooffe.operum.com.br`, `admin.operum.com.br`
- Um mesmo email pode existir em múltiplos tenants, com permissões diferentes
- O acesso deve respeitar o vínculo do usuário com o tenant
- Caso o usuário não tenha vínculo com o tenant do subdomínio, login negado
- Sistema não revela se erro é por credencial ou subdomínio (mensagem genérica)

---

## 🔐 Regras de Segurança e Autenticação

1. **Validação básica**
    - Combinação de email + senha + contexto do tenant
    - Email deve existir e usuário estar active
    - Senhas armazenadas com hash seguro (ex: bcrypt, Argon2)
2. **Tentativas e bloqueio**
    - 3 tentativas inválidas → bloqueio temporário 5 minutos
    - Próximo ciclo de 3 tentativas → bloqueio 1 hora
    - Próximo ciclo de 3 tentativas → bloqueio permanente
    - Bloqueios progressivos e cumulactives
    - Reset de contador após login bem-sucedido
    - Tentativas são validadas por subdomínio (isolamento entre tenants)
3. **Sessões**
    - Controle de múltiplas sessões por usuário
    - Sessões expirando após período de inatividade configurável
    - Logout encerra sessão imediatamente
    - Sessões vinculadas ao contexto do tenant
    - Sessões inválidas ou suspeitas são rejeitadas
4. **MFA (Multi-Factor Authentication)**
    - Obrigatório para usuários administractives ou críticos
    - Verificação após credenciais válidas
5. **Proteção anti-abuso**
    - Limita tentativas de login em curto período
    - Detecta padrões anômalos ou distribuídos
    - Bloqueia automaticamente comportamentos suspeitos
    - Logins a partir de novos dispositivos ou locais geram alertas

---

## 🔄 Fluxos

### 1. Fluxo de Login Bem-Sucedido

- Usuário informa email + senha
- Sistema valida subdomínio e credenciais
- Autenticação bem-sucedida:
    - Registra último acesso
    - Cria sessão vinculada ao tenant
    - Redireciona:
        - Usuário comum → dashboard do tenant
        - Usuário administractive → painel administractive (`admin.operum.com.br`)

### 2. Login Inválido

- Email ou senha incorretos:
    - Mensagem genérica: “Email ou senha inválidos”
- Contador de tentativas inválidas incrementado
- Se limite excedido → aplica bloqueio progressivo

### 3. Bloqueio de Conta

- Bloqueio temporário → impede novas tentativas até expirar
- Bloqueio permanente → só administrador pode liberar
- Sistema registra e notifica o usuário/admin sobre bloqueio

---

## 📧 Comunicação

- Alertas por email ou notificação em casos de:
    - Login bem-sucedido
    - Tentativas suspeitas
    - Bloqueio temporário ou permanente

---

## 🧠 Regras Implícitas Importantes

- Emails tratados de forma **case-insensitive**
- Senhas devem respeitar critérios de complexidade mínima
- Sistema resiliente a **ataques de força bruta distribuídos**
- Total isolamento entre tenants: autenticação e dados
- Registro de todos eventos críticos para auditoria

---

## 🧩 Auditoria

- Logs incluem:
    - Usuário
    - Tenant / subdomínio
    - Horário
    - IP / origem
    - Sucesso ou falha de login
- Logs imutáveis para auditoria

---

## ⚙️ Estados da Tela/Login

- **Normal** → campos actives, pronto para autenticação
- **Erro** → tentativas inválidas exibem mensagens genéricas
- **Bloqueado Temporário** → campos desativados até expiração
- **Bloqueado Permanente** → campos desativados, admin notificado
- **Redirecionamento** → após login bem-sucedido, direciona para dashboard ou painel