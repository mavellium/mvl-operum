
> Representa a atribuição de um [[Papel]] específico a um [[Usuário]] dentro de um [[Projeto]], via [[UsuárioProjeto]].

---

## 🧱 Campos

- UsuarioProjetoId (referência ao [[UsuárioProjeto]])
- PapelId (referência ao [[Papel]])
- Data de Atribuição
- Data de Revogação (opcional)
- Status (ativo | inativo | revogado)
- Observações (opcional)
- Criado em

---

## 🔗 Relacionamentos

- Um [[UsuárioProjetoPapel]] pertence a exatamente um [[UsuárioProjeto]]
- Um [[Papel]] pode estar associado a múltiplos [[UsuárioProjetoPapel]] (1:N)
- Um [[UsuárioProjeto]] pode ter múltiplos [[UsuárioProjetoPapel]] (1:N)

---

## ⚙️ Métodos

- atribuirPapel([[Papel]])
- removerPapel([[Papel]])
- ativar()
- inativar()
- revogar()
- listarPapeisDoUsuario([[UsuárioProjeto]])
- validarDuplicidade()

---

## 📏 Regras de Negócio

### Estrutura

- Cada [[UsuárioProjetoPapel]] define um papel específico de acesso do [[Usuário]] dentro de um [[Projeto]]
- Um [[UsuárioProjeto]] deve possuir ao menos um [[Papel]] ativo para acesso ao [[Projeto]]
- Data de atribuição deve ser registrada automaticamente

---

### Consistência

- Não é permitido duplicar atribuição do mesmo [[Papel]] para o mesmo [[UsuárioProjeto]] ativo
- Ao revogar o último [[Papel]] ativo de um [[UsuárioProjeto]], o acesso ao [[Projeto]] é automaticamente bloqueado
- Status deve refletir imediatamente nas permissões do [[Usuário]]

---

### Segurança

- Apenas [[Usuário]]s com papel administrativo no [[Projeto]] podem modificar papéis
- Todas as alterações devem ser auditadas
- Papéis críticos (ex: Administrador de Projeto) exigem MFA ao serem atribuídos

---

## 🧪 BDD

### Atribuição de papel

- Dado um [[UsuárioProjeto]] ativo
- Quando um [[Papel]] é atribuído
- Então o [[UsuárioProjetoPapel]] é criado
- E o acesso do [[Usuário]] é atualizado de acordo com o [[Papel]]

---

### Remoção de papel

- Dado um [[UsuárioProjetoPapel]] existente
- Quando for removido
- Então o vínculo é marcado como revogado
- E as permissões do [[Usuário]] são ajustadas

---

### Validação de duplicidade

- Dado um [[UsuárioProjeto]] e um [[Papel]] já atribuído
- Quando tentar atribuir novamente
- Então o sistema deve impedir a operação
- E informar que o papel já está ativo

---

## 🧬 SDD (System Design Decisions)

- [[UsuárioProjetoPapel]] é a entidade mediadora entre [[UsuárioProjeto]] e [[Papel]]
- Permite controle granular de papéis dentro de projetos
- Todas as decisões de autorização dependem do status do [[UsuárioProjetoPapel]]
- Implementa RBAC contextualizado por projeto

---

## 🔄 Estados

- ativo → papel válido e acesso permitido
- inativo → papel suspenso, sem efeito sobre permissões
- revogado → soft delete, histórico mantido