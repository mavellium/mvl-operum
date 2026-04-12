> Sistema SaaS (Software as a Service) de gerenciamento de projetos multi-tenant, com foco em produtividade, rastreabilidade e escalabilidade. Permite que múltiplas empresas ([[Tenant]]) usem a mesma plataforma isoladamente, mantendo dados, usuários, projetos e permissões segregados.

---

## 🖥️ Arquitetura

### Tipo

- Arquitetura **[[multi-tenant]]** com isolamento lógico
- Padrão **[[Backend-for-Frontend (BFF)]]** + [[SPA (Single Page Application)]]
- Segue **[[Domain-Driven Design (DDD)]]**, separando domínios como [[Usuário]], [[Projeto]], [[Sprint]], etc.
- Utiliza **[[RBAC (Role-Based Access Control)]]** para controle de acesso

### Camadas

1. **Frontend**
    - SPA em **[[Next.js]]** ([[React]])
    - Comunicação via **[[REST API]] / [[GraphQL]]**
    - Gerenciamento de estado com **[[Redux]]** ou **[[Zustand]]**
    - Autenticação contextualizada por **subdomínio do tenant**
2. **Backend**
    - **[[Node.js]]** com **[[NestJS]]**
    - Serviços separados por **[[domínio]]** (Usuário, Projeto, Financeiro, Notificações, Auditoria)
    - Implementa **serviços e repositórios** seguindo [[Domain-Driven Design (DDD)]]
    - **[[Middleware]] de autenticação e autorização** baseado em [[JWT]] + [[MFA]]
3. **Banco de Dados**
    - **[[PostgreSQL]]** como principal banco relacional
    - Utiliza **[[UUID]]** como [[PK]] para todas entidades
    - Isolamento [[multi-tenant]] via coluna `tenant_id` em todas tabelas de dados
    - [[Migrations]] via **[[Prisma]]** ou **[[TypeORM]]**
    - Auditoria e histórico mantidos em tabelas próprias
4. **Cache / Mensageria**
    - **[[Redis]]** para cache de sessões e contadores temporários
    - **[[RabbitMQ]] / [[Kafka]]** para filas de notificações, emails e eventos assíncronos
5. **[[Infraestrutura]] / [[DevOps]]**
    - Deploy em **[[Docker]] / [[Kubernetes]]**
    - [[CI/CD]] via **[[GitHub Actions]]** ou **[[GitLab CI]]**
    - Logs centralizados via **[[ELK Stack]]** ([[Elasticsearch]], [[Logstash]], [Kibana])
    - Monitoramento com **[[Prometheus]] + [[Grafana]]**
    - Backups automáticos do [[PostgreSQL]] e arquivos em **[[S3]]**

---

## ⚙️ Stack Tecnológico

|Camada|Tecnologia|Observações|
|---|---|---|
|Frontend|Next.js / React|SPA, SSR opcional, SEO-friendly|
|Backend|Node.js + NestJS|DDD, modular, testes unitários|
|ORM|Prisma ou TypeORM|Migrations, relações multi-tenant|
|Banco de Dados|PostgreSQL|Multi-tenant lógico, UUID PKs|
|Cache|Redis|Sessões, locks, filas leves|
|Mensageria|RabbitMQ / Kafka|Eventos assíncronos, notificações|
|Storage|AWS S3|Attachments, arquivos de usuário|
|CI/CD|GitHub Actions|Testes automáticos e deploy|
|Monitoramento|Prometheus + Grafana|Métricas e alertas|
|Logs|ELK Stack|Auditoria e rastreabilidade|

---

## 📏 Regras de Negócio do Sistema

### Multi-Tenant

- Cada [[Tenant]] é isolado, com dados, usuários e configurações separadas
- Subdomínio único por [[Tenant]] para identificar contexto de login
- Não há compartilhamento de dados entre tenants

### Autenticação

- Login via [[Login]] com email e senha
- [[MFA]] habilitado para papéis administractives
- Tentativas de login registradas e bloqueio automático
- Reset de senha seguro via token expirável

### Autorização

- Usuários têm papéis ([[Papel]]) vinculados a [[Projeto]] via [[UsuárioProjetoPapel]]
- Permissões derivadas dos papéis
- Acesso controlado por [[RBAC]] e escopo de [[Tenant]]

### Auditoria

- Todas ações críticas são auditadas ([[Auditoria]])
- [[Imutável]], registrando estado antes/depois quando aplicável

### Notificações

- [[Notification]] para alertas de tarefas, sprints e feedback
- Sistema assíncrono via filas, garantindo entrega eventual

