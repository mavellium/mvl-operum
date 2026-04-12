> Representa a associação entre um [[Papel]] e uma [[Permissão]], definindo quais ações os [[Usuário]]s de determinado [[Papel]] podem executar dentro do [[Tenant]] ou [[Projeto]].

---

## 🧱 Campos

- PapelId (referência ao [[Papel]])
- PermissãoId (referência à [[Permissão]])
- Data de Criação
- Ativo (boolean)

---

## 🔗 Relacionamentos

- Um [[PapelPermissão]] vincula exatamente um [[Papel]] a uma [[Permissão]]
- Um [[Papel]] pode possuir múltiplos [[PapelPermissão]] (1:N)
- Uma [[Permissão]] pode ser atribuída a múltiplos [[Papel]] via [[PapelPermissão]] (1:N)

---

## ⚙️ Métodos

- vincularPermissão([[Papel]], [[Permissão]])
- desvincularPermissão([[Papel]], [[Permissão]])
- ativar()
- desativar()
- listarPermissões([[Papel]])
- listarPapéis([[Permissão]])
- verificarAcesso([[Usuário]])

---

## 📏 Regras de Negócio

### Estrutura

- Um [[Papel]] sem [[PapelPermissão]] não concede acesso a nenhuma [[Permissão]]
- Uma [[Permissão]] só é efetiva para [[Usuário]]s se estiver vinculada a um [[Papel]]
- Não é permitido duplicar a associação [[PapelPermissão]] para o mesmo [[Papel]] e [[Permissão]]

---

### Consistência

- Ao remover um [[PapelPermissão]]:
  - os [[Usuário]]s vinculados ao [[Papel]] perdem imediatamente a [[Permissão]]
- Alterações devem ser auditadas
- Desativação não remove o vínculo, apenas suspende temporariamente o direito

---

### Segurança

- Apenas [[Usuário]]s com papel administractive podem criar ou remover [[PapelPermissão]]
- Todas as alterações em [[PapelPermissão]] devem ser registradas em [[Auditoria]]
- Mudanças críticas exigem dupla validação

---

## 🧪 BDD

### Vinculação

- Dado um [[Papel]] active
- Quando vincular uma [[Permissão]]
- Então todos os [[Usuário]]s com esse [[Papel]] passam a ter a [[Permissão]]

---

### Desvinculação

- Dado um [[PapelPermissão]] existente
- Quando desvincular
- Então os [[Usuário]]s perdem a [[Permissão]] associada
- E a alteração é registrada

---

### Prevenção de duplicidade

- Dado um [[Papel]] e uma [[Permissão]] já vinculados
- Quando tentar criar o mesmo vínculo novamente
- Então o sistema deve impedir a operação
- E informar que a associação já existe

---

## 🧬 SDD (System Design Decisions)

- [[PapelPermissão]] permite granularidade fina no controle de acesso
- [[Usuário]]s nunca recebem [[Permissão]]s diretamente, somente via [[Papel]]
- Alterações em [[PapelPermissão]] afetam imediatamente o acesso de todos os [[Usuário]]s vinculados
- Permite implementação de RBAC eficiente e auditável

---

## 🔄 Estados

- active → vínculo válido e efetivo
- inactive → vínculo suspenso temporariamente
- removido → soft delete, histórico mantido