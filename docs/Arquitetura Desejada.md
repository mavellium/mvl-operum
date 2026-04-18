# MVL Operum -- Arquitetura Desejada

> Sistema SaaS (Software as a Service) de gerenciamento de projetos multi-tenant, com foco em produtividade, rastreabilidade e escalabilidade. Permite que multiplas empresas (Tenant) usem a mesma plataforma isoladamente, mantendo dados, usuarios, projetos e permissoes segregados.
>
> **Hospedagem:** VPS Hostinger (sem Kubernetes, sem cloud gerenciada).
> **Estrategia:** Decomposicao progressiva do monolito Next.js via Strangler Fig Pattern.

---

## Indice

1. [Arquitetura Alvo](#1-arquitetura-alvo)
2. [Stack Tecnologico](#2-stack-tecnologico)
3. [Topologia e Orquestracao (Docker Compose + Traefik)](#3-topologia-e-orquestracao)
4. [Comunicacao Inter-Servico](#4-comunicacao-inter-servico)
5. [Autenticacao e Autorizacao](#5-autenticacao-e-autorizacao)
6. [Storage (MinIO)](#6-storage-minio)
7. [Observabilidade](#7-observabilidade)
8. [CI/CD (GitHub Actions + SSH Deploy)](#8-cicd)
9. [Estrategia de 2 Ambientes (Staging + Producao)](#9-estrategia-de-2-ambientes)
10. [Roadmap de Decomposicao (Strangler Fig Pattern)](#10-roadmap-de-decomposicao)
11. [Regras de Negocio](#11-regras-de-negocio)
12. [Seguranca](#12-seguranca)
13. [Testes e Qualidade](#13-testes-e-qualidade)
14. [Registro de Riscos](#14-registro-de-riscos)
15. [Mapa de Dominio e Modelos](#15-mapa-de-dominio-e-modelos)

---

## 1. Arquitetura Alvo

### 1.1 Tipo

- Arquitetura **multi-tenant** com isolamento logico (coluna `tenant_id`)
- Padrao **Backend-for-Frontend (BFF)** com API Gateway centralizado
- **Domain-Driven Design (DDD)** -- dominios separados em microservicos
- **RBAC (Role-Based Access Control)** para controle de acesso
- **Hospedagem em VPS unica** com Docker Compose e Traefik

### 1.2 Camadas

1. **Frontend**
   - Next.js 16 (React 19) operando como **frontend puro** (SPA + SSR)
   - Sem server actions -- comunicacao exclusiva via REST API (`fetch`)
   - API client tipado centralizado em `lib/api-client.ts`
   - Autenticacao via cookie `httpOnly` traduzido para header `Authorization: Bearer`

2. **API Gateway**
   - Traefik 3.x como reverse proxy e TLS termination (Let's Encrypt)
   - Express.js fino para: validacao JWT, rate limiting, injecao de headers de contexto
   - Roteia para servicos downstream por prefixo de rota

3. **Backend (Microservicos NestJS)**
   - 5 servicos independentes, cada um com schema Prisma proprio
   - Auth Service, Project Service, Sprint Service, Notification Service, File Service
   - Comunicacao sincrona (HTTP REST) + assincrona (BullMQ)

4. **Banco de Dados**
   - PostgreSQL 17 (Docker) -- banco compartilhado com schemas logicos por servico
   - Prisma 7 como ORM (migrations por servico)
   - Isolamento multi-tenant via `tenant_id`

5. **Cache e Mensageria**
   - Redis 7 para: sessoes ativas, cache de queries, broker BullMQ
   - BullMQ para filas assincronas (notificacoes, emails, audit events)

6. **Storage**
   - MinIO (S3-compatible) substituindo Vercel Blob
   - Presigned URLs para downloads, upload direto via File Service

7. **Observabilidade**
   - Prometheus + Loki + Grafana (stack leve, ~512MB RAM total)

---

## 2. Stack Tecnologico

| Camada | Tecnologia | Observacoes |
|--------|------------|-------------|
| Frontend | Next.js 16 / React 19 | Frontend puro, SSR opcional, sem server actions |
| API Gateway | Traefik 3.x + Express.js | Routing, TLS, rate limit, JWT middleware |
| Backend | Node.js 22 + NestJS 11 | DDD, modular, TypeScript strict |
| ORM | Prisma 7 | Schema por servico, migrations independentes |
| Banco de Dados | PostgreSQL 17 | Multi-tenant logico, CUID PKs |
| Cache | Redis 7 | Sessoes, locks, cache de queries |
| Mensageria | BullMQ (Redis-backed) | Notificacoes, emails, audit events |
| Storage | MinIO | Attachments, avatars, logos (S3-compatible) |
| CI/CD | GitHub Actions | Build, test, SSH deploy para VPS |
| Observabilidade | Prometheus + Loki + Grafana | Metricas, logs centralizados, dashboards |
| Containerizacao | Docker Compose | Orquestracao de ~14 containers na VPS |
| Reverse Proxy | Traefik 3.x | Auto-discovery Docker, Let's Encrypt, CORS |

---

## 3. Topologia e Orquestracao

### 3.1 Diagrama de Topologia

```
Internet
    |
    v
[Traefik] :443 (TLS via Let's Encrypt)
    |
    +-- app.mvloperum.com         --> frontend     (Next.js,  :3000)
    +-- api.mvloperum.com         --> api-gateway   (Express,  :4000)
    |       |
    |       +-- /auth/*           --> auth-service         (NestJS, :4001)
    |       +-- /projects/*       --> project-service       (NestJS, :4002)
    |       +-- /sprints/*        --> sprint-service        (NestJS, :4003)
    |       +-- /notifications/*  --> notification-service  (NestJS, :4004)
    |       +-- /files/*          --> file-service          (NestJS, :4005)
    |
    +-- files.mvloperum.com       --> MinIO         (:9000, acesso publico controlado)
    +-- grafana.mvloperum.com     --> Grafana       (:3000, apenas prod)

Rede interna Docker (sem acesso externo):
    [PostgreSQL :5432] [Redis :6379] [MinIO :9000] [Prometheus :9090] [Loki :3100]
```

### 3.2 Docker Compose Base

```yaml
# docker-compose.yml
services:

  # --- Reverse Proxy ---
  traefik:
    image: traefik:v3.2
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik/traefik.yml:/etc/traefik/traefik.yml:ro
      - ./traefik/dynamic:/etc/traefik/dynamic:ro
      - traefik-certs:/myresolver
    networks:
      - proxy

  # --- Frontend ---
  frontend:
    build:
      context: ./services/frontend
      dockerfile: Dockerfile
    restart: always
    environment:
      - NEXT_PUBLIC_API_URL=${API_URL}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`${FRONTEND_HOST}`)"
      - "traefik.http.routers.frontend.entrypoints=websecure"
      - "traefik.http.routers.frontend.tls.certresolver=myresolver"
      - "traefik.http.services.frontend.loadbalancer.server.port=3000"
    networks:
      - proxy
      - internal

  # --- API Gateway ---
  api-gateway:
    build:
      context: ./services/api-gateway
      dockerfile: Dockerfile
    restart: always
    environment:
      - JWT_PUBLIC_KEY=${JWT_PUBLIC_KEY}
      - AUTH_SERVICE_URL=http://auth-service:4001
      - PROJECT_SERVICE_URL=http://project-service:4002
      - SPRINT_SERVICE_URL=http://sprint-service:4003
      - NOTIFICATION_SERVICE_URL=http://notification-service:4004
      - FILE_SERVICE_URL=http://file-service:4005
      - REDIS_URL=redis://redis:6379
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`${API_HOST}`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls.certresolver=myresolver"
      - "traefik.http.services.api.loadbalancer.server.port=4000"
      - "traefik.http.routers.api.middlewares=api-ratelimit@file,api-cors@file"
    networks:
      - proxy
      - internal
    depends_on:
      - redis
      - auth-service

  # --- Auth Service ---
  auth-service:
    build:
      context: ./services/auth-service
      dockerfile: Dockerfile
    restart: always
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - JWT_PRIVATE_KEY=${JWT_PRIVATE_KEY}
      - JWT_PUBLIC_KEY=${JWT_PUBLIC_KEY}
      - REDIS_URL=redis://redis:6379
      - PORT=4001
    networks:
      - internal
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  # --- Project Service ---
  project-service:
    build:
      context: ./services/project-service
      dockerfile: Dockerfile
    restart: always
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
      - PORT=4002
    networks:
      - internal
    depends_on:
      postgres:
        condition: service_healthy

  # --- Sprint Service ---
  sprint-service:
    build:
      context: ./services/sprint-service
      dockerfile: Dockerfile
    restart: always
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
      - PORT=4003
    networks:
      - internal
    depends_on:
      postgres:
        condition: service_healthy

  # --- Notification Service ---
  notification-service:
    build:
      context: ./services/notification-service
      dockerfile: Dockerfile
    restart: always
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
      - PORT=4004
    networks:
      - internal
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  # --- File Service ---
  file-service:
    build:
      context: ./services/file-service
      dockerfile: Dockerfile
    restart: always
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - MINIO_ENDPOINT=minio
      - MINIO_PORT=9000
      - MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
      - MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
      - MINIO_BUCKET=${MINIO_BUCKET}
      - MINIO_PUBLIC_URL=${MINIO_PUBLIC_URL}
      - PORT=4005
    networks:
      - internal
    depends_on:
      postgres:
        condition: service_healthy
      minio:
        condition: service_healthy

  # --- PostgreSQL ---
  postgres:
    image: postgres:17-alpine
    restart: always
    volumes:
      - pg-data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - internal

  # --- Redis ---
  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - internal

  # --- MinIO ---
  minio:
    image: minio/minio:latest
    restart: always
    command: server /data --console-address ":9001"
    volumes:
      - minio-data:/data
    environment:
      - MINIO_ROOT_USER=${MINIO_ACCESS_KEY}
      - MINIO_ROOT_PASSWORD=${MINIO_SECRET_KEY}
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - internal
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.minio-api.rule=Host(`${MINIO_HOST}`)"
      - "traefik.http.routers.minio-api.entrypoints=websecure"
      - "traefik.http.routers.minio-api.tls.certresolver=myresolver"
      - "traefik.http.services.minio-api.loadbalancer.server.port=9000"

  # --- Prometheus ---
  prometheus:
    image: prom/prometheus:v2.53.0
    restart: always
    volumes:
      - ./observability/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.retention.time=15d"
      - "--storage.tsdb.retention.size=2GB"
    networks:
      - internal

  # --- Loki ---
  loki:
    image: grafana/loki:3.0.0
    restart: always
    volumes:
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - internal

  # --- Grafana ---
  grafana:
    image: grafana/grafana:11.0.0
    restart: always
    volumes:
      - grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.grafana.rule=Host(`grafana.${BASE_DOMAIN}`)"
      - "traefik.http.routers.grafana.entrypoints=websecure"
      - "traefik.http.routers.grafana.tls.certresolver=myresolver"
      - "traefik.http.services.grafana.loadbalancer.server.port=3000"
    networks:
      - proxy
      - internal

volumes:
  pg-data:
  redis-data:
  minio-data:
  traefik-certs:
  prometheus-data:
  loki-data:
  grafana-data:

networks:
  proxy:
    name: ${COMPOSE_PROJECT_NAME}_proxy
  internal:
    name: ${COMPOSE_PROJECT_NAME}_internal
```

### 3.3 Configuracao Estatica do Traefik

```yaml
# traefik/traefik.yml
api:
  dashboard: true
  insecure: false

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

providers:
  docker:
    exposedByDefault: false
    network: proxy
  file:
    directory: /etc/traefik/dynamic
    watch: true

certificatesResolvers:
  myresolver:
    acme:
      email: tegbe.projetoia@gmail.com
      storage: /myresolver/acme.json
      httpChallenge:
        entryPoint: web

log:
  level: INFO

accessLog:
  filePath: /var/log/traefik/access.log
  bufferingSize: 100
```

### 3.4 Middlewares Dinamicos do Traefik

```yaml
# traefik/dynamic/middlewares.yml
http:
  middlewares:
    api-ratelimit:
      rateLimit:
        average: 100
        burst: 50
        period: 1s
    api-cors:
      headers:
        accessControlAllowMethods:
          - GET
          - POST
          - PUT
          - PATCH
          - DELETE
          - OPTIONS
        accessControlAllowHeaders:
          - Content-Type
          - Authorization
          - X-Tenant-ID
        accessControlAllowOriginList:
          - "https://app.mvloperum.com"
          - "https://staging.mvloperum.com"
        accessControlMaxAge: 3600
```

### 3.5 Estrutura do Repositorio (Alvo)

```
mvl-operum/
|-- docker-compose.yml              # Base (compartilhado entre ambientes)
|-- docker-compose.staging.yml      # Overrides staging
|-- docker-compose.production.yml   # Overrides producao
|-- .github/
|   `-- workflows/
|       |-- deploy-staging.yml
|       `-- deploy-production.yml
|-- traefik/
|   |-- traefik.yml
|   `-- dynamic/
|       `-- middlewares.yml
|-- observability/
|   `-- prometheus.yml
|-- services/
|   |-- frontend/                   # Next.js (frontend puro)
|   |   |-- Dockerfile
|   |   |-- package.json
|   |   |-- app/                    # Pages, components (sem server actions)
|   |   `-- lib/
|   |       `-- api-client.ts       # Fetch wrapper tipado para o backend
|   |-- api-gateway/                # Express.js (proxy + auth middleware)
|   |   |-- Dockerfile
|   |   `-- src/
|   |       |-- main.ts
|   |       |-- proxy.ts
|   |       |-- auth-middleware.ts
|   |       `-- rate-limit.ts
|   |-- auth-service/               # NestJS
|   |   |-- Dockerfile
|   |   |-- prisma/schema.prisma    # Tenant, User
|   |   `-- src/
|   |       |-- auth/
|   |       |-- tenant/
|   |       `-- main.ts
|   |-- project-service/            # NestJS
|   |   |-- Dockerfile
|   |   |-- prisma/schema.prisma    # Project, UserProject, Department, Role, etc.
|   |   `-- src/
|   |       |-- project/
|   |       |-- department/
|   |       |-- role/
|   |       |-- stakeholder/
|   |       `-- main.ts
|   |-- sprint-service/             # NestJS
|   |   |-- Dockerfile
|   |   |-- prisma/schema.prisma    # Sprint, Card, Tag, Comment, TimeEntry, etc.
|   |   `-- src/
|   |       |-- sprint/
|   |       |-- card/
|   |       |-- time-entry/
|   |       |-- dashboard/
|   |       `-- main.ts
|   |-- notification-service/       # NestJS
|   |   |-- Dockerfile
|   |   |-- prisma/schema.prisma    # Notification
|   |   `-- src/
|   |       |-- notification/
|   |       |-- bull/               # BullMQ consumers
|   |       `-- main.ts
|   `-- file-service/               # NestJS
|       |-- Dockerfile
|       |-- prisma/schema.prisma    # Attachment
|       `-- src/
|           |-- upload/
|           |-- minio/              # MinIO client wrapper
|           `-- main.ts
|-- packages/                       # Codigo compartilhado (npm workspace)
|   |-- shared-types/               # Zod schemas, interfaces TS
|   `-- shared-utils/               # JWT utils, tenant resolution
`-- scripts/
    |-- migrate-blobs.ts            # Unica vez: Vercel Blob -> MinIO
    |-- backup-db.sh
    `-- restore-db.sh
```

---

## 4. Comunicacao Inter-Servico

### 4.1 Padrao Primario: HTTP REST Sincrono

Todos os servicos se comunicam via HTTP na rede Docker interna (`internal`). Latencia <1ms pois estao na mesma maquina.

O API Gateway e o ponto de entrada unico. Ele:
1. Valida o JWT (chave publica RS256)
2. Verifica sessao ativa no Redis
3. Injeta headers de contexto: `X-User-ID`, `X-Tenant-ID`, `X-User-Role`
4. Faz proxy HTTP para o servico downstream correspondente

Servicos downstream **confiam nos headers injetados** -- eles nao sao acessiveis externamente (apenas na rede `internal`).

### 4.2 Padrao Secundario: BullMQ Assincrono

Para operacoes fire-and-forget que nao devem bloquear o request:

| Produtor | Fila | Consumidor | Payload |
|----------|------|------------|---------|
| Qualquer servico | `notifications` | notification-service | `{ userId, type, title, message, reference? }` |
| auth-service | `audit` | sprint-service (audit worker) | `{ tenantId, userId, action, entity, entityId, details }` |
| file-service | `file-cleanup` | file-service (self) | `{ filePath, attachmentId }` |
| auth-service | `email` | notification-service | `{ to, subject, template, vars }` |

### 4.3 Grafo de Dependencias

```
                    [API Gateway]
                   /    |     \      \       \
                  v     v      v      v       v
             [Auth]  [Project] [Sprint] [Notification] [File]
               |        |        |          ^             ^
               |        |        |          |             |
               +--------+--------+----------+             |
                   (todos publicam na fila notifications)  |
                        |                                  |
                        +---(sprint precisa file-service   |
                             para URLs de attachment)------+
```

- **Notification Service**: zero dependencias (totalmente independente, recebe via BullMQ)
- **File Service**: zero dependencias (totalmente independente, apenas MinIO)
- **Auth Service**: zero dependencias (fundacional)
- **Project Service**: depende de Auth (via headers injetados pelo Gateway)
- **Sprint Service**: depende de Project (verificacao de acesso) e File (URLs de attachment)

---

## 5. Autenticacao e Autorizacao

### 5.1 Fluxo de Autenticacao (RS256)

**Estado atual:** JWT HS256 via `jose`, secret compartilhado, cookie `session` httpOnly, verificacao com lookup no banco a cada request (`lib/dal.ts` --> `prisma.user.findUnique`).

**Estado alvo:**

1. Usuario POST credenciais para `api.mvloperum.com/auth/login`
2. Auth-service valida (bcrypt compare), cria JWT RS256 com payload `{ userId, tenantId, role, tokenVersion, jti }`
3. Armazena sessao no Redis: chave `session:{jti}`, TTL 7 dias
4. Retorna JWT no body + seta cookie `session` httpOnly em `app.mvloperum.com`
5. Frontend API client le o cookie e envia `Authorization: Bearer <token>` em todos os requests
6. API Gateway:
   - Verifica assinatura JWT com chave publica RS256
   - Consulta Redis para confirmar sessao ativa (chave `session:{jti}`)
   - Se valido, injeta `X-User-ID`, `X-Tenant-ID`, `X-User-Role`
   - Se invalido, retorna 401
7. Servicos downstream confiam nos headers

**Vantagens sobre o estado atual:**
- Sem lookup no banco a cada request (Redis < 0.1ms vs PostgreSQL ~5ms)
- Chave publica pode ser distribuida sem risco (nao assina, apenas verifica)
- Revogacao instantanea via delete da sessao no Redis
- `tokenVersion` continua funcionando como fallback

### 5.2 Autorizacao (RBAC)

- Nivel global: `user.role` (`admin` / `member`)
- Nivel de projeto: `UserProjectRole` vinculando usuario a `Role` com `Permission`
- Gateway verifica nivel global; servicos verificam nivel de projeto
- Cache de permissoes no Redis (TTL 5 min) para evitar queries repetidas

### 5.3 Endpoints do Auth Service

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/auth/login` | Login com email/senha, retorna JWT |
| POST | `/auth/register` | Criar usuario (admin only) |
| POST | `/auth/logout` | Invalida sessao no Redis |
| GET | `/auth/me` | Dados do usuario autenticado |
| POST | `/auth/password/request-reset` | Solicita codigo de reset |
| POST | `/auth/password/validate-code` | Valida codigo |
| POST | `/auth/password/reset` | Reseta senha com codigo |
| POST | `/auth/password/change` | Troca senha (autenticado) |
| GET | `/auth/verify` | Verificacao service-to-service |
| GET | `/auth/tenants/:subdomain` | Resolucao de tenant |

---

## 6. Storage (MinIO)

### 6.1 Substituicao do Vercel Blob

**Estado atual:** `@vercel/blob` com `put()` e `del()` em `services/fileUploadService.ts`. URLs publicas do Vercel Blob armazenadas em `Attachment.filePath`, `User.avatarUrl`, `Project.logoUrl`, `Stakeholder.logoUrl`.

**Estado alvo:** MinIO com `@aws-sdk/client-s3` (SDK S3-compatible).

### 6.2 Estrutura de Buckets

```
mvloperum-files/
|-- {tenantId}/
|   |-- attachments/
|   |   `-- {cardId}/
|   |       `-- {uuid}.{ext}
|   |-- avatars/
|   |   `-- {userId}.{ext}
|   |-- logos/
|   |   |-- projects/{projectId}.{ext}
|   |   `-- stakeholders/{stakeholderId}.{ext}
|   `-- exports/
|       `-- {timestamp}-{type}.csv
```

### 6.3 Politica de Acesso

- **Avatars e logos**: bucket publico (acesso direto via `files.mvloperum.com/...`)
- **Attachments**: presigned URLs com expiracao de 1 hora
- **Exports**: presigned URLs com expiracao de 15 minutos

### 6.4 Endpoints do File Service

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/files/upload` | Upload multipart para MinIO |
| DELETE | `/files/:attachmentId` | Remove do MinIO + soft delete no banco |
| GET | `/files/:attachmentId/url` | Gera presigned URL |
| POST | `/files/avatar` | Upload de avatar do usuario |
| POST | `/files/logo` | Upload de logo (projeto/stakeholder) |

### 6.5 Migracao Vercel Blob --> MinIO

Script unico (`scripts/migrate-blobs.ts`):
1. Lista todos os registros com URLs do Vercel Blob no banco (`Attachment`, `User.avatarUrl`, `Project.logoUrl`, `Stakeholder.logoUrl`)
2. Download de cada arquivo via URL publica do Vercel Blob
3. Upload para MinIO na estrutura de bucket correta
4. Atualiza URL no banco para o novo endpoint MinIO
5. Validacao: compara contagem de blobs vs registros no banco

---

## 7. Observabilidade

### 7.1 Stack Leve para VPS (~512MB RAM total)

| Componente | Funcao | RAM |
|------------|--------|-----|
| Prometheus | Scraping de metricas `/metrics` dos servicos NestJS | ~150MB |
| Loki | Agregacao de logs via Docker log driver | ~200MB |
| Grafana | Dashboards, alertas, visualizacao | ~150MB |

**Por que nao ELK Stack:** Elasticsearch sozinho consome 2-4GB RAM. Em VPS com 8GB, isso inviabiliza rodar os servicos da aplicacao.

### 7.2 Metricas Expostas (NestJS via `@willsoto/nestjs-prometheus`)

- Request latency (p50, p95, p99) por servico e endpoint
- Error rate (4xx, 5xx) por servico
- PostgreSQL connection pool (ativas, ociosas, fila)
- Redis memory usage e hit rate
- MinIO disk usage
- BullMQ queue depth, processing rate, failed jobs

### 7.3 Logs

- Docker log driver envia para Loki automaticamente
- Cada servico NestJS usa logger estruturado (JSON) com campos: `timestamp`, `level`, `service`, `traceId`, `userId`, `tenantId`
- Log de auditoria (AuditLog) separado em tabela propria no banco -- nao depende de Loki

### 7.4 Alertas (Grafana)

- Downtime de qualquer servico (health check fail > 3 min)
- Error rate > 5% em qualquer servico (janela 5 min)
- Fila BullMQ com > 1000 jobs pendentes
- Disco MinIO > 80% de uso
- Redis memory > 90% do limite

---

## 8. CI/CD

### 8.1 Pipeline (GitHub Actions --> SSH Deploy para VPS)

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]

env:
  VPS_HOST: ${{ secrets.VPS_HOST }}
  VPS_USER: ${{ secrets.VPS_USER }}
  DEPLOY_PATH: /opt/mvloperum/production

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run test:run
      - run: npm run lint

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service:
          - frontend
          - api-gateway
          - auth-service
          - project-service
          - sprint-service
          - notification-service
          - file-service
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: |
          docker build \
            -t mvloperum/${{ matrix.service }}:${{ github.sha }} \
            -t mvloperum/${{ matrix.service }}:latest \
            ./services/${{ matrix.service }}
      - name: Save image
        run: |
          docker save mvloperum/${{ matrix.service }}:${{ github.sha }} \
            | gzip > ${{ matrix.service }}.tar.gz
      - uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.service }}
          path: ${{ matrix.service }}.tar.gz

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
      - name: Transfer images to VPS
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ env.VPS_HOST }}
          username: ${{ env.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          source: "*/**.tar.gz"
          target: /tmp/mvloperum-deploy
      - name: Deploy on VPS
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ env.VPS_HOST }}
          username: ${{ env.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /tmp/mvloperum-deploy
            for f in */*.tar.gz; do
              docker load < "$f"
            done
            rm -rf /tmp/mvloperum-deploy
            cd ${{ env.DEPLOY_PATH }}
            docker compose -f docker-compose.yml \
              -f docker-compose.production.yml \
              up -d --remove-orphans
            docker image prune -f
```

### 8.2 Fluxo de Branches

| Branch | Trigger | Ambiente |
|--------|---------|----------|
| `develop` | Push automatico | Staging (`staging.mvloperum.com`) |
| `main` | Push automatico ou manual dispatch | Producao (`app.mvloperum.com`) |

### 8.3 Secrets Necessarios no GitHub

| Secret | Descricao |
|--------|-----------|
| `VPS_HOST` | IP ou hostname da VPS Hostinger |
| `VPS_USER` | Usuario SSH (ex: `deploy`) |
| `VPS_SSH_KEY` | Chave privada SSH para o usuario |

---

## 9. Estrategia de 2 Ambientes

### 9.1 Layout na VPS

```
/opt/mvloperum/
|-- shared/
|   |-- docker-compose.traefik.yml   # Traefik compartilhado entre ambientes
|   |-- traefik/
|   |   |-- traefik.yml
|   |   `-- dynamic/
|   |       `-- middlewares.yml
|   |-- observability/
|   |   `-- prometheus.yml
|   `-- scripts/
|       |-- backup-db.sh
|       `-- restore-db.sh
|-- staging/
|   |-- docker-compose.yml           # Symlink -> ../shared/docker-compose.yml
|   |-- docker-compose.staging.yml   # Overrides especificos
|   `-- .env                         # Variaveis do staging
|-- production/
|   |-- docker-compose.yml           # Symlink -> ../shared/docker-compose.yml
|   |-- docker-compose.production.yml
|   `-- .env                         # Variaveis de producao
`-- backups/
    |-- staging/
    `-- production/
```

### 9.2 Variaveis de Ambiente

#### Staging (`.env`)

```bash
COMPOSE_PROJECT_NAME=mvloperum-staging
BASE_DOMAIN=mvloperum.com
FRONTEND_HOST=staging.mvloperum.com
API_HOST=api-staging.mvloperum.com
API_URL=https://api-staging.mvloperum.com
MINIO_HOST=minio-staging.mvloperum.com
MINIO_PUBLIC_URL=https://minio-staging.mvloperum.com

DB_USER=mvluser
DB_PASSWORD=<senha-staging>
DB_NAME=mvloperum_staging
DATABASE_URL=postgresql://mvluser:<senha-staging>@postgres:5432/mvloperum_staging

REDIS_URL=redis://redis:6379/0

JWT_PRIVATE_KEY=<chave-privada-RS256-staging>
JWT_PUBLIC_KEY=<chave-publica-RS256-staging>

MINIO_ACCESS_KEY=staging-minio-key
MINIO_SECRET_KEY=staging-minio-secret
MINIO_BUCKET=mvloperum-staging

GRAFANA_PASSWORD=<senha-grafana-staging>

NODE_ENV=staging
```

#### Producao (`.env`)

```bash
COMPOSE_PROJECT_NAME=mvloperum-prod
BASE_DOMAIN=mvloperum.com
FRONTEND_HOST=app.mvloperum.com
API_HOST=api.mvloperum.com
API_URL=https://api.mvloperum.com
MINIO_HOST=files.mvloperum.com
MINIO_PUBLIC_URL=https://files.mvloperum.com

DB_USER=mvluser
DB_PASSWORD=<senha-producao>
DB_NAME=mvloperum_prod
DATABASE_URL=postgresql://mvluser:<senha-producao>@postgres:5432/mvloperum_prod

REDIS_URL=redis://redis:6379/1

JWT_PRIVATE_KEY=<chave-privada-RS256-producao>
JWT_PUBLIC_KEY=<chave-publica-RS256-producao>

MINIO_ACCESS_KEY=prod-minio-key
MINIO_SECRET_KEY=prod-minio-secret
MINIO_BUCKET=mvloperum-prod

GRAFANA_PASSWORD=<senha-grafana-producao>

NODE_ENV=production
```

### 9.3 Isolamento

| Recurso | Staging | Producao |
|---------|---------|----------|
| Redes Docker | `mvloperum-staging_proxy`, `mvloperum-staging_internal` | `mvloperum-prod_proxy`, `mvloperum-prod_internal` |
| PostgreSQL | Instancia propria, banco `mvloperum_staging` | Instancia propria, banco `mvloperum_prod` |
| Redis | DB index 0 | DB index 1 |
| MinIO | Bucket `mvloperum-staging` | Bucket `mvloperum-prod` |
| JWT | Chaves RS256 exclusivas | Chaves RS256 exclusivas |
| Dominios | `staging.*`, `api-staging.*` | `app.*`, `api.*`, `files.*` |

### 9.4 Traefik Compartilhado

Uma unica instancia de Traefik roda fora dos stacks de ambiente. Ela conecta-se as redes `proxy` de ambos:

```yaml
# /opt/mvloperum/shared/docker-compose.traefik.yml
services:
  traefik:
    image: traefik:v3.2
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik/traefik.yml:/etc/traefik/traefik.yml:ro
      - ./traefik/dynamic:/etc/traefik/dynamic:ro
      - traefik-certs:/myresolver
    networks:
      - mvloperum-staging_proxy
      - mvloperum-prod_proxy

volumes:
  traefik-certs:

networks:
  mvloperum-staging_proxy:
    external: true
  mvloperum-prod_proxy:
    external: true
```

### 9.5 Docker Compose Override (Staging)

```yaml
# docker-compose.staging.yml
services:
  traefik:
    profiles: ["disabled"]    # Usa o Traefik compartilhado

  postgres:
    ports: []                 # Sem exposicao externa
    volumes:
      - staging-pg-data:/var/lib/postgresql/data

  redis:
    ports: []
    command: redis-server --appendonly yes --maxmemory 128mb --maxmemory-policy allkeys-lru
    volumes:
      - staging-redis-data:/data

  minio:
    volumes:
      - staging-minio-data:/data

  # Limites de recursos menores para staging
  auth-service:
    deploy:
      resources:
        limits:
          memory: 256M
  project-service:
    deploy:
      resources:
        limits:
          memory: 256M
  sprint-service:
    deploy:
      resources:
        limits:
          memory: 256M
  notification-service:
    deploy:
      resources:
        limits:
          memory: 128M
  file-service:
    deploy:
      resources:
        limits:
          memory: 128M
  frontend:
    deploy:
      resources:
        limits:
          memory: 512M

  # Observabilidade desabilitada no staging (usa docker logs)
  prometheus:
    profiles: ["disabled"]
  loki:
    profiles: ["disabled"]
  grafana:
    profiles: ["disabled"]

volumes:
  staging-pg-data:
  staging-redis-data:
  staging-minio-data:
```

### 9.6 Backup Automatizado

```bash
#!/bin/bash
# /opt/mvloperum/shared/scripts/backup-db.sh
# Cron: 0 3 * * * /opt/mvloperum/shared/scripts/backup-db.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/mvloperum/backups"

# Backup producao
docker exec mvloperum-prod-postgres-1 \
  pg_dump -U mvluser mvloperum_prod \
  | gzip > "$BACKUP_DIR/production/mvloperum_prod_${TIMESTAMP}.sql.gz"

# Backup staging
docker exec mvloperum-staging-postgres-1 \
  pg_dump -U mvluser mvloperum_staging \
  | gzip > "$BACKUP_DIR/staging/mvloperum_staging_${TIMESTAMP}.sql.gz"

# Retencao: ultimos 7 dias
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete

echo "[$(date)] Backup concluido." >> /var/log/mvloperum-backup.log
```

### 9.7 Orcamento de RAM (VPS 8GB)

| Componente | Staging | Producao |
|------------|---------|----------|
| PostgreSQL | 512MB | 1GB |
| Redis | 128MB | 256MB |
| MinIO | 128MB | 256MB |
| Frontend (Next.js) | 512MB | 512MB |
| API Gateway | 64MB | 128MB |
| Auth Service | 128MB | 256MB |
| Project Service | 128MB | 256MB |
| Sprint Service | 128MB | 256MB |
| Notification Service | 64MB | 128MB |
| File Service | 64MB | 128MB |
| Prometheus | - | 150MB |
| Loki | - | 200MB |
| Grafana | - | 150MB |
| Traefik (compartilhado) | 64MB | - |
| **Subtotal** | **~2.0GB** | **~3.7GB** |
| **Total geral** | | **~5.7GB** |
| **Folga (OS + picos)** | | **~2.3GB** |

---

## 10. Roadmap de Decomposicao

### Estrategia: Strangler Fig Pattern

O monolito continua servindo usuarios reais durante toda a migracao. Novos servicos sao implantados atras do API Gateway. Feature flags no monolito controlam qual caminho e usado (codigo antigo vs novo servico). Nenhum servico e removido do monolito ate estar 100% validado no novo servico.

### Fase 0 -- Fundacao (Semanas 1-3)

**Objetivo:** Estabelecer infraestrutura sem modificar logica de negocio.

**Entregas:**
1. Criar `Dockerfile` para o monolito Next.js (rodar como container)
2. Configurar Docker Compose completo na VPS com: PostgreSQL, Redis, MinIO, Traefik
3. Configurar CI/CD (GitHub Actions -> SSH deploy)
4. Migrar banco de producao de `187.77.236.241:5433` para PostgreSQL Dockerizado
5. Criar ambiente de staging com copia sanitizada dos dados de producao
6. Configurar workspace `packages/` (shared-types, shared-utils)
7. Migrar JWT de HS256 para RS256 (ainda dentro do monolito):
   - Modificar `lib/session.ts`: trocar `HS256` por `RS256`, usar par de chaves
   - Suportar ambos os algoritmos por 1 semana (periodo de transicao)
8. Substituir `@vercel/blob` por MinIO no monolito:
   - Modificar `services/fileUploadService.ts`: trocar `put()`/`del()` do `@vercel/blob` por `PutObjectCommand`/`DeleteObjectCommand` do `@aws-sdk/client-s3`
   - Executar `scripts/migrate-blobs.ts` para mover arquivos existentes

**Marco:** Monolito rodando identicamente em Docker na VPS. CI/CD funcional para staging e producao. Storage via MinIO. JWT RS256.

**Mitigacao de risco:**
- Rodar monolito Dockerizado em paralelo com deploy atual por 1 semana
- DNS cutover apenas apos validacao completa
- Manter token Vercel Blob ativo por 30 dias como fallback

### Fase 1 -- Notification Service (Semanas 4-6)

**Por que notificacoes primeiro:**
- Zero dependencias inbound (nada depende dos dados de notificacao para funcionar)
- CRUD puro: `services/notificacaoService.ts` tem 7 funcoes, todas queries simples no Prisma
- Bounded context claro: toca apenas o model `Notification`
- Introduz o padrao assincrono (BullMQ) que todos os servicos futuros usarao
- Baixo blast radius se algo der errado

**Passos:**
1. Criar `services/notification-service/` como projeto NestJS
2. Schema Prisma com apenas model `Notification`
3. Implementar endpoints REST:

| Metodo | Rota | Origem no Monolito |
|--------|------|--------------------|
| POST | `/notifications` | `notificacaoService.create` |
| GET | `/notifications?userId=&status=&limit=` | `notificacaoService.findAllByUser` |
| PATCH | `/notifications/:id/read` | `notificacaoService.markAsRead` |
| PATCH | `/notifications/:id/archive` | `notificacaoService.markAsArchived` |
| DELETE | `/notifications/:id` | `notificacaoService.deleteNotificacao` |
| GET | `/notifications/unread-count?userId=` | `notificacaoService.countUnread` |
| PATCH | `/notifications/mark-all-read?userId=` | inline em `app/actions/notificacoes.ts` |

4. Adicionar BullMQ consumer: escuta fila `notifications`, chama `create()`
5. No monolito, atualizar `app/actions/notificacoes.ts` para chamar `fetch('http://notification-service:4004/...')` em vez de importar `notificacaoService`
6. Em `app/api/notificacoes/count/route.ts`, fazer proxy para o novo servico
7. Onde o monolito cria notificacoes inline (buscar por `notificacaoService.create` e `prisma.notification.create`), substituir por publish na fila BullMQ
8. Feature flag: variavel `NOTIFICATION_SERVICE_URL` -- se definida, usa HTTP; se vazia, codigo antigo

**Marco:** Notificacoes 100% servidas pelo microservico. BullMQ validado como padrao de mensageria.

**Validacao:** Comparar contagens de notificacoes e comportamento read/unread. Dual-write no staging por 1 semana.

### Fase 2 -- Auth Service + File Service (Semanas 7-12)

#### Auth Service (Semanas 7-9)

Auth e fundacional -- todo servico futuro precisa dele. Extrair cedo significa que todos os servicos futuros ja serao construidos contra o auth real.

**Passos:**
1. Criar `services/auth-service/` (NestJS)
2. Schema Prisma: `Tenant`, `User`
3. Endpoints: conforme tabela na secao 5.3
4. Redis session store: no login, armazenar `{ userId, tenantId, role, tokenVersion }` no Redis com TTL 7d. Chave: `session:{jti}`
5. Construir API Gateway (`services/api-gateway/`) com middleware JWT
6. Atualizar frontend: substituir server actions de auth por chamadas API client
7. Remover do monolito: `lib/dal.ts`, `lib/session.ts`, `app/actions/auth.ts`, `app/actions/alterarSenha.ts`

#### File Service (Semanas 10-12)

**Passos:**
1. Criar `services/file-service/` (NestJS)
2. Schema Prisma: `Attachment`
3. MinIO client wrapper (logica ja migrada na Fase 0)
4. Endpoints: conforme tabela na secao 6.4
5. Mover logica de `services/fileUploadService.ts` para o servico
6. Atualizar `app/api/uploads/route.ts` no monolito para fazer proxy ao file-service

**Marco:** Autenticacao centralizada no auth-service. API Gateway operacional. Uploads via file-service. O monolito nao trata mais auth nem storage.

### Fase 3 -- Core Domain Services (Semanas 13-20)

#### Project Service (Semanas 13-16)

**Models:** Project, ProjectMacroFase, UserProject, Department, UserDepartment, Role, Permission, RolePermission, UserProjectRole, Stakeholder, ProjectStakeholder (11 models)

**Cobre codigo do monolito:**
- `services/projectService.ts` (CRUD, membros, paginacao)
- `services/departmentService.ts` (CRUD departamentos)
- `services/roleService.ts` + `services/permissionService.ts` (RBAC)
- `services/projectRoleService.ts` (gerentes de projeto)
- `app/actions/projetos.ts`, `app/actions/projects.ts`, `app/actions/departments.ts`, `app/actions/roles.ts`, `app/actions/stakeholders.ts`

**Nota:** RBAC fica como sub-modulo dentro do project-service (nao como servico separado) para evitar chatter excessivo.

#### Sprint Service (Semanas 17-20)

**Models:** Sprint, SprintColumn, Card, CardTag, CardResponsible, Tag, Comment, TimeEntry, DashboardMetric, SprintFeedback, AuditLog (11 models)

**Cobre codigo do monolito:**
- `services/sprintService.ts` (CRUD sprints)
- `services/sprintColumnService.ts` (colunas kanban)
- `app/actions/sprintBoard.ts` (CRUD cards, colunas)
- `services/timeService.ts` (time entries)
- `services/dashboardService.ts` + `services/dashboardMetricService.ts` (metricas, KPIs)
- `services/comentarioService.ts` (comentarios)
- `services/tagService.ts` (tags)
- `services/auditoriaService.ts` (audit logs)
- `services/csvImportService.ts` (importacao CSV)
- `services/sprintFeedbackService.ts` (feedback retrospectiva)

**Dependencia inter-servico:** Dashboard endpoints precisam consultar project-service para contexto de projeto. Usar HTTP com circuit breaker (`opossum`).

**Marco:** Monolito e agora um frontend puro. Todos os server actions foram substituidos por API client.

### Fase 4 -- Frontend Decoupling + Cleanup (Semanas 21-24)

**Passos:**
1. Remover todos os arquivos com `'use server'` de `app/actions/`
2. Substituir por chamadas `fetch` via API client tipado (`lib/api-client.ts`)
3. Remover Prisma do frontend:
   - `prisma/schema.prisma`
   - `lib/prisma.ts`
   - `lib/generated/`
4. Limpar `package.json` -- remover dependencias backend:
   - `bcrypt`, `bcryptjs`, `@vercel/blob`, `server-only`, `@prisma/client`, `@prisma/adapter-pg`, `pg`
5. Remover arquivos duplicados pt/en:
   - `services/projetoService.ts`, `services/departamentoService.ts`
   - `lib/validation/departamentoSchemas.ts`, `lib/validation/projetoSchemas.ts`
6. Admin Service: extrair logica de `services/adminService.ts` como modulo dentro do auth-service
7. Habilitar Redis caching em todos os servicos (tenant config, permissoes, memberships)
8. Health checks e auto-restart policies no Docker Compose
9. Load testing com trafego realista no staging (k6)
10. Cutover DNS de producao: apontar dominio para VPS

**Marco:** Arquitetura de microservicos completa e operacional. Monolito eliminado. Todo trafego flui por Traefik -> API Gateway -> Servicos.

### Resumo Visual do Roadmap

```
Sem 1-3   [====== Fase 0: Fundacao ======]
           Docker, CI/CD, MinIO, RS256, VPS

Sem 4-6         [=== Fase 1: Notifications ===]
                 Primeiro microservico + BullMQ

Sem 7-12              [======= Fase 2: Auth + File =======]
                       Auth centralizado, API Gateway, MinIO

Sem 13-20                    [=========== Fase 3: Project + Sprint ===========]
                              Core domains, monolito vira frontend

Sem 21-24                                       [=== Fase 4: Cleanup ===]
                                                 Remover monolito, DNS cutover
```

---

## 11. Regras de Negocio

### Multi-Tenant

- Cada Tenant e isolado, com dados, usuarios e configuracoes separadas
- Subdominio unico por Tenant para identificar contexto de login
- Nao ha compartilhamento de dados entre tenants
- Resolucao de tenant: subdomain -> auth-service `/auth/tenants/:subdomain`

### Autenticacao

- Login via email e senha com bcrypt hash
- MFA habilitado para papeis administrativos (preparado no schema, implementacao futura)
- Tentativas de login registradas e bloqueio automatico
- Reset de senha seguro via token com expiracao de 15 minutos

### Autorizacao

- Usuarios tem papeis vinculados a Projeto via UserProjectRole
- Permissoes derivadas dos papeis (resource + action)
- Acesso controlado por RBAC em dois niveis (global + projeto) e escopo de Tenant

### Auditoria

- Todas acoes criticas sao auditadas (AuditLog)
- Imutavel, registrando acao, entidade, detalhes e timestamp
- Publicada via fila BullMQ `audit` para processamento assincrono

### Notificacoes

- In-app via Notification Service (microservico dedicado)
- Assincronas via fila BullMQ `notifications`
- Tipos: COMMENT, ASSIGNMENT, UPDATE, COMPLETION, MENTIONED, INVITATION
- Email (futuro): via fila BullMQ `email` no notification-service

---

## 12. Seguranca

### Autenticacao e Autorizacao

- JWT RS256 (chave assimetrica) para autenticacao
- Redis session store para revogacao instantanea
- RBAC em dois niveis (global + projeto)
- Tokens com expiracao de 7 dias, renovaveis

### Protecao de Dados

- Senhas com hash bcrypt e salt
- Dados sensiveis criptografados em repouso quando necessario
- Auditoria completa de acoes criticas
- Chaves JWT RS256 diferentes por ambiente (staging vs producao)

### Seguranca na API

- CORS restritivo (apenas dominios do app)
- Rate limiting via Traefik middleware (100 req/s, burst 50)
- Validacao de entrada rigorosa via Zod
- Protecao contra CSRF (SameSite cookies), XSS (httpOnly cookies), SQL Injection (Prisma parameterized queries)
- Rede interna Docker nao acessivel externamente (servicos nao expostos)

### Compliance e LGPD

- Consentimento explicito de usuarios
- Logs de acesso e rastreabilidade
- Soft delete de usuarios e tenants mantendo historico seguro
- Direito ao esquecimento: endpoint dedicado para anonimizacao

---

## 13. Testes e Qualidade

### Testes Unitarios

- Cada servico NestJS possui cobertura de testes unitarios
- Framework: **Vitest** (frontend) + **Jest** (backend NestJS)
- Mocking de dependencias externas (Redis, PostgreSQL, MinIO)

### Testes de Integracao

- Validam integracao entre modulos e banco de dados
- Testam endpoints REST, relacionamentos multi-tenant e fluxos criticos
- **Supertest** para testes de API nos servicos NestJS
- Banco de dados de teste dedicado (em-memoria ou container efemero)

### Testes E2E (End-to-End)

- Simulam fluxo completo do usuario no sistema
- Do login ate execucao de tarefas e relatorios
- **Playwright** para testes de navegador
- Executados contra ambiente de staging

### Testes de Performance

- Avaliam tempo de resposta de endpoints criticos
- Simulam multiplos usuarios ativos (stress test)
- **k6** para load testing
- Executados no staging antes de cada release para producao

### Pipeline de Qualidade

- Testes unitarios: rodam em cada push (GitHub Actions)
- Testes de integracao: rodam em PRs para `develop` e `main`
- Testes E2E: rodam apos deploy no staging
- Load tests: rodam manualmente antes de releases maiores

---

## 14. Registro de Riscos

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| VPS fica sem RAM | Media | Alto | Limites de memoria por container; observabilidade desabilitada no staging; upgrade de plano VPS se necessario |
| Perda de dados na migracao do banco | Baixa | Critico | Backup completo antes da migracao; testar restore; rodar bancos em paralelo por 1 semana |
| Migracao Vercel Blob perde arquivos | Baixa | Medio | Script compara contagem de blobs vs registros no banco; verificacao manual de amostra |
| Latencia inter-servico degrada UX | Media | Medio | Todos os servicos na mesma VPS (rede <1ms); cache Redis; circuit breakers |
| VPS e ponto unico de falha | Alta | Critico | Backups automatizados para storage externo (Backblaze B2, ~R$25/mes); procedimento de recovery documentado; RTO alvo < 2 horas |
| Rotacao de chave JWT quebra sessoes | Baixa | Alto | Suportar chave antiga e nova por 24h durante rotacao; invalidacao via Redis |
| Docker Compose nao escala | Media | Medio | Aceitavel para o estagio atual do produto; migrar para Docker Swarm se necessario (sem custo de Kubernetes) |

---

## 15. Mapa de Dominio e Modelos

### 15.1 Distribuicao por Servico

| Servico | Models | Quantidade |
|---------|--------|------------|
| **Auth Service** | Tenant, User | 2 |
| **Project Service** | Project, ProjectMacroFase, UserProject, Department, UserDepartment, Role, Permission, RolePermission, UserProjectRole, Stakeholder, ProjectStakeholder | 11 |
| **Sprint Service** | Sprint, SprintColumn, Card, CardTag, CardResponsible, Tag, Comment, TimeEntry, DashboardMetric, SprintFeedback, AuditLog | 11 |
| **Notification Service** | Notification | 1 |
| **File Service** | Attachment | 1 |
| **Total** | | **26** |

### 15.2 Tabela Detalhada

| Entidade | Dominio | Servico | Relacionamentos | Testes | Seguranca |
|----------|---------|---------|-----------------|--------|-----------|
| **Tenant** | Organizacao | Auth | 1:N -> User, Project, Department, Role | Unit, Integration | Isolamento de dados, soft delete, auditoria |
| **User** | Gestao de usuarios | Auth | 0:N -> Projeto (via UserProject), 0:N -> Department | Unit, Integration, E2E | JWT RS256, RBAC, hash bcrypt, auditoria |
| **Department** | Organizacao interna | Project | 1:N -> UserDepartment | Unit, Integration | Somente usuarios do Tenant |
| **Project** | Gestao de projetos | Project | 1:N -> Sprint, N:N -> User (via UserProject) | Unit, Integration, E2E | RBAC, validacao de tenant |
| **UserProject** | Vinculo usuario-projeto | Project | N:1 -> User, N:1 -> Project, N:1 -> Department | Unit, Integration | Isolamento de tenant |
| **Role** | Controle de acesso | Project | N:N -> Permission (via RolePermission) | Unit, Integration | RBAC, escopo Tenant |
| **Permission** | Controle de acoes | Project | N:N -> Role (via RolePermission) | Unit, Integration | RBAC |
| **Sprint** | Planejamento agil | Sprint | 1:N -> SprintColumn, 1:N -> Card | Unit, Integration, E2E | Isolamento tenant, auditoria |
| **SprintColumn** | Kanban / Status | Sprint | 1:N -> Card | Unit, Integration | Apenas usuarios do projeto |
| **Card** | Tarefas | Sprint | 1:N -> Comment, N:N -> Tag, 1:N -> Attachment, 1:N -> TimeEntry | Unit, Integration, E2E | RBAC, validacao de tenant |
| **Comment** | Comentarios | Sprint | N:1 -> Card, N:1 -> User | Unit, Integration | Controle por tenant/projeto |
| **Tag** | Classificacao | Sprint | N:N -> Card (via CardTag) | Unit | Controle de tenant |
| **TimeEntry** | Registro de horas | Sprint | N:1 -> Card, N:1 -> User | Unit, Integration, E2E | Validacao de tenant |
| **DashboardMetric** | Metricas | Sprint | N:1 -> Sprint, N:1 -> User | Unit, Integration | Leitura restrita a tenant |
| **SprintFeedback** | Feedback | Sprint | N:1 -> Sprint, N:1 -> User | Unit, Integration | Controle de tenant |
| **AuditLog** | Historico / Logs | Sprint | N:1 -> Tenant | Unit, Integration | Imutavel, rastreabilidade |
| **Notification** | Alertas | Notification | N:1 -> User | Unit, Integration | Somente destinatario, filas assincronas |
| **Attachment** | Arquivos | File | N:1 -> Card | Unit, Integration | Validacao tipo/size, controle tenant |
| **Stakeholder** | Partes interessadas | Project | N:N -> Project (via ProjectStakeholder) | Unit, Integration | Controle de tenant |

---

## Boas Praticas

- Versionamento semantico de API e codigo
- Branching Git: `main` (producao) + `develop` (staging) + feature branches
- Documentacao de endpoints via **OpenAPI / Swagger** em cada servico NestJS
- Testes automatizados integrados a pipeline CI/CD
- Health checks em todos os containers (restart automatico)
- Logs estruturados em JSON com `traceId` para correlacao
- Circuit breakers em chamadas inter-servico (`opossum`)
- Redis caching com TTL em dados frequentes (tenant config, permissoes)