---

## 🧬 [[SDD (System Design Decisions)]]

- **DDD** para separar responsabilidades por domínios, facilitando manutenção e escalabilidade
- **[[Multi-tenant]] lógico** para permitir crescimento horizontal sem isolamento físico
- **[[SPA]] + [[BFF]]** para otimizar UX e performance, com autenticação contextualizada
- **Eventos assíncronos** para decoupling de notificações e processos longos
- **[[MFA]] e auditoria** como padrão de segurança em todo o sistema
- **Versionamento de API** para permitir evolução sem quebrar clientes

---

## 🔄 Estados Globais do Sistema

- Sistema active → operação normal, tenants e usuários actives
- Sistema inactive → manutenção, acesso bloqueado
- Tenant active / inactive / suspenso / removido → conforme política de lifecycle
- Usuário active / inactive / bloqueado / removido → conforme regras de acesso

---
## 🧪 Testes e Qualidade

### Testes Unitários

- Cada serviço, repositório e domínio possui cobertura de testes unitários
- Framework recomendado: **[[Jest]]** para backend e frontend

### Testes de Integração

- Valida integração entre módulos e bancos de dados
- Testa endpoints de API, relacionamentos multi-tenant e fluxos críticos
- Uso de **[[Supertest]]** ou **[[Playwright]]** para APIs e rotas

### Testes E2E (End-to-End)

- Simula fluxo completo do usuário no sistema, do login até execução de tarefas e relatórios
- Ferramentas recomendadas: **[[Cypress]]** ou **[[Playwright]]**
- Testa multi-tenant, RBAC, MFA, criação de projetos e permissões

### Testes de UI

- Cobertura de principais interações da interface
- Valida responsividade, acessibilidade e fluxo de navegação
- Ferramentas: **[[React Testing Library]]** + **[[Cypress]]**

### Testes de Performance

- Avalia tempo de resposta de endpoints críticos
- Simula múltiplos usuários actives (stress test)
- Ferramentas: **[[k6]]** ou **[[JMeter]]**

---

## 🔐 Segurança

### Autenticação e Autorização

- [[JWT]] + [[MFA]] para autenticação segura
- Controle de acesso via [[RBAC]]
- Tokens expiráveis, renováveis via refresh token

### Proteção de Dados

- Senhas com **hash bcrypt** e salting
- Dados sensíveis criptografados em repouso quando necessário
- Auditoria completa de ações críticas ([[Auditoria]])

### Segurança na API

- Proteção contra [[CSRF]], [[XSS]] e [[SQL Injection]]
- Rate limiting em endpoints críticos
- Validação de entrada rigorosa via [[Zod]] ou [[Joi]]

### Compliance e GDPR / LGPD

- Consentimento explícito de usuários
- Logs de acesso e rastreabilidade
- Soft delete de usuários e tenants mantendo histórico seguro

---

## 📈 Observabilidade e DevOps

### Logs

- Estruturados e centralizados via [[ELK Stack]]
- Log de auditoria separado de logs operacionais

### Métricas

- [[Prometheus]] + [[Grafana]] para métricas de performance e disponibilidade
- Métricas de uso de recursos, tempo de resposta, número de usuários actives

### Monitoramento e Alertas

- [[Alertas de downtime]], erros críticos e filas de mensagens
- Escalonamento automático via [[Kubernetes]] [[HPA (Horizontal Pod Autoscaler)]]

### CI/CD e Deploy

- Pipeline automatizado para build, testes e deploy
- Deploy canário e rollback rápido em caso de falha
- Versionamento de API para compatibilidade retroativa

---

## ⚡ Boas Práticas

- Versionamento semântico de API e código
- Branching Git baseado em [[GitFlow]] ou trunk-based
- Documentação de endpoints via **[[OpenAPI / Swagger]]**
- Testes automatizados integrados à pipeline [[CI/CD]]

---
![[Pasted image 20260405152045.png]]

