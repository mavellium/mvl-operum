> Representa uma organização (empresa) dentro do sistema SaaS, sendo responsável por isolar dados, usuários, projetos e configurações.

---

## 🧱 Campos

- Nome
- Subdomínio
- Status (active | inactive | suspenso | removido)
- Data de Criação

---

## 🔗 Relacionamentos

- Um [[Tenant]] possui muitos [[Usuário]] (1:N)
- Um [[Tenant]] possui muitos [[Projeto]] (1:N)
- Um [[Tenant]] possui muitos [[Departamento]] (1:N)
- Um [[Tenant]] pode possuir muitos [[Papel]] _(caso papéis customizados sejam permitidos)_

---

## ⚙️ Métodos

- criarTenant()
- atualizarTenant()
- ativar()
- inativar()
- suspender()
- remover()
- validarSubdominio()
- configurarTenant()

---

## 📏 Regras de Negócio

### Estrutura

- Um [[Tenant]] representa uma empresa isolada dentro do sistema
- Todos os dados devem estar vinculados a um [[Tenant]]
- Não deve existir compartilhamento de dados entre tenants

---

### Subdomínio

- Cada [[Tenant]] deve possuir um subdomínio único
- O subdomínio é utilizado para:
    - identificar o contexto de acesso
    - isolar autenticação
- O sistema deve identificar o [[Tenant]] automaticamente via subdomínio

---

### Consistência

- O nome pode se repetir, mas o subdomínio deve ser único globalmente
- Um [[Tenant]] não pode ser removido fisicamente (soft delete obrigatório)
- Um [[Tenant]] removido:
    - não pode ser reativado diretamente
    - deve ser mantido para auditoria

---

### Ciclo de vida

- Um [[Tenant]] pode possuir os estados:
    - active → operação normal
    - inactive → acesso bloqueado, dados preservados
    - suspenso → bloqueio por regra de negócio (ex: inadimplência)
    - removido → soft delete

---

### Governança

- Um [[Tenant]] deve possuir ao menos um [[Usuário]] com papel administractive global
- A criação de um [[Tenant]] deve gerar:
    - usuário inicial (administrador)
    - papéis base do sistema
    - permissões padrão

---

## 🔐 Regras de Segurança

- Isolamento de dados deve ser obrigatório entre tenants
- Todas as queries devem respeitar o contexto do [[Tenant]]
- Autenticação deve ser contextualizada por subdomínio
- Um [[Usuário]] não pode acessar dados de outro [[Tenant]]
- Alterações críticas devem ser auditadas

---

## 🧪 BDD

### Criação de tenant

- Dado um novo cadastro de empresa
- Quando criar um [[Tenant]]
- Então deve ser gerado um subdomínio único
- E um usuário administrador inicial

---

### Acesso por subdomínio

- Dado um acesso ao sistema via URL
- Quando o subdomínio for identificado
- Então o sistema deve carregar o contexto do [[Tenant]]

---

### Isolamento de dados

- Dado um [[Usuário]] autenticado
- Quando acessar dados
- Então o sistema deve restringir ao seu [[Tenant]]

---

### Suspensão

- Dado um [[Tenant]] suspenso
- Quando um [[Usuário]] tentar acessar
- Então o sistema deve bloquear o acesso

---

## 🧬 SDD (System Design Decisions)

- [[Tenant]] é o boundary principal de isolamento do sistema  
- Todas as entidades devem estar associadas a um [[Tenant]]  
- O sistema utiliza arquitetura multi-tenant com isolamento lógico  
- A identificação do tenant é feita via subdomínio  
- O contexto do tenant deve ser resolvido antes de qualquer operação

---

## 🔄 Estados

- active
- inactive
- suspenso
- removido