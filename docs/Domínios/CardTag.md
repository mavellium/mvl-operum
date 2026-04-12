> Representa a associação entre [[Card]] e [[Tag]], permitindo categorizar e organizar tarefas dentro do sistema. Funciona como uma tabela de vínculo (N:N).

---

## 🧱 Campos

- [[Card]] associado (cardId, UUID)
- [[Tag]] associada (tagId, UUID)
- Data de criação do vínculo (createdAt)

---

## 🔗 Relacionamentos

- Um [[CardTag]] pertence a exatamente um [[Card]]
- Um [[CardTag]] pertence a exatamente uma [[Tag]]
- Um [[Card]] pode ter muitos [[CardTag]]s
- Uma [[Tag]] pode estar associada a muitos [[CardTag]]s

---

## ⚙️ Métodos

- associarTagACard([[Tag]], [[Card]])
- removerTagDeCard([[Tag]], [[Card]])
- listarTagsPorCard([[Card]])
- listarCardsPorTag([[Tag]])

---

## 📏 Regras de Negócio

### Consistência

- Não é permitido duplicar a mesma [[Tag]] em um [[Card]]
- [[Card]] e [[Tag]] devem pertencer ao mesmo [[Tenant]]
- Apenas [[Usuário]] actives e com permissão de edição no [[Card]] podem associar ou remover [[Tag]]

---

### Operações

- Associar uma tag cria um registro em [[CardTag]]
- Remover uma tag do card apenas remove o vínculo, não exclui a tag globalmente
- Alterações devem ser auditadas para rastreabilidade

---

## 🔐 Regras de Segurança

- Apenas [[Usuário]] com acesso de edição ao [[Card]] podem alterar suas tags
- Associar/remover tags deve respeitar regras de RBAC do [[Projeto]]
- Toda ação crítica deve gerar entrada em [[Auditoria]]

---

## 🧪 BDD

### Associação de tag a card

- Dado um [[Card]] e uma [[Tag]]
- Quando associar a tag ao card
- Então criar [[CardTag]]
- E registrar histórico de auditoria

---

### Remoção de tag de card

- Dado uma [[Tag]] associada a [[Card]]
- Quando remover a associação
- Então deletar o registro [[CardTag]]
- E manter a tag disponível globalmente

---

## 🧬 SDD (System Design Decisions)

- [[CardTag]] é uma entidade de vínculo N:N entre [[Card]] e [[Tag]]
- Mantém integridade referencial e rastreabilidade
- Facilita filtros e agrupamentos de tarefas por categorias visuais

---

## 🔄 Estados

- active → vínculo active entre [[Card]] e [[Tag]]
- removido → soft delete, vínculo removido mas histórico mantido