# Projeto

> Representa uma iniciativa ou esforço dentro de um [[Tenant]], agrupando [[Usuário]], [[Departamento]], [[Sprint]] e recursos associados para gerenciamento de tarefas e metas.

---

## 🧱 Campos

- Nome
- Descrição
- Status (ativo | inativo | concluído | arquivado)
- CursoId (opcional, se for contexto acadêmico)
- TurmaId (opcional, se for contexto acadêmico)
- Data de Criação
- TenantId (associação obrigatória)

---

## 🔗 Relacionamentos

- Um [[Projeto]] pertence a exatamente um [[Tenant]]
- Um [[Projeto]] pode possuir nenhum ou muitos [[Usuário]] via [[UsuárioProjeto]]
- Um [[Projeto]] possui muitas [[Sprint]] (1:N)
- Um [[Projeto]] pode estar associado a múltiplos [[Departamento]] via usuários
- Um [[Projeto]] pode ter papéis específicos atribuídos a [[Usuário]] via [[UsuárioProjetoPapel]]

---

## ⚙️ Métodos

- criarProjeto()
- atualizarProjeto()
- ativar()
- inativar()
- arquivar()
- associarUsuario([[Usuário]])
- removerUsuario([[Usuário]])
- atribuirPapel([[Usuário]], [[Papel]])
- removerPapel([[Usuário]], [[Papel]])
- listarUsuarios()
- criarSprint()
- listarSprints()

---

## 📏 Regras de Negócio

### Estrutura

- Um [[Projeto]] é o container de trabalho dentro de um [[Tenant]]
- Todo [[Projeto]] deve pertencer a um [[Tenant]]
- Status define visibilidade e operação:
    - ativo → operação normal
    - inativo → não aceita novas alterações
    - concluído → trabalho finalizado, apenas leitura
    - arquivado → histórico, somente leitura

---

### Associação de Usuários

- Um [[Usuário]] só pode acessar o [[Projeto]] se existir um [[UsuárioProjeto]] ativo
- Um [[Usuário]] pode possuir múltiplos [[Papel]] dentro do mesmo [[Projeto]]
- Associação duplicada de [[Usuário]] ao mesmo [[Projeto]] não é permitida

---

### Consistência

- Nome do [[Projeto]] deve ser único dentro de um [[Tenant]]
- Um [[Projeto]] não pode ser removido fisicamente, apenas arquivado (soft delete)
- Alterações críticas (mudança de status, exclusão de usuários, atribuição de papéis) devem ser auditadas

---

### Financeiro

- Projetos podem herdar valor/hora padrão de [[Departamento]] ou [[Tenant]]
- Custos associados a [[TimeEntry]] ou [[DashboardMetric]] devem ser agregados ao projeto

---

### Papéis e Permissões

- Papéis são atribuídos via [[UsuárioProjetoPapel]]
- Permissões derivam dos [[Papel]] associados
- Um [[Projeto]] deve possuir pelo menos um [[Usuário]] com papel de gestão (Administrador)

---

## 🔐 Regras de Segurança

- Usuários só podem acessar dados se houver vínculo ativo via [[UsuárioProjeto]]
- Operações críticas exigem auditoria
- Apenas administradores do [[Tenant]] ou do [[Projeto]] podem modificar usuários e papéis
- Projetos inativos ou arquivados não podem ter alterações de dados

---

## 🧪 BDD

### Criação de projeto

- Dado um [[Usuário]] com permissão administrativa
- Quando criar um [[Projeto]]
- Então o sistema deve registrar o projeto associado ao [[Tenant]]
- E gerar registros de auditoria

---

### Associação de usuário

- Dado um [[Usuário]] existente
- Quando for associado ao [[Projeto]]
- Então deve ser criado um vínculo válido via [[UsuárioProjeto]]
- E devem ser atribuídos papéis iniciais conforme regra do projeto

---

### Alteração de status

- Dado um [[Projeto]] ativo
- Quando alterar para inativo ou arquivado
- Então o sistema deve impedir alterações futuras de dados
- E notificar usuários do projeto sobre a mudança de status

---

### Acesso e Papéis

- Dado um [[Usuário]] associado
- Quando tentar acessar o [[Projeto]]
- Então o sistema valida vínculo e papéis
- Usuário sem vínculo ativo ou removido não consegue acessar

---

## 🧬 SDD (System Design Decisions)

- [[Projeto]] é um container lógico dentro do [[Tenant]]
- Controle de acesso é mediado por [[UsuárioProjeto]] e [[UsuárioProjetoPapel]]
- Histórico do projeto e alterações devem ser preservadas (soft delete)
- O sistema deve suportar múltiplos [[Projeto]] simultaneamente, isolados por [[Tenant]]

---

## 🔄 Estados

- ativo
- inativo
- concluído
- arquivado