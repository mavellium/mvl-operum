
> Visão global para **administradores**, permitindo monitoramento estratégico de todos os projetos.

---

## 🖥️ Campos / Widgets

### Projetos Ativos

- Lista paginada ou filtrável de projetos actives
- Indicadores por projeto:
    - Percentual de conclusão
    - Número de sprints ativas
    - Tarefas pendentes / concluídas
    - Horas acumuladas e custo total
- **Clique no projeto:** abre **Dashboard do Projeto**

### Projetos Concluídos

- Lista paginada ou filtrável de projetos entregues
- Indicadores resumidos:
    - Data de entrega
    - Percentual de conclusão final
    - Horas e custo total
- **Clique no projeto:** visão histórica e métricas finais

### Alertas e Destaques

- Projetos com sprints atrasadas
- Projetos críticos (alto custo ou atrasos significactives)
- Usuários ou equipes com baixa performance

### Gráficos / KPIs

- Total de projetos actives vs concluídos
- Média de conclusão por sprint / projeto
- Custo acumulado por projeto
- Ranking de equipes ou usuários por produtividade

---

## ⚙️ Funcionalidades

- Paginação ou collapsible cards para não sobrecarregar a tela
- Filtro por tenant, status do projeto ou responsável
- Exportação de relatórios estratégicos
- Drill-down para dashboards individuais de projeto ou sprint

---

## 🔐 Regras de Segurança

- Apenas administradores globais podem acessar
- Visualização respeita multi-tenant (se houver mais de uma empresa)
- Acesso somente leitura para projetos concluídos

---

## 🧩 Fluxos

1. Carregar projetos actives e concluídos (paginados ou com lazy-load)
2. Calcular métricas globais e por projeto
3. Gerar gráficos e alertas estratégicos
4. Permitir drill-down em dashboards detalhadas de projeto e sprint

---

## 🧠 Regras Implícitas

- Dashboard deve suportar alto volume de dados sem travar
- Métricas históricas imutáveis para projetos concluídos
- Todos eventos críticos auditados no [[Auditoria]]