> Representa um usuário do sistema, vinculado a um [[Tenant]], com papéis, permissões e acesso a projetos e departamentos.

---

## 🧱 Campos

- Nome
- E-mail
- Status (convidado | ativo | inativo | bloqueado | removido)
- [[Departamento]]
- Valor/Hora (R$)
- Custo Interno (opcional)
- Data de Criação
- Último Acesso

---

## 🔐 Segurança

- Senha (hash)
- MFA habilitado (boolean)
- Tentativas de login
- Data do último reset de senha

---

## ⚙️ Métodos

- associarAoProjeto([[Projeto]])
- removerDoProjeto([[Projeto]])
- atribuirPapel([[Projeto]], [[Papel]])
- removerPapel([[Projeto]], [[Papel]])
- alterarDepartamento([[Departamento]])
- ativar()
- desativar()
- bloquear()
- autenticar()
- redefinirSenha()
- registrarAcesso()

---

## 📏 Regras de Negócio

### Relacionamentos

- Cada [[Usuário]] pode estar em nenhum ou muitos [[Projeto]] (0:N)
- Cada [[Usuário]] pode possuir múltiplos [[Papel]] dentro de um mesmo [[Projeto]]
- Cada [[Usuário]] pode estar em nenhum ou muitos [[Departamento]] (0:N)
- Cada [[Usuário]] pertence a exatamente um [[Tenant]]

---

### Consistência

- O e-mail deve ser único dentro do [[Tenant]]
- Um [[Usuário]] não pode ser removido de um [[Projeto]] se:
    - for o único com papel de gestão (Administrador ou equivalente)
- Um [[Usuário]] com status:
    - inativo ou bloqueado não pode autenticar
    - convidado não pode acessar o sistema até aceitar convite
- Um [[Usuário]] removido (soft delete):
    - não pode ser reativado diretamente
    - deve ser mantido apenas para histórico

---

### Associação com Projeto

- Um [[Usuário]] só pode acessar um [[Projeto]] se existir um [[UsuárioProjeto]] ativo
- Ao associar um [[Usuário]] a um [[Projeto]]:
    - deve ser criado um [[UsuárioProjeto]]
    - deve possuir ao menos um [[Papel]]
- A associação entre [[Usuário]] e [[Projeto]] não pode ser duplicada (ativa)

---

### Papéis

- [[Usuário]] não possui [[Papel]] diretamente
- Papéis são atribuídos exclusivamente via [[UsuárioProjeto]]
- Um [[Usuário]] pode ter diferentes [[Papel]] em diferentes [[Projeto]]

---

### Financeiro

- O Valor/Hora deve ser maior que zero quando definido
- Caso não definido:
    - pode herdar valor padrão do [[Departamento]] ou [[Projeto]]

---

## 🔐 Regras de Segurança

- Senhas devem ser armazenadas com hash seguro
- MFA obrigatório para usuários com papéis administrativos
- Bloqueio automático após X tentativas de login
- Sessões devem expirar após período de inatividade
- Toda ação crítica deve ser auditada, incluindo:
    - login
    - alteração de status
    - associação a projeto
    - atribuição de papel

---

## 🧪 BDD

### Autenticação com sucesso

- Dado que o [[Usuário]] está ativo
- E possui credenciais válidas
- Quando tentar autenticar
- Então o sistema deve permitir acesso
- E registrar o último acesso

---

### Bloqueio por tentativas

- Dado que o [[Usuário]] excedeu o número de tentativas de login
- Quando atingir o limite configurado
- Então o sistema deve bloquear o acesso
- E exigir redefinição de senha

---

### Associação a projeto

- Dado que o [[Usuário]] está ativo
- Quando for associado a um [[Projeto]]
- Então deve ser criado um [[UsuárioProjeto]]
- E deve possuir ao menos um [[Papel]]

---

### Remoção inválida

- Dado que o [[Usuário]] é o único com papel de gestão no [[Projeto]]
- Quando tentar ser removido
- Então o sistema deve impedir a operação

---

### Acesso ao projeto

- Dado um [[Usuário]]
- Quando tentar acessar um [[Projeto]]
- Então o sistema deve validar a existência de um [[UsuárioProjeto]] ativo

---

## 🧬 SDD (System Design Decisions)

- O [[Usuário]] é sempre contextualizado por [[Tenant]]  
- O [[Usuário]] não possui papéis diretamente  
- Papéis são atribuídos exclusivamente através de [[UsuárioProjeto]]  
- A relação entre [[Usuário]] e [[Projeto]] é mediada por [[UsuárioProjeto]]  
- O modelo de autorização segue RBAC (Role-Based Access Control)  
- Permissões são derivadas dos [[Papel]] associados ao vínculo

---

## 🔄 Estados do Usuário

- convidado → criado via convite, sem acesso
- ativo → acesso normal ao sistema
- inativo → acesso bloqueado, mas pode ser reativado
- bloqueado → bloqueio por segurança
- removido → soft delete (apenas histórico)