|Componente / Entidade|Domínio|Camada|Relacionamentos / Dependências|Testes|Segurança|
|---|---|---|---|---|---|
|**Tenant**|Organização|Backend|1:N → Usuário, Projeto, Departamento, Papel|Unit, Integration|Isolamento de dados, soft delete, auditoria|
|**Usuário**|Gestão de usuários|Backend|0:N → Projeto (via UsuarioProjeto), 0:N → Departamento, 1 Tenant|Unit, Integration, E2E|JWT + MFA, RBAC, hash de senha, auditoria|
|**Departamento**|Organização interna|Backend|1:N → UsuárioDepartamento|Unit, Integration|Somente usuários do Tenant, validação de permissões|
|**Projeto**|Gestão de projetos|Backend|1:N → Sprint, N:N → Usuario (via UsuarioProjeto)|Unit, Integration, E2E|Somente usuários do Tenant, validação de RBAC|
|**UsuarioProjeto**|Vínculo usuário-projeto|Backend|N:1 → Usuário, N:1 → Projeto, 1:N → UsuarioProjetoPapel|Unit, Integration|Isolamento de tenant, validação de papéis|
|**Papel**|Controle de acesso|Backend|N:N → Permissao (via PapelPermissao), N:N → UsuarioProjeto (via UsuarioProjetoPapel)|Unit, Integration|RBAC, validação de escopo de Tenant|
|**Permissao**|Controle de ações|Backend|N:N → Papel (via PapelPermissao)|Unit, Integration|RBAC, validação de escopo de Tenant|
|**UsuarioProjetoPapel**|Associação papéis|Backend|N:1 → UsuarioProjeto, N:1 → Papel|Unit, Integration, E2E|Valida duplicidade, RBAC|
|**Sprint**|Planejamento ágil|Backend|1:N → SprintColumn, 1:N → DashboardMetric, 1:N → SprintFeedback|Unit, Integration, E2E|Isolamento tenant, auditoria|
|**SprintColumn**|Kanban / Status|Backend|1:N → Card|Unit, Integration|Apenas usuários do projeto|
|**Card**|Tarefas|Backend|1:N → CardComment, N:N → Tag (via CardTag), 1:N → Attachment, 1:N → TimeEntry|Unit, Integration, E2E|RBAC, validação de tenant, auditoria|
|**CardComment**|Comentários|Backend|N:1 → Card, N:1 → Usuario|Unit, Integration|Controle de acesso por tenant/projeto|
|**Tag**|Classificação de cards|Backend|N:N → Card (via CardTag)|Unit|Controle de tenant|
|**CardTag**|Associação Tag-Card|Backend|N:1 → Card, N:1 → Tag|Unit|Controle de tenant|
|**Attachment**|Arquivos|Backend|N:1 → Card|Unit, Integration|Validação de tipo/size, controle tenant|
|**TimeEntry**|Registro de horas|Backend|N:1 → Card, N:1 → Usuario|Unit, Integration, E2E|Validação de tenant, auditoria|
|**DashboardMetric**|Métricas|Backend|N:1 → Sprint, N:1 → Usuario|Unit, Integration|Somente leitura restrita a tenant/projeto|
|**SprintFeedback**|Feedback|Backend|N:1 → Sprint, N:1 → Usuario|Unit, Integration|Controle de tenant|
|**Notification**|Alertas / Notificações|Backend|N:1 → Usuario|Unit, Integration|Somente destinatário do tenant, filas assíncronas|
|**Auditoria**|Histórico / Logs|Backend|N:1 → Tenant, N:1 → Usuario|Unit, Integration|Imutável, rastreabilidade completa|

---

## 🔍 Observações Gerais

1. **Camadas Frontend**
    - Next.js / React SPA + SSR opcional
    - Redux / Zustand para estado global
    - Integração com API via REST/GraphQL
2. **Camadas Backend**
    - Node.js + NestJS modular
    - Domain-Driven Design (DDD)
    - Middlewares de autenticação, autorização, logging
3. **Banco de Dados**
    - PostgreSQL multi-tenant lógico (`tenant_id`)
    - UUIDs universais como PK
    - Migrations via Prisma ou TypeORM
4. **Mensageria / Cache**
    - Redis para cache de sessões
    - RabbitMQ/Kafka para eventos assíncronos, notificações e jobs
5. **Segurança**
    - MFA obrigatória para papéis administractives
    - Hash de senha bcrypt
    - Proteções contra CSRF, XSS e SQL Injection
    - Auditoria completa de todas ações críticas
6. **DevOps / Infra**
    - Docker + Kubernetes para deploy
    - CI/CD via GitHub Actions ou GitLab CI
    - Logs centralizados via ELK Stack
    - Métricas com Prometheus + Grafana
    - Backups automáticos e versionamento de API
7. **Testes**
    - Unitários, integração, E2E, UI e performance
    - Ferramentas: Jest, React Testing Library, Cypress/Playwright, k6/JMeter
      
      
      

### Telas:

- [[Login]]
  [[Tela Projeto]]
- [[Tela Painel Administractive]
- [[Sistema de Alertas e Feedbacks]]