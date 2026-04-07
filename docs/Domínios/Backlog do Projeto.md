
## **Epic 1: Gestão de Tenants e Usuários (Admin)**

**Objetivo:** Administrador cria tenants e projetos, define gerentes e visualiza relatórios globais.

1. **User Story:** Como administrador, quero cadastrar tenants (empresas, cursos, ONGs).
    - CRUD de `Tenant`.
    - Configurações iniciais por tenant.
2. **User Story:** Como administrador, quero cadastrar projetos e atribuir gerentes.
    - CRUD de `Projeto`.
    - Associar `Usuario` como gerente do projeto.
3. **User Story:** Como administrador, quero gerar relatórios globais de todos os projetos e sprints.
    - Gerar PDF/CSV.
    - Filtros: tenant, projeto, sprint, usuário, departamento.
4. **User Story:** Como administrador, quero ver dashboards globais de todos os projetos e sprints.
    - Dashboard agregando métricas de todos os projetos que administro.

---

## **Epic 2: Gestão de Projetos e Sprints (Gerente)**

**Objetivo:** Gerente cadastra usuários, equipes e define o fluxo de trabalho da sprint.

1. **User Story:** Como gerente, quero cadastrar usuários e montar equipes no meu projeto.
    - CRUD de `UsuarioProjeto`.
    - Associar usuários a departamentos (`UsuarioDepartamento`).
    - Atribuir papéis (`UsuarioProjetoPapel`).
2. **User Story:** Como gerente, quero criar sprints, colunas Kanban e cards.
    - CRUD de `Sprint`.
    - CRUD de `SprintColumn` (com limite de altura para scroll).
    - CRUD de `Card` (com código Base36 e vínculo com criador).
3. **User Story:** Como gerente, quero mover cards entre colunas e sprints.
4. **User Story:** Como gerente, quero ver dashboards e métricas do projeto e das sprints.

---

## **Epic 3: Interação com Cards (Todos usuários do projeto)**

**Objetivo:** Colaboradores interagem com tarefas, adicionando informações e tempo.

1. **User Story:** Como usuário, quero comentar em cards (`CardComment`).
2. **User Story:** Como usuário, quero adicionar tags aos cards (`Tag` + `CardTag`).
3. **User Story:** Como usuário, quero anexar arquivos aos cards (`Attachment`).
4. **User Story:** Como usuário, quero registrar tempo de trabalho (`TimeEntry`).
5. **User Story:** Como usuário, quero mover cards entre colunas (com permissão) e marcar progresso.

---

## **Epic 4: Feedback e Avaliações (Todos usuários do projeto)**

**Objetivo:** Coletar informações de desempenho e dificuldades ao final de cada sprint.

1. **User Story:** Como usuário, quero registrar tarefas realizadas, dificuldades e avaliação da sprint (`SprintFeedback`).
2. **User Story:** Como gerente, quero calcular média de qualidade e dificuldade da sprint.

---

## **Epic 5: Notificações e Integrações (Todos usuários do projeto)**

**Objetivo:** Informar usuários sobre eventos importantes e integrar com email.

1. **User Story:** Como usuário, quero receber notificações (`Notification`) sobre novas tarefas, mudanças de status, feedback e final de sprint.
2. **User Story:** Como usuário, quero receber notificações por email (SMTP/API).

---

## **Epic 6: Dashboards e Relatórios**

**Objetivo:** Visualizar métricas de produtividade e gerar relatórios de performance.

1. **User Story:** Como usuário, quero ver o dashboard da sprint e do projeto do qual participo (`DashboardMetric`).
2. **User Story:** Como administrador, quero ver dashboard agregado de todos os projetos que gerencio.
3. **User Story:** Como administrador, quero gerar relatórios de todos os projetos e sprints.
4. **User Story:** Como gerente, quero gerar relatórios do meu projeto ou de uma sprint específica.