> Dashboard detalhada para **um projeto específico**, agregando dados de todas as sprints, cards e membros.

---

## 🖥️ Campos / Widgets

### Métricas Gerais do Projeto

- **Total de Sprints:** número de sprints no projeto
- **Sprints Concluídas / Ativas / Atrasadas:** contagem e percentual
- **Total de Cards:** somatório de todas as sprints
- **Cards Concluídos / Pendentes / Atrasados:** quantidade e percentual
- **Horas Acumuladas:** soma de [[TimeEntry]] de todos os usuários do projeto
- **Custo Total:** horas x valor/hora de cada usuário
- **Cards que gastam mais tempo:** ranking por horas acumuladas

---

### Métricas por Usuário

- **Horas Registradas:** total de horas lançadas por cada membro
- **Custo Individual:** horas x valor/hora
- **Cards Atribuídos:** ativos, concluídos, atrasados
- **Eficiência:** percentual de cards concluídos dentro do prazo
- **Ranking de Usuários:** baseado em produtividade e eficiência
- **Média de Qualidade e Dificuldade:** via [[SprintFeedback]]

---

### Métricas por Sprint

- **Cards por Sprint:** total, concluídos, pendentes
- **Horas e Custo por Sprint**
- **Progresso Médio por Sprint:** percentual de conclusão
- **Sprints Críticas:** atrasadas ou com baixa produtividade

---

### Gráficos

- **Progresso por Sprint:** barras ou linhas mostrando conclusão x prazo
- **Custo por Sprint / Card:** gráfico de área ou barra
- **Horas por Usuário:** gráfico de barras horizontais
- **Cards por Status:** pizza ou barras empilhadas (A Fazer, Em Progresso, Concluído)
- **Tarefas mais demoradas:** gráfico de barras por card
- **Ranking de Usuários:** gráfico de barras ou radar
- **Custo Acumulado vs Orçamento:** linha temporal
- **Cards Atrasados por Sprint:** barras ou heatmap
- **Distribuição de Prioridades:** gráfico de pizza ou donut (alta, média, baixa)
- **Cards por Tag / Tipo / Responsável:** gráfico de barras ou treemap
- **Tendência de conclusão diária:** linha temporal mostrando cards concluídos ao longo do tempo

---

### Alertas / Destaques

- **Cards Atrasados Críticos** (alta prioridade e endDate passada)
- **Sprints Atrasadas** (percentual de conclusão abaixo do planejado)
- **Membros com baixo desempenho** (menos cards concluídos que a média)
- **Riscos financeiros** (custo excedendo orçamento por sprint ou projeto)

---

### ⚙️ Funcionalidades

- Drill-down em sprints, cards ou usuários clicando nos gráficos
- Filtros avançados: status do card, sprint, usuário, tag, prioridade
- Exportação de relatórios em PDF / Excel / CSV
- Atualização em tempo real via websockets ou polling
- Alertas visuais em gráficos para métricas críticas

---

### 🔐 Regras de Segurança

- Apenas usuários com acesso ao projeto podem visualizar
- Administradores podem ver métricas agregadas e detalhadas
- Dados restritos ao [[Tenant]] correspondente

---

### 🧩 Fluxos

1. Carregar todas as sprints e cards do projeto
2. Agregar métricas gerais, por sprint e por usuário
3. Calcular ranking, custo, eficiência e alertas
4. Gerar gráficos interativos e visuais de tendências
5. Permitir drill-down em cards, usuários ou sprints

---

### 🧠 Regras Implícitas

- Métricas e gráficos calculados apenas com [[UsuarioProjeto]] ativo
- Cards removidos ou não atribuídos não entram em contagem de produtividade
- Histórico de alterações auditado em [[Auditoria]]
- Dashboard deve suportar grandes volumes de dados sem travar