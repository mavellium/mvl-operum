> Representa uma etiqueta utilizada para categorizar [[Card]]s, permitindo filtros, agrupamentos e sinalização visual de status, prioridade ou tipo de tarefa.

---

## 🧱 Campos

- Nome (string) – texto da tag
- Cor (hex ou nome) – cor associada à tag
- [[Usuário]] criador da tag
- Data de criação (createdAt)
- Data de atualização (opcional, updatedAt)

---

## 🔗 Relacionamentos

- Uma [[Tag]] pode estar associada a nenhum ou muitos [[Card]]s (N:N via [[CardTag]])
- Uma [[Tag]] pertence a exatamente um [[Usuário]] (autor/gerador)

---

## ⚙️ Métodos

- criarTag(nome, cor, [[Usuário]])
- atualizarTag(nome, cor)
- removerTag()
- listarTags([[Usuário]] ou [[Projeto]])
- associarACard([[Card]])
- removerDeCard([[Card]])

---

## 📏 Regras de Negócio

### Estrutura

- Nome da tag é obrigatório
- Nome deve ser único por [[Usuário]] dentro do mesmo [[Tenant]]
- Cor da tag é opcional, mas se definida, deve ser válida (hexadecimal ou nome reconhecido)

---

### Consistência

- Uma [[Tag]] só pode ser associada a [[Card]]s do mesmo [[Tenant]]
- Não é permitido duplicar a mesma tag em um [[Card]]
- Tags podem ser criadas apenas por [[Usuário]] active

---

### Operações

- Ao associar uma [[Tag]] a um [[Card]], deve ser registrado vínculo em [[CardTag]]
- Remoção de tag de um [[Card]] não apaga a tag globalmente, apenas desvincula do [[Card]]

---

## 🔐 Regras de Segurança

- Apenas [[Usuário]] actives podem criar, editar ou remover tags
- Associar ou remover tags de [[Card]] deve respeitar permissões do [[Projeto]]
- Todas as alterações devem ser auditadas

---

## 🧪 BDD

### Criação de tag

- Dado um [[Usuário]] active
- Quando criar uma [[Tag]]
- Então a tag deve ser registrada com nome e cor
- E vinculada ao [[Usuário]] criador

---

### Associação a card

- Dado uma [[Tag]] e um [[Card]]
- Quando associar a tag ao card
- Então criar [[CardTag]]
- E registrar histórico de auditoria

---

### Remoção de tag de card

- Dado uma [[Tag]] associada a [[Card]]
- Quando remover do card
- Então excluir o vínculo [[CardTag]]
- E manter a tag disponível globalmente

---

## 🧬 SDD (System Design Decisions)

- [[Tag]] é um recurso de categorização flexível, não altera dados críticos
- Associação com [[Card]] é mediada por [[CardTag]] para manter integridade N:N
- Histórico de criação e vinculação é mantido para rastreabilidade e auditoria

---

## 🔄 Estados da Tag

- ativa → tag disponível e utilizável
- inativa → tag não pode ser associada a novos cards, mas permanece nos existentes
- removida → soft delete, não visível no fluxo normal