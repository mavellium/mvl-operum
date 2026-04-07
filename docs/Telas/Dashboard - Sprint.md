> Dashboard detalhada para uma **sprint específica**, com métricas para análise de produtividade, custo e performance da equipe.

---

## 🖥️ Campos / Widgets

### Métricas Gerais

- **Total de Cards:** quantidade total de cards da sprint
- **Cards Concluídos:** quantidade e percentual concluído
- **Horas Acumuladas:** soma de [[TimeEntry]] de todos os usuários
- **Custo Total:** cálculo de horas x valor/hora do usuário
- **Cards Atrasados:** cards com `endDate` passada e não na coluna "Concluído"
- **Tarefas que mais gastam tempo:** ranking de cards por horas acumuladas

### Métricas por Usuário

- **Horas Registradas:** total de horas lançadas por cada usuário
- **Custo Individual:** horas x valor/hora
- **Cards Atribuídos:** quantidade de cards ativos e concluídos
- **Ranking de Usuários:** baseado em produtividade, tarefas concluídas e eficiência
- **Média de Qualidade e Dificuldade:** extraído de [[SprintFeedback]]

### Gráficos (via Recharts ou similar)

- **Custo por Tarefa:** gráfico de barras ou área
- **Horas por Usuário:** gráfico de barras ou linha
- **Cards por Status:** pizza ou barras empilhadas
- **Tendência de conclusão de cards:** linha temporal por dia

### Alerts / Destaques

- Cards com **atraso crítico** (endDate + prioridade alta)
- Cards bloqueados ou sem movimentação nos últimos X dias
- Usuários com menos progresso relativo ao planejado

---

## ⚙️ Funcionalidades

- Filtrar por usuário, prioridade, coluna ou tag
- Ordenar cards por horas acumuladas, custo ou status
- Drill-down em cada card para comentários, attachments e histórico
- Exportar relatório completo (Excel/PDF)
- Atualização em tempo real via websocket ou polling

---

## 🔐 Regras de Segurança

- Apenas usuários com acesso à sprint podem visualizar
- Administradores podem visualizar todos os dados da sprint
- Dados restritos ao [[Tenant]] correspondente

---

## 🧩 Fluxos

1. Carregar sprint selecionada e todas as colunas/cards
2. Agregar métricas gerais, por usuário e por card
3. Gerar gráficos de custo, horas e progresso
4. Destacar alertas de atraso e bloqueios
5. Permitir exportação e interação com cards

---

## 🧠 Regras Implícitas

- Métricas calculadas apenas com [[UsuarioProjeto]] ativo
- Somente cards ativos ou concluídos contam para métricas
- Histórico de alterações auditado em [[Auditoria]]

---