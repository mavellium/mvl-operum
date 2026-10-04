# Segurança e operação do Operum

## Quais riscos de segurança confirmados ainda não estão cobertos pelo SDD?

### Takeaway
Há divergência concreta entre a revogação prometida pelo auth-service e a validação JWT no gateway. Redis acumula funções de cache, sessão e fila com política de descarte de qualquer chave. Auditoria estática, sem exploração da produção, no checkout c92d3934 em 30/09/2026; alterações locais de outras tarefas foram preservadas.

### Cited Findings

**OPS-01 — Fazer a revogação de sessões valer também nas APIs do gateway — P1 / Alta.** Bug confirmado por fluxo estático, sem reproduzir em produção. A troca/reset incrementa tokenVersion; auth.verify consulta versão, estado e exclusão do usuário; gateway verifica assinatura e existência da sessão, mas não consulta versão/estado. O comentário do reset diz que o gateway rejeita versões antigas, porém as sessões Redis permanecem. Isso permite continuar usando JWT anterior nas APIs que confiam na identidade do gateway enquanto a sessão existir. Fontes: [auth.service.ts:206](../../auth-service/src/auth/auth.service.ts#L206), [auth.service.ts:239](../../auth-service/src/auth/auth.service.ts#L239), [auth.service.ts:418](../../auth-service/src/auth/auth.service.ts#L418), [gateway auth.ts:220](../../api-gateway/src/middleware/auth.ts#L220), [guard interno project-service:17](../../project-service/src/guards/internal-auth.guard.ts#L17). Proposta: centralizar verificação revogável da sessão/versão e invalidar todas as sessões nas mudanças sensíveis. Aceite: token pré-reset/troca de senha/desativação é recusado em rotas de project/sprint via gateway; sessão válida continua; teste integrado cobre ambos. Não é o timeout por inatividade do SDD 3.4.

**OPS-02 — Definir e testar falha segura de sessão quando o Redis cair — P1 / Alta.** Comportamento confirmado, não incidente observado: o gateway deliberadamente ignora a falha do Redis; auth.getSession devolve um objeto válido quando available=false, inclusive em produção, embora o comentário mencione desenvolvimento. Logout durante indisponibilidade pode não remover a sessão, pois deleteSession retorna silenciosamente. Fontes: [gateway auth.ts:225](../../api-gateway/src/middleware/auth.ts#L225), [redis.service.ts:40](../../auth-service/src/redis/redis.service.ts#L40), [arquitetura:651](../../docs/architecture.md#L651). Proposta: formalizar decisão de disponibilidade versus revogação; em produção negar operações autenticadas sem comprovação de sessão, ou oferecer alternativa explicitamente revogável com prazo limitado. Aceite: teste com Redis indisponível e recuperado demonstra que logout/revogação não readmite token; resposta de indisponibilidade diferenciada; decisão/documentação atualizada. Distinto de OPS-01: um ocorre com Redis saudável, o outro em pane.

**OPS-03 — Isolar filas e sessões do Redis sujeito a eviction — P1 / Alta.** Configuração confirmada; perda efetiva não observada. Redis de produção usa 256 MB e allkeys-lru; BullMQ e sessões apontam ao mesmo serviço redis. Sob pressão, chaves de fila/sessões entram no universo de descarte. Fontes: [compose produção:115](../../docker-compose.production.yml#L115), [BullMQ:8](../../notification-service/src/app.module.ts#L8), [sessões:14](../../auth-service/src/redis/redis.service.ts#L14), [compose:256](../../docker-compose.yml#L256). Proposta: separar cache descartável de Redis de fila/sessão, definir noeviction para fila e alertar memória; documentar persistência e dimensionamento. Aceite: teste controlado de pressão confirma jobs não descartados, falha de escrita observável, sessões não expulsas por cache; recuperação/retry testados.

### Inferences
- A exposição de OPS-01 foi inferida do caminho de validação e confiança nos headers internos; não se alega exploração ou acesso indevido observado.
- OPS-03 é risco da configuração existente, não prova de que notificações já se perderam.

### Gaps
- Não foram consultadas configurações/manobras manuais de produção. File-service tenant (SDD 4.1), permissões fase 5, fast-uri PR30 e dotenv PR31 já têm trabalho próprio e não devem virar cards duplicados.

## Como impedir novos deploys quebrados e assegurar a recuperação?

### Takeaway
Os checks pesados só rodam depois de push na main; as imagens recebem a tag prod antes do scan, e deploy resolve tags mutáveis. Os backups do script são apenas de compose, com rollback de imagem manual.

### Cited Findings

**OPS-04 — Implantar imagens imutáveis do SHA aprovado e promover tags somente após validação — P1 / Alta.** Risco confirmado na configuração. Build publica cada imagem como SHA e prod antes dos scans. Só o job deploy tem concurrency; outro build pode trocar prod enquanto um deploy anterior baixa imagens. SHA recebido pelo script serve para validação/nome do backup e log, não seleciona imagens. Fontes: [workflow:117](../../.github/workflows/deploy-production.yml#L117), [workflow:207](../../.github/workflows/deploy-production.yml#L207), [workflow:296](../../.github/workflows/deploy-production.yml#L296), [compose produção:6](../../docker-compose.production.yml#L6), [deploy script:84](../../scripts/deploy/remote-deploy.sh#L84). Proposta: manifest com digest/SHA por serviço, migrate e app com mesma imagem; prod só promovida após checks; registrar versão realmente implantada. Aceite: duas execuções concorrentes não misturam versões; imagem reprovada no scan nunca vira candidata ativa; SHA implantado verificável.

**OPS-05 — Rodar checks dos serviços e smoke das imagens de produção antes do merge/deploy — P1 / Alta.** Lacuna confirmada. Workflow de PR contém CodeQL/secrets; testes/lint/audit estão em push de main/develop e apenas comandos da raiz. Vitest raiz exclui auth-service, notification-service e project-service. Não há boot das imagens antes do deploy; smoke externo vem depois da troca. Fontes: [CodeQL:4](../../.github/workflows/codeql.yml#L4), [produção:3](../../.github/workflows/deploy-production.yml#L3), [produção:73](../../.github/workflows/deploy-production.yml#L73), [Vitest:31](../../vitest.config.mts#L31), [produção:357](../../.github/workflows/deploy-production.yml#L357). Proposta: workflow PR com matriz por pacote, frozen-lockfile, testes existentes, build, audit/Trivy e smoke efêmero das imagens finais com dependências isoladas. Aceite: falha de teste auth/project bloqueia check; pacote runtime ausente faz smoke falhar antes da promoção; evidência de cada pacote testado. Inclui prevenção das classes de incidente PR30/31, não reabre correções já feitas.

**OPS-06 — Registrar e ensaiar rollback por release sem retag manual — P1 / Alta.** Limitação confirmada. Quando up falha, script imprime logs e manda retaggear imagem anterior manualmente; backup guarda apenas dois composes. Migrations já rodaram antes da troca. Fontes: [script:39](../../scripts/deploy/remote-deploy.sh#L39), [script:54](../../scripts/deploy/remote-deploy.sh#L54), [script:87](../../scripts/deploy/remote-deploy.sh#L87), [script:97](../../scripts/deploy/remote-deploy.sh#L97). Proposta: salvar manifest anterior com digests e procedimento/comando de rollback seguro; política expand/contract para migrations e bloqueio de reversão incompatível; automatizar somente quando seguro. Aceite: simular serviço unhealthy em staging e restaurar release conhecida; confirmar dados íntegros e registrar duração; jamais desfazer schema destrutivamente por padrão. Dependência: OPS-04.

**OPS-07 — Versionar backup de PostgreSQL/MinIO e comprovar restauração — P1 / Alta.** Lacuna do repositório, situação real da VPS desconhecida. Exemplo de backup existe na Arquitetura Desejada, mas inventário de scripts não contém backup/restore implementado; script de deploy copia apenas compose. Fontes: [proposta backup:1052](../../docs/Arquitetura%20Desejada.md#L1052), [scripts](../../scripts), [backup compose:54](../../scripts/deploy/remote-deploy.sh#L54), [volumes produção:110](../../docker-compose.production.yml#L110). Proposta: primeiro inventariar eventual rotina existente, incorporá-la ao controle de versão; definir retenção, cópia fora da VPS, cifragem/acesso, RPO/RTO e restore conjunto de metadados e objetos. Aceite: restaurar ambiente isolado com projetos, usuários e anexos amostrados íntegros; registrar tempo/ponto recuperável e alerta de falha; sem tocar dados vivos. Não afirmar que produção está sem backup, pois não houve inspeção.

### Inferences
- Mistura de imagens entre execuções é cenário possível pelo uso de tags mutáveis, não incidente provado.
- A classificação de backup como prioridade alta decorre do impacto potencial; a primeira etapa é confirmar se existe rotina externa.

### Gaps
- Branch protections, cron/backups externos e retenção do provedor não foram auditados. Não houve execução de deploy, rollback ou restore.

## Que lacunas de observabilidade prejudicam detectar e explicar falhas?

### Takeaway
Healthchecks atestam processo HTTP, não prontidão funcional; configuração de métricas aponta para uma rota ausente. Isso reduz a capacidade de detectar degradação antes da reclamação de usuários.

### Cited Findings

**OPS-08 — Separar liveness e readiness com verificação das dependências essenciais — P2 / Média.** Lacuna confirmada. Health do app, auth e project retorna status ok constante; compose usa esses endpoints como service_healthy. Fontes: [app health:1](../../app/api/health/route.ts#L1), [auth health:5](../../auth-service/src/health/health.controller.ts#L5), [project health:5](../../project-service/src/health/health.controller.ts#L5), [compose:152](../../docker-compose.yml#L152), [compose:211](../../docker-compose.yml#L211). Proposta: liveness simples e readiness com consultas leves/timeouts ao banco, Redis/storage conforme responsabilidade; evitar cascata de reinícios em indisponibilidade externa. Aceite: processo vivo sem banco responde liveness 200 e readiness 503; deploy não conclui antes da prontidão; resposta pública não contém credenciais/topologia sensível.

**OPS-09 — Tornar a observabilidade implantável e conectar métricas, logs e alertas — P2 / Média.** Lacuna confirmada no repo. Prometheus aponta app:3000/api/metrics, mas inventário app/api não contém essa rota; não há scrape dos serviços de domínio. Compose sobe Loki/Grafana, porém não define agente de envio nem provisioning; deploy só sincroniza compose/script, apesar de montar ./observability/prometheus.yml. Fontes: [Prometheus:5](../../observability/prometheus.yml#L5), [rotas app](../../app/api), [compose produção:153](../../docker-compose.production.yml#L153), [workflow:307](../../.github/workflows/deploy-production.yml#L307), [workflow:346](../../.github/workflows/deploy-production.yml#L346). Proposta: implementar endpoints métricos e scrape por serviço; versionar collector/datasources/dashboards/regras e sincronizar assets no deploy; propagação de request ID e logs sem segredos. Aceite: ambiente vazio recebe toda a configuração; cada target esperado UP; erro de teste rastreável app→gateway→serviço; indisponibilidade gera alerta em destino configurado. Configuração manual existente não foi consultada, portanto não afirmar que Grafana real está vazio.

### Inferences
- Configuração versionada incompleta pode ser compensada manualmente na VPS, mas não é reproduzível pelo fluxo atual.

### Gaps
- Não medi disponibilidade real, latência ou estado atual dos targets. Comparado ao backlog fornecido (56 cards), esses itens são novos: nenhum repete tenant anexos, permissões funcionais ou correções do SDD. Esta entrega é somente notas/cards propostos, sem alteração de produto ou necessidade de bump de versão.
