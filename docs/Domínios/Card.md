> Representa uma tarefa ou item de trabalho dentro de uma [[SprintColumn]] no Kanban. Cada [[Card]] possui informações de descrição, prioridade, cores, datas e relacionamento com [[Usuário]] que o criou ou está responsável.

---

## 🧱 Campos

- Título
- Descrição
- Cor (para organização visual)
- Prioridade (ex: baixa, média, alta, crítica)
- Data de início
- Data de término (estimada ou real)
- Posição na [[SprintColumn]] (sprintPosition)
- Código base36 (para referência rápida ou link externo)
- Criador ([[Usuário]])
- [[SprintColumn]] (coluna onde está alocado)
- [[Sprint]] (herdado da coluna)
- Data de criação

---

## 🔗 Relacionamentos

- Um [[Card]] pertence a exatamente uma [[SprintColumn]] (N:1)
- Um [[Card]] possui muitos [[CardComment]] (1:N)
- Um [[Card]] pode ter muitas [[Tag]] via [[CardTag]] (N:N)
- Um [[Card]] pode ter muitos [[Attachment]] (1:N)
- Um [[Card]] pode ter muitos [[TimeEntry]] (1:N)
- Um [[Card]] pertence a um [[Sprint]] (N:1)

---

## ⚙️ Métodos

- criarCard()
- atualizarCard()
- moverCard([[SprintColumn]], novaPosição)
- alterarPrioridade(novaPrioridade)
- adicionarTag([[Tag]])
- removerTag([[Tag]])
- adicionarComentario([[CardComment]])
- removerComentario([[CardComment]])
- adicionarAttachment([[Attachment]])
- removerAttachment([[Attachment]])
- iniciarTimeEntry([[TimeEntry]])
- encerrarTimeEntry([[TimeEntry]])
- calcularHorasTotais()

---

## 📏 Regras de Negócio

### Estrutura

- Cada [[Card]] deve pertencer a exatamente uma [[SprintColumn]]
- O título é obrigatório e deve ser único dentro da coluna
- Cards podem ser reordenados dentro de uma [[SprintColumn]] para refletir prioridade

---

### Consistência

- Um [[Card]] não pode ser movido para uma coluna que ultrapasse o limite de altura (maxHeight)
- Cards só podem ter tags que pertencem ao [[Tenant]] do [[Sprint]]
- A movimentação entre colunas deve respeitar permissões do [[Usuário]]

---

### Operações de Tempo

- Um [[Card]] pode ter múltiplos [[TimeEntry]] para controlar esforço
- O [[TimeEntry]] é iniciado e finalizado pelo [[Usuário]] autorizado
- O sistema deve calcular a duração total de trabalho automaticamente

---

## 🔐 Regras de Segurança

- Apenas [[Usuário]] associados ao [[Projeto]] ou [[Sprint]] podem criar, editar ou mover [[Card]]
- Toda alteração deve ser registrada em [[Auditoria]]
- Cards bloqueados ou de sprints concluídos não podem ser alterados

---

## 🧪 BDD

### Criação de Card

- Dado um [[Usuário]] autorizado na [[Sprint]]
- Quando criar um [[Card]]
- Então ele deve ser associado à [[SprintColumn]] correta
- E o sistema deve gerar código base36

---

### Movimentação de Card

- Dado um [[Card]] em uma [[SprintColumn]]
- Quando mover para outra [[SprintColumn]]
- Então atualizar sprintPosition e coluna
- E registrar a ação em [[Auditoria]]

---

### Adição de Tag

- Dado um [[Card]] e uma [[Tag]] válida
- Quando associar a tag
- Então a associação [[CardTag]] deve ser criada
- E duplicatas não são permitidas

---

### Registro de tempo

- Dado um [[Card]] com [[TimeEntry]] ativo
- Quando encerrar o time entry
- Então calcular a duração e atualizar métricas do [[DashboardMetric]]

---

## 🧬 SDD (System Design Decisions)

- [[Card]] é a unidade principal de trabalho no sistema Kanban
- Todas as interações de tempo, comentários, tags e anexos estão associadas a [[Card]]
- O código base36 fornece referência rápida sem expor UUID completo
- Regras de movimentação e limites de coluna garantem fluxo controlado

---

## 🔄 Estados do Card

- backlog → aguardando início
- em andamento → tarefas em progresso
- bloqueado → impedido de avançar por dependência ou regra
- concluído → finalizado
- arquivado → removido visualmente do sprint, mantendo histórico