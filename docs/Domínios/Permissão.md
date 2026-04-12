> Representa uma permissão específica que pode ser atribuída a um [[Papel]] dentro de um [[Tenant]] ou [[Projeto]], definindo ações que um [[Usuário]] pode executar no sistema.

---

## 🧱 Campos

- Nome
- Descrição
- Data de Criação
- Ativo (boolean)

---

## 🔗 Relacionamentos

- Uma [[Permissão]] pode ser atribuída a múltiplos [[Papel]] via [[PapelPermissão]]
- Um [[Papel]] pode ter muitas [[Permissão]] (1:N)

---

## ⚙️ Métodos

- criarPermissão(nome, descrição)
- atualizarPermissão(nome, descrição)
- ativar()
- desativar()
- remover()
- listarPapéis()
- verificarAcesso([[Usuário]])

---

## 📏 Regras de Negócio

### Estrutura

- Cada [[Permissão]] representa uma ação no sistema, como:
  - criar [[Projeto]]
  - editar [[Usuário]]
  - gerar relatório
- Permissões devem ser únicas dentro do [[Tenant]] para evitar conflitos
- Uma [[Permissão]] sem [[Papel]] vinculado não confere acesso a nenhum [[Usuário]]

---

### Consistência

- Não é permitido remover uma [[Permissão]] enquanto houver [[Papel]]s actives vinculados
- Ao desativar uma [[Permissão]], todos os [[Papel]]s vinculados perdem temporariamente o direito
- Alterações devem ser auditadas

---

### Segurança

- Apenas [[Usuário]]s administradores podem criar, alterar ou remover [[Permissão]]s
- Atribuição de [[Permissão]] a [[Papel]] define o acesso efetivo do [[Usuário]]
- [[Permissão]]s críticas devem exigir dupla validação

---

## 🧪 BDD

### Criação de permissão

- Dado um [[Tenant]] existente
- Quando criar uma [[Permissão]] com nome e descrição
- Então ela deve ser registrada no sistema
- E ficar disponível para vinculação a [[Papel]]s

---

### Atribuição a papel

- Dado um [[Papel]] active
- Quando vincular uma [[Permissão]]
- Então todos os [[Usuário]]s com esse [[Papel]] passam a ter a [[Permissão]]

---

### Desativação

- Dado uma [[Permissão]] ativa
- Quando desativá-la
- Então os [[Papel]]s vinculados perdem o direito temporariamente
- E a alteração é registrada

---

### Remoção inválida

- Dado uma [[Permissão]] vinculada a [[Papel]]s actives
- Quando tentar removê-la
- Então o sistema deve impedir a operação
- E informar os vínculos existentes

---

## 🧬 SDD (System Design Decisions)

- [[Permissão]]s são granulares e controlam ações específicas
- [[Usuário]]s nunca recebem [[Permissão]]s diretamente, apenas via [[Papel]]
- O modelo segue RBAC (Role-Based Access Control)
- Alterações em [[Permissão]]s afetam imediatamente todos os [[Papel]]s e [[Usuário]]s vinculados

---

## 🔄 Estados

- active → [[Permissão]] disponível
- inactive → [[Permissão]] temporariamente desabilitada
- removido → soft delete, histórico mantido