> Representa a associação entre um [[Usuário]] e um [[Projeto]], definindo em quais projetos o [[Usuário]] está ativo e qual seu papel dentro desse contexto.

---

## 🧱 Campos

- UsuárioId (referência ao [[Usuário]])
- ProjetoId (referência ao [[Projeto]])
- Data de Entrada
- Data de Saída (opcional)
- Status (ativo | inativo | removido)
- Observações (opcional)
- Criado em

---

## 🔗 Relacionamentos

- Um [[UsuárioProjeto]] vincula exatamente um [[Usuário]] a um [[Projeto]]
- Um [[Usuário]] pode ter múltiplos [[UsuárioProjeto]] (1:N)
- Um [[Projeto]] pode ter múltiplos [[UsuárioProjeto]] (1:N)
- [[UsuárioProjetoPapel]] é vinculado a [[UsuárioProjeto]] para definir papéis específicos

---

## ⚙️ Métodos

- associarAoProjeto([[Usuário]], [[Projeto]])
- removerDoProjeto([[Usuário]], [[Projeto]])
- ativar()
- inativar()
- registrarSaida()
- listarProjetosDoUsuário([[Usuário]])
- listarUsuáriosDoProjeto([[Projeto]])
- atribuirPapel([[Papel]])
- removerPapel([[Papel]])
- validarDuplicidade()

---

## 📏 Regras de Negócio

### Estrutura

- Cada [[UsuárioProjeto]] representa um vínculo único entre [[Usuário]] e [[Projeto]]
- Um [[Usuário]] não pode possuir mais de um vínculo ativo com o mesmo [[Projeto]]
- O vínculo deve registrar a data de entrada automaticamente

---

### Papéis

- Papéis são atribuídos exclusivamente via [[UsuárioProjetoPapel]]
- Um [[UsuárioProjeto]] deve possuir ao menos um [[Papel]] ativo para que o [[Usuário]] tenha acesso ao [[Projeto]]
- Ao remover o último [[Papel]] de um [[UsuárioProjeto]], o acesso é automaticamente bloqueado

---

### Consistência

- Não é permitido duplicar [[UsuárioProjeto]] ativo para o mesmo [[Usuário]] e [[Projeto]]
- Alterações no status do vínculo devem refletir imediatamente no acesso do [[Usuário]]
- A saída de um [[Usuário]] deve ser registrada com timestamp

---

### Segurança

- Apenas [[Usuário]]s com papel administrativo no [[Projeto]] podem modificar vínculos
- Todas as alterações devem ser auditadas
- Um [[Usuário]] inativo ou removido não pode ser associado a projetos ativos

---

## 🧪 BDD

### Associação

- Dado um [[Usuário]] ativo
- Quando for associado a um [[Projeto]]
- Então um [[UsuárioProjeto]] é criado
- E deve possuir ao menos um [[Papel]]

---

### Remoção de vínculo

- Dado um [[UsuárioProjeto]] existente
- Quando for removido
- Então o vínculo é marcado como removido
- E a saída é registrada com data/hora

---

### Validação de duplicidade

- Dado um [[Usuário]] e um [[Projeto]] com vínculo existente ativo
- Quando tentar criar novo vínculo
- Então o sistema deve impedir a operação
- E informar que o vínculo já existe

---

## 🧬 SDD (System Design Decisions)

- [[UsuárioProjeto]] é a entidade mediadora entre [[Usuário]] e [[Projeto]]
- Permite controle granular de acesso e associação de papéis
- Todas as regras de autorização dependem do status do [[UsuárioProjeto]]
- Implementa RBAC contextualizado por projeto

---

## 🔄 Estados

- ativo → vínculo válido e acesso permitido
- inativo → vínculo suspenso, sem acesso
- removido → soft delete, histórico mantido