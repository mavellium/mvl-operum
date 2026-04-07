> Representa uma coluna dentro de um [[Sprint]] Kanban, utilizada para organizar [[Card]] em diferentes estágios do fluxo de trabalho (ex: backlog, em andamento, concluído).

---

## 🧱 Campos

- Título
- Posição (posição na tela/ordem do fluxo)
- Altura máxima (opcional, para controle visual)
- [[Sprint]] (associação ao sprint que pertence)
- Data de criação

---

## 🔗 Relacionamentos

- Uma [[SprintColumn]] pertence a exatamente um [[Sprint]] (N:1)
- Uma [[SprintColumn]] possui muitos [[Card]] (1:N)

---

## ⚙️ Métodos

- criarColuna()
- atualizarColuna()
- removerColuna()
- moverCard([[Card]], novaPosicao)
- reordenarColunas()
- validarLimiteAltura()

---

## 📏 Regras de Negócio

### Estrutura

- Cada [[Sprint]] deve ter pelo menos uma [[SprintColumn]]
- Colunas definem o fluxo de trabalho e podem ter regras de limite de capacidade (maxHeight)
- O título da coluna deve ser único dentro de um [[Sprint]]

---

### Consistência

- Cards só podem pertencer a uma [[SprintColumn]] por vez
- Colunas de [[Sprint]] concluído não podem ser alteradas
- A posição da coluna determina a ordem de visualização no Kanban

---

### Operações de Card

- Ao mover um [[Card]] entre colunas, deve-se atualizar seu sprintPosition
- Cards não podem ultrapassar a capacidade definida (maxHeight)
- Alterações em [[Card]] dentro da coluna devem respeitar permissões do [[Usuário]]

---

## 🔐 Regras de Segurança

- Apenas [[Usuário]] associados ao [[Sprint]] ou [[Projeto]] podem criar, mover ou remover [[Card]] em uma [[SprintColumn]]
- Todas as alterações de colunas devem ser auditadas no [[Auditoria]]

---

## 🧪 BDD

### Criação de coluna

- Dado que um [[Usuário]] possui permissão no [[Sprint]]
- Quando criar uma [[SprintColumn]]
- Então o sistema deve validar título único e associar ao [[Sprint]]

---

### Movimentação de Card

- Dado um [[Card]] dentro de uma [[SprintColumn]]
- Quando mover o [[Card]] para outra coluna
- Então a posição e coluna do [[Card]] devem ser atualizadas
- E o sistema deve validar limite de capacidade

---

### Remoção de coluna

- Dado uma [[SprintColumn]] sem [[Card]] ou com movimentação concluída
- Quando remover a coluna
- Então o sistema deve apagar a coluna
- E registrar a ação no [[Auditoria]]

---

## 🧬 SDD (System Design Decisions)

- [[SprintColumn]] funciona como container de [[Card]] em um fluxo Kanban
- A posição da coluna determina a ordem visual e de processo
- O limite de altura (maxHeight) serve para controle de sobrecarga de tarefas
- Permissões e auditoria são essenciais para manter integridade do sprint

---

## 🔄 Estados da Coluna

- ativa → disponível para manipulação de [[Card]]
- bloqueada → não permite movimentação de [[Card]] (ex: sprint concluído)
- removida → soft delete, mantida para histórico e auditoria