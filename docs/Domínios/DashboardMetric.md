> Representa métricas consolidadas de desempenho e produtividade de [[Usuário]] e [[Sprint]]. É utilizado para dashboards de acompanhamento, rankings e relatórios financeiros.

---

## 🧱 Campos

- [[Sprint]] associado (sprintId, UUID)
- [[Usuário]] associado (usuarioId, UUID)
- Total de horas registradas (horas, decimal)
- Número de tarefas pendentes (tarefasPendentes, int)
- Custo total calculado (custoTotal, decimal)
- Posição no ranking do sprint (rankingPosicao, int)
- Data de criação/atualização (createdAt, datetime)

---

## 🔗 Relacionamentos

- Um [[DashboardMetric]] pertence a exatamente um [[Sprint]]
- Um [[DashboardMetric]] pertence a exatamente um [[Usuário]]
- Um [[Sprint]] pode ter múltiplos [[DashboardMetric]]s (um por usuário)
- Um [[Usuário]] pode ter múltiplos [[DashboardMetric]]s (um por sprint)

---

## ⚙️ Métodos

- calcularHoras([[Sprint]], [[Usuário]])
- atualizarTarefasPendentes([[Sprint]], [[Usuário]])
- calcularCustoTotal([[Sprint]], [[Usuário]])
- gerarRanking([[Sprint]])
- listarMetricasPorUsuario([[Usuário]])
- listarMetricasPorSprint([[Sprint]])

---

## 📏 Regras de Negócio

### Consistência

- [[DashboardMetric]] deve refletir todos os [[TimeEntry]]s vinculados ao [[Sprint]] e [[Usuário]]
- O ranking deve ser recalculado sempre que novas entradas de tempo forem registradas
- Custo total = Σ(TimeEntry.duration * Usuario.valorHora)

### Operações

- Métricas são atualizadas periodicamente ou após eventos relevantes (ex: finalização de [[TimeEntry]], alteração de [[Card]])
- Posição no ranking é calculada com base em produtividade, tarefas concluídas e custo
- Métricas podem ser agregadas por [[Sprint]] ou por [[Usuário]] para relatórios globais

---

## 🔐 Regras de Segurança

- Apenas usuários com acesso ao [[Sprint]] ou administradores podem visualizar métricas
- Atualizações automáticas devem respeitar o contexto do [[Tenant]]
- Alterações críticas (ajustes manuais) devem ser auditadas em [[Auditoria]]

---

## 🧪 BDD

### Atualização de métricas

- Dado um [[TimeEntry]] finalizado
- Quando recalcular [[DashboardMetric]]
- Então atualizar horas, custo e tarefas pendentes
- E recalcular ranking do [[Sprint]]

### Visualização de métricas

- Dado um [[Usuário]] autorizado
- Quando acessar dashboard de [[Sprint]]
- Então exibir métricas consolidadas de horas, tarefas e ranking

---

## 🧬 SDD (System Design Decisions)

- [[DashboardMetric]] consolida informações de [[TimeEntry]] e [[Sprint]] para fácil visualização
- Permite dashboards de produtividade, financeiras e relatórios históricos
- Deve suportar agregações rápidas para muitos usuários e sprints simultaneamente
- Ranking é recalculado em tempo real ou em batch, dependendo da escala

---

## 🔄 Estados

- active → métricas atuais e válidas
- atualizado → recalculado recentemente
- obsoleto → necessita recalcular devido a mudanças em [[TimeEntry]] ou [[Card]]