> Representa um papel ou função dentro de um [[Tenant]] ou [[Projeto]], que define um conjunto de permissões que podem ser atribuídas a usuários.

---

## 🧱 Campos

- Nome
- Descrição
- Tenant (referência a [[Tenant]])
- Data de Criação
- Ativo (boolean)

---

## 🔗 Relacionamentos

- Um [[Papel]] pertence a exatamente um [[Tenant]]
- Um [[Papel]] pode ter múltiplas [[Permissão]] via [[PapelPermissão]]
- Um [[Papel]] pode estar associado a múltiplos [[UsuárioProjeto]] via [[UsuárioProjetoPapel]]

---

## ⚙️ Métodos

- criarPapel([[Tenant]], nome, descrição)
- atualizarPapel(nome, descrição)
- ativar()
- desativar()
- remover()
- atribuirPermissao([[Permissão]])
- removerPermissao([[Permissão]])
- listarPermissoes()
- listarUsuarios()

---

## 📏 Regras de Negócio

### Estrutura

- Um [[Papel]] define um conjunto de permissões para usuários dentro do [[Tenant]]
- Papéis podem ser genéricos (Admin, Colaborador, Visualizador) ou customizados
- Cada papel deve ter nome único dentro do [[Tenant]]

---

### Consistência

- Um [[Papel]] não pode ser removido se houver [[UsuárioProjetoPapel]] ativos associados
- Ao desativar um [[Papel]], todos os vínculos [[UsuárioProjetoPapel]] permanecem, mas não conferem permissões até reativação
- Alterações devem gerar registro de auditoria

---

### Segurança

- Apenas administradores podem criar, alterar ou remover papéis
- Papéis determinam o acesso efetivo dentro de projetos e sistemas
- Toda alteração deve ser auditada

---

## 🧪 BDD

### Criação de papel

- Dado um [[Tenant]] existente
- Quando criar um [[Papel]] com nome e descrição
- Então o papel é registrado no sistema
- E vinculado ao [[Tenant]]

---

### Atribuição de permissão

- Dado um [[Papel]] ativo
- Quando atribuir uma [[Permissão]]
- Então o papel passa a conceder a permissão a todos os usuários vinculados

---

### Desativação

- Dado um [[Papel]] ativo
- Quando desativá-lo
- Então os usuários não recebem mais as permissões
- E o vínculo permanece histórico

---

### Remoção inválida

- Dado um [[Papel]] com vínculos [[UsuárioProjetoPapel]]
- Quando tentar removê-lo
- Então o sistema deve impedir a operação
- E informar os vínculos ativos

---

## 🧬 SDD (System Design Decisions)

- Papéis são a forma primária de atribuição de permissões no modelo RBAC  
- Usuários nunca recebem permissões diretamente  
- A associação [[UsuárioProjetoPapel]] conecta usuários, projetos e papéis  
- Permissões podem ser adicionadas ou removidas de papéis sem alterar usuários diretamente

---

## 🔄 Estados

- ativo → papel disponível para atribuição
- inativo → papel desativado temporariamente
- removido → soft delete, histórico mantido