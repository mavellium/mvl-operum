> Representa um período de trabalho dentro de um [[Projeto]] para organizar tarefas, entregas e medir desempenho. Utilizado para planejamento ágil e controle de progresso.

---

## 🧱 Campos

- Nome
- Descrição
- Status (ativo | planejado | concluído | cancelado)
- Data de início
- Data de término
- Criado por ([[Usuário]])
- Avaliação média de qualidade (decimal)
- Avaliação média de dificuldade (decimal)
- Data de criação

---

## 🔗 Relacionamentos

- Um [[Sprint]] pertence a exatamente um [[Projeto]] (N:1)
- Um [[Sprint]] possui muitas [[SprintColumn]] (1:N)
- Um [[Sprint]] possui muitas [[DashboardMetric]] (1:N)
- Um [[Sprint]] possui muitos [[SprintFeedback]] (1:N)

---

## ⚙️ Métodos

- criarSprint()
- atualizarSprint()
- iniciarSprint()
- concluirSprint()
- cancelarSprint()
- adicionarColuna([[SprintColumn]])
- removerColuna([[SprintColumn]])
- calcularAvaliacaoMedia()
- gerarRelatorioDesempenho()

---

## 📏 Regras de Negócio

### Estrutura

- Um [[Sprint]] deve estar vinculado a um [[Projeto]] ativo
- Datas de início e fim devem respeitar a sequência lógica (startDate < endDate)
- Avaliações médias são calculadas com base nos [[Card]] finalizados

---

### Consistência

- Um [[Sprint]] concluído não pode ter suas colunas ou cards alterados
- Apenas [[Usuário]] com permissão de gerenciamento no projeto podem criar ou editar [[Sprint]]
- O status só pode ser alterado seguindo o fluxo: planejado → ativo → concluído ou cancelado

---

### Colunas (Kanban)

- Cada [[Sprint]] deve ter ao menos uma [[SprintColumn]]
- Colunas definem o fluxo de trabalho (ex: backlog, em andamento, concluído)
- Posicionamento das colunas é controlado por um índice de ordem (position)

---

## 🔐 Regras de Segurança

- Apenas [[Usuário]] associados ao [[Projeto]] podem interagir com o [[Sprint]]
- Todas as alterações críticas devem ser auditadas no [[Auditoria]]
- A criação ou finalização de [[Sprint]] deve registrar o usuário que realizou a ação

---

## 🧪 BDD

### Criação de sprint

- Dado que um [[Usuário]] possui permissão no [[Projeto]]
- Quando criar um [[Sprint]]
- Então o sistema deve validar datas e criar o registro

---

### Início de sprint

- Dado um [[Sprint]] planejado
- Quando o [[Usuário]] iniciar o sprint
- Então o status deve ser alterado para ativo
- E colunas e cards ficam disponíveis para manipulação

---

### Conclusão de sprint

- Dado um [[Sprint]] ativo
- Quando o [[Usuário]] concluir o sprint
- Então o status deve ser atualizado para concluído
- E métricas finais devem ser calculadas automaticamente

---

## 🧬 SDD (System Design Decisions)

- [[Sprint]] é sempre vinculado a um [[Projeto]] para manter o contexto
- Avaliações médias e métricas são calculadas com base nos [[Card]] e [[TimeEntry]]
- O status do sprint controla permissões de edição de colunas e cards
- Suporte a Kanban através de [[SprintColumn]] para flexibilidade operacional

---

## 🔄 Estados do Sprint