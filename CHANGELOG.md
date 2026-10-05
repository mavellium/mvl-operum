# Changelog

Versionamento semântico (`MAJOR.MINOR.PATCH`). A versão exibida na UI (rodapé da
sidebar e `/sobre`) vem de `package.json` → `NEXT_PUBLIC_APP_VERSION` em `next.config.ts`.

As versões até 1.6.0 foram reconstruídas retroativamente a partir do histórico do git:
1.0.0 marca a entrada em produção na arquitetura de microsserviços, e cada marco de
funcionalidade depois disso é uma versão MINOR.

## [1.14.0] - 2026-10-04

### Adicionado
- EAP com modos Chart View Details e Hours and Cost View; custos orçados e reais usam taxas individuais dos elaboradores e respeitam `planilha:ver`.
- Gantt somente leitura com hierarquia expansível, linha de hoje e zoom dia/semana/mês, disponível por `?view=gantt`.

### Corrigido
- Geometria vertical e mista da EAP evita sobreposição entre subárvores de larguras diferentes e acomoda cartões detalhados.
- Acesso somente leitura não inicializa nem permite renomear a EAP.

## [Não lançado]

## [1.13.2] — 2026-10-04
- **Sessões (SDD 11.1):** revogação verificada no auth-service por gateway e operações locais do Next; indisponibilidade bloqueia acesso e login/logout exigem confirmação da persistência.
- **Redis (SDD 11.2):** sessões, fila e cache isolados; fila mantém host/volume original e noeviction, sessões migram para instância própria e exigem novo login na transição.
- **Deploy (SDD 11.3–11.5):** manifesto de digests aprovado após validação de todos os serviços/imagens, migration e app com a mesma imagem e rollback por release condicionado à compatibilidade de schema.
- **Recuperação (SDD 11.6):** scripts de backup criptografado fora da VPS, restore em diretório isolado e ensaio com PostgreSQL/MinIO sintéticos; rotina existente da VPS ainda não confirmada.
- **Operação (SDD 11.7–11.8):** liveness independente, readiness limitada, métricas privadas, logs com request ID, Grafana provisionado, collector restrito e alertas configuráveis; sem deploy nesta entrega.

## [1.13.1] — 2026-10-04
- **Kanban (SDD 10.1–10.2):** alterações são aplicadas após confirmação, com erro e retry independentes; formulário permanece aberto em falhas, impede envio duplo e retoma anexos/responsáveis do card já criado sem duplicar a tarefa.
- **Timers (SDD 10.3):** minicard e modal compartilham estado confirmado; falhas e timeout geram reconciliação ou estado desconhecido explícito, sem descartar o timer antes da parada confirmada.
- **Termo de Abertura (SDD 10.4):** autosave serializado com feedback e flush antes de versionar; saída com pendências é protegida e cópia local na mesma aba permite recuperar alterações não confirmadas por autor/projeto.
- **Acessibilidade (SDD 10.5–10.7):** abertura de tarefas por botão, sidebar recolhida sem foco, overlays com contenção/restauração de foco, títulos únicos e Escape somente no superior.
- **Celular (SDD 10.8):** menu lateral sobreposto, conteúdo com largura disponível e navegação documental adaptada; prévia A4 mantém rolagem própria. Validação visual em 360/390/768 px, rotação e largura equivalente a zoom de 200%.

## [1.13.0] — 2026-10-04
- **Tarefas (SDD 9.6):** novo endpoint paginado com filtros no sprint-service; MCP lista tarefas sem varrer todas as sprints do projeto, incluindo cards cujo projeto vem da sprint.
- **Paginação:** cursor por criação e ID, com limite inicial de travessia e vínculo ao tenant/filtros; tags e responsáveis somente da página, anexos buscados exclusivamente dos IDs retornados.
- **Quadro:** UI e MCP pedem resumo dos tempos encerrados e timers ativos, reduzindo o payload. Histórico completo continua disponível nas rotas de detalhe e no modo anterior do quadro.
- **Banco e validação:** índices parciais para backlog/sprint; testes PostgreSQL e HTTP reais, travessia concorrente, isolamento e medições de consultas, bytes e latência.

## [1.12.5] — 2026-10-04
- **Dashboards (SDD 9.5):** rotas global e por sprint restauradas, com KPIs, ranking, cards atrasados, colunas e feedbacks agregados no sprint-service.
- **Contratos e acesso:** respostas validadas pelo serviço e pelo cliente; consultas limitadas ao tenant e aos projetos com leitura de quadro e custos. Dados vazios retornam zeros/listas vazias, sem ocultar erros de contrato ou permissão.
- **Validação integrada:** testes reais de action → gateway → controller → PostgreSQL, incluindo dados, isolamento, revogação de permissão e cabeçalhos de escopo forjados.

## [1.12.4] — 2026-10-04
- **Macrofases (SDD 9.4):** validação do lote antes da escrita e substituição atômica junto dos dados do projeto, preservando o lote anterior quando há falha.
- **EAP:** pendência de sincronização persistente e retry da última revisão salva. Sincronização, códigos, versão e auditoria compartilham uma transação; tentativas repetidas não duplicam fases e preservam atividades existentes.
- **Recuperação:** formulário mostra macrofases pendentes e permite tentar sincronizar novamente com as permissões de projeto e custos verificadas no servidor.

## [1.12.3] — 2026-10-04
- **Kanban (SDD 9.3):** movimentação de card, histórico e ordenação de origem/destino passam a compartilhar uma transação. Falhas revertem todas as etapas; movimentos concorrentes reavaliam o estado antes do retry.
- **Concorrência:** reconhecimento de conflitos estruturados do adapter PostgreSQL tanto na movimentação quanto na exclusão de sprint, mantendo retries limitados. Suítes PostgreSQL executam isoladas entre arquivos; concorrência dentro dos testes permanece ativa.
- **Ordenação:** posições normalizadas no retorno, desempate estável, inserção ao final quando posição omitida e limpeza dos vínculos de sprint ao retornar ao backlog. Validação de instituição, autoria e coerência entre projeto, sprint e coluna preservada no servidor.
- **Validação:** check PostgreSQL cobre falhas em cada etapa, movimentações concorrentes e preservação de comentários/tempos.

## [1.12.2] — 2026-10-04
- **Timer (SDD 9.2):** um único timer ativo por usuário, protegido por índice parcial no banco. Inícios concorrentes retornam conflito previsível; repetir ou concorrer a parada preserva exatamente o intervalo já encerrado, sem duplicar horas.
- **Migration:** pré-verificação de duplicados ativos com aborto seguro, sem alterar automaticamente tempos históricos. Procedimento de diagnóstico e revisão documentado para o operador.
- **Validação:** check de integridade ampliado com PostgreSQL real para concorrência de start/stop, rollback, índice fora do serviço e isolamento entre usuários/instituições.

## [1.12.1] — 2026-10-04
- **Integridade (SDD 9.1):** exclusão de sprint transfere os cards ativos ao backlog do mesmo projeto e exclui logicamente a sprint em uma única transação. Cards criados apenas com sprint preservam acesso, comentários e tempos; vínculos de outro projeto impedem a exclusão. Transferência ordenada ao final do backlog e retries limitados para conflitos concorrentes.
- **Validação:** novo check com PostgreSQL real verifica transferência, rollback após falha, isolamento e exclusões concorrentes.
- **Versão:** restaura sequência SemVer após a correção Docker ter sido integrada com 1.11.1 sobre a funcionalidade 1.12.0; ambas as entregas permanecem incluídas.


## [1.12.0] — 2026-10-04
- **Documentos (SDD 5.2):** membros com permissão de edição propõem versões do Termo de Abertura, Partes Interessadas, EAP e Atas. O conteúdo aprovado permanece vigente até a aprovação da proposta; rejeições preservam a versão anterior.
- **Histórico e Registro:** versões pendentes destacadas, conteúdo preservado para revisão, autoria e logs de rascunho, submissão, aprovação, rejeição e exclusão. Rascunhos do Termo são privados por autor; versões aprovadas permanecem no histórico.
- **Segurança documental:** publicação e auditoria na mesma transação, revisão concorrente serializada por projeto, validação de árvores e participantes, isolamento por instituição/projeto e cancelamento de propostas ao excluir uma ata. Documentos legados continuam acessíveis; registros antigos sem conteúdo não podem ser aprovados como novas versões.
- **Custos (SDD 5.3):** comportamento por campo/responsável já entregue na 1.9.0 reconferido nesta entrega; realizado próprio continua restrito ao responsável persistido, independente da permissão de orçado.
- **Validação:** novo check de PR aplica migrations e testa aprovação, rollback e concorrência em PostgreSQL isolado. Sem deploy ou validação em produção nesta entrega.

## [1.11.1] — 2026-10-04
- **Docker:** inclui o `CHANGELOG.md` no contexto de build para a página `/sobre`, corrigindo a falha de prerenderização na imagem de produção. PRs passam a construir a imagem do app e verificar o histórico no output standalone antes do merge

## [1.11.0] — 2026-10-04
- **Sobre:** a página `/sobre` destaca as novidades da versão atual e permite consultar as atualizações das versões anteriores, com datas e seções expansíveis. O histórico acompanha automaticamente o changelog do projeto.

## [1.10.1] — 2026-10-04
- **Segurança/CI:** imagem final do gateway verifica o patch de `braces` antes do Trivy. Exceção de CVE-2026-93687 limitada ao caminho/hash da cópia corrigida, com expiração em 03/11/2026; outras cópias e alertas high/critical continuam bloqueando o scan.
- **Prevenção:** PRs para main/develop constroem localmente e analisam a imagem final do gateway, sem publicação ou deploy. Staging/produção usam a mesma verificação antes do scan.

## [1.10.0] — 2026-10-03
- **Permissões (SDD 5.1):** operações de projeto, equipe, sprints, cards, movimentos, comentários, timers, anexos e cadastros passam a aplicar o catálogo configurado por função e usuário. Leituras/listagens/busca ficam limitadas aos projetos autorizados; interface recebe o mesmo conjunto de permissões do servidor.
- **API/MCP:** gateway consulta autorização no app por endpoint com chave interna, obtém o papel do usuário ativo no banco e falha fechado em indisponibilidade. Headers de escopo enviados pelo cliente são descartados. Atribuir cargos/gerente e alterar catálogos globais continua exclusivo do administrador.
- **Documentos:** leitura e operações existentes aplicam as permissões documentais; GET genérico de projeto omite textos de charter sem `documentos:ver`. Alterar conteúdo publicado exige edição e aprovação enquanto o fluxo de revisões pendentes do item 5.2 não for entregue.
- **Segurança (dependências):** patch local de `braces@3.0.3` limita profundidade de parsing e percursos da AST para mitigar GHSA-vfj7-8cjw-p6xm, ainda sem correção publicada. Exceção específica no audit acompanha o patch, testes e instalação Docker; deve ser removida quando houver correção upstream.
- **CI:** auditoria de dependências agora executa nas PRs para main/develop, verificando instalação congelada e patch efetivo no workspace/gateway. Deploys usam a versão pnpm declarada no `packageManager`, sem pin divergente.
- **Segurança (avatar/logo):** URLs exibidas e abertas no navegador são validadas como http(s) ou caminho local; HTML, esquemas executáveis e caminhos ambíguos usam fallback. CodeQL da configuração de produção também roda nas PRs, com build/deploy explicitamente bloqueados nesse evento.
- **Limites:** 5.2 segue pendente, sem novas migrations de revisão documental; esta entrega não inclui validação em produção ou deploy.

## [1.9.1] — 2026-10-01
- **Segurança (dependências):** Next.js 16.3.5 → 16.3.6 corrige GHSA-vcvr-r3jv-pc5j (execução remota de código no `ImageResponse` de `next/og`), que bloqueava o `pnpm audit --audit-level=high`. Lockfile e exceções de idade mínima da atualização de segurança acompanham a versão corrigida.

## [1.9.0] — 2026-10-01
- **Planilha de custos (SDD 5.3):** permissões independentes para orçado, realizado próprio e realizado de todos. A validação usa o responsável persistido, bloqueia a linha durante a gravação e salva a auditoria na mesma transação. Interface distingue campos editáveis/bloqueados; exportação exige leitura autorizada.
- **Isolamento:** administrador também precisa de projeto ativo da instituição atual para receber permissões.
- **Validação:** item 5.3 verificado localmente; autorização geral e revisão documental da fase 5 continuam em desenvolvimento. Sem validação em produção.

## [1.8.0] — 2026-09-30
- **Permissões (SDD 5.1, configuração):** administrador configura a matriz por função, restaura padrões e concede/nega permissões por usuário, globalmente ou no projeto. Editores disponíveis em Cadastros → Funções, Usuários → Permissões e Stakeholders → Permissões neste projeto, com feedback de gravação e preservação do estado em falhas.
- **Modelo de autorização:** catálogo e resolução por base de membro, união de funções e ajustes globais/de projeto; tabelas e migration do núcleo incluídas nesta branch. Tech Lead e PO seguem a base do membro até configuração explícita.
- **Isolamento:** leitura de ajustes por usuário também exige projeto da instituição atual.
- **Limite desta entrega:** a adoção do resolvedor nas operações existentes é incremental e permanece pendente; documentos com aprovação (5.2) e realizado da planilha por responsável (5.3) ainda não estão concluídos.
- **Planejamento:** SDD inclui os 23 novos cards da avaliação geral, com IDs, evidências, critérios de aceite e dependências, nas fases 9–11.

## [1.7.1] — 2026-09-30
- **Segurança (dependências):** o deploy da 1.7.0 parou no `pnpm audit` por dois alertas publicados no mesmo dia.
  - `brace-expansion` (GHSA-qhr7-859c-m2p7, DoS com chaves aninhadas): overrides para 1.1.20+, 2.1.6+ e 5.0.11+, sem trocar de versão principal, na raiz e nos lockfiles dos cinco serviços.
  - `nodemailer` 9 → 10 no auth-service (GHSA-v53p-9fqp-m79j, ReDoS no parser de endereços): a única quebra da 10 é exigir Node 20, e as imagens usam Node 22.

## [1.7.0] — 2026-09-30

### Fase 4 do backlog
- **Segurança:** o file-service passa a conferir a instituição (tenant) do card antes de anexar, listar, renomear, trocar a capa, abrir ou excluir anexos. Antes, com o id de um card ou anexo de outra instituição, dava para mexer nele pelo gateway. As rotas `/files/avatar` e `/files/logo`, expostas e sem uso, foram removidas. Marcar a capa pelo app passou a conferir o card.
- **Anexos:** o arquivo abre no primeiro clique. A URL assinada usava o host interno do storage (`minio:9000`); agora usa o público. Imagem abre num lightbox no card, e `/arquivos` baixa pela mesma rota. O `operum_get_task` do MCP devolve `download_url`.
- **Busca:** clicar num card abre o card mesmo com a sprint já aberta.
- **Stakeholders:** o cadastro novo já abre em edição. A criação de membro traz cargos, departamento, remuneração, horas e gerente, e o externo criado pelo "Adicionar ao projeto" já fica no projeto. Horas por dia aceitam "8,5", "8.5" e "8:30", entre 0 e 24, e o servidor recusa valor inválido.
- **Senhas:** botão para mostrar e ocultar a senha em todos os campos de senha.
- **Planilha de custos:** sub-total e TOTAL GERAL alinhados à direita no `.xlsx`.
- **Interface:** campos sem `type` (como o de renomear anexo) ficavam ilegíveis com o sistema em modo escuro. Foi removido o modo escuro do template.

### Já em produção antes desta versão, sem registro (28 e 29/09; registro retroativo)
- **MCP:**
  - um servidor para todos os tenants do usuário (`X-Operum-Tokens`), com saída JSON, CRUD de projetos, sprints, colunas, tarefas, etiquetas e comentários, e migração de projetos entre tenants (`operum_copy_project`);
  - erros do Operum chegam ao agente com status e tool;
  - anexar arquivo ou link e excluir anexo (PR #27);
  - iniciar, parar e lançar o tempo das tarefas (PR #29).
- **Segurança:** escopo de tenant em todas as rotas do sprint-service. PAT restrito a leituras de identidade em `/auth/*`. Rotas de papéis, stakeholders e membros do project-service validadas por tenant.
- **Deploy:** por SSH, sincronizando os `docker-compose*.yml`, rodando as migrations do app antes de subir e esperando o health dos serviços.
- **Anexos:** corrigida a "Falha ao registrar o anexo" (colunas de `files.Attachment`). Aceita vídeos, PowerPoint, OpenDocument, TXT, CSV e ZIP, até 50 MB (PR #26). Anexo do tipo link, com miniatura do YouTube (PR #27).
- **Card:** a descrição salva sozinha, e o prazo (início e entrega) pode ser editado e removido, com selo colorido no quadro. Há filtros "vence esta semana" e "atrasados".
- **Kanban:**
  - prioridade sempre visível no minicard;
  - posições renumeradas ao arrastar;
  - busca unificada (sprint atual, outras sprints, backlog, projetos e pessoas);
  - dashboard da sprint com o menu do projeto.
- **Cadastros:**
  - funções sem duplicata e catálogo global nos stakeholders;
  - ranking com a função no projeto;
  - "Tenants" passa a se chamar "Instituições";
  - stakeholders adicionados pela barra de pesquisa;
  - o documento EAP explica a falha em vez de "Erro interno".
- **Sessão:** expira após 30 min sem uso e ao fechar o navegador; o login volta para a página de origem.

## [1.6.2] — 2026-09-29
- Corrige a inicialização dos serviços em imagens de produção: `dotenv`, importado em runtime, passa de dependência de desenvolvimento para dependência de execução nos cinco serviços NestJS. Evita `Cannot find module 'dotenv/config'` após instalação com `--prod`.

## [1.6.1] — 2026-09-27
- MCP exposto também em `https://api.operum.adm.br/mcp` (fallback enquanto `mcp.operum.adm.br` não tem DNS).
- Versão do sistema exibida no rodapé da sidebar e na página Sobre.

## [1.6.0] — 2026-09-26 — Integração MCP com Claude
- Personal Access Tokens (auth-service, validação no api-gateway, página `/perfil/tokens`).
- Servidor MCP remoto (`mcp-server`) com `operum_whoami` e `operum_list_projects`.
- Migrations do auth-service automatizadas no deploy.
- Correção de IDOR em `GET /projects/user/:userId`.

## [1.5.0] — 2026-09-21 — Documentos da EAP
- Geração de documentos da EAP e sistema de templates.
- Stakeholders, menubar da WBS e biblioteca de equipe.

## [1.4.0] — 2026-08-12 a 2026-09-02 — Sprint board e ajustes de spec
- Sprint board revisado (backlog no modal, concluído somente leitura, timer real, drag otimista).
- Cadastros globais, Atas em Documentos, planilha de custos por salário, página `/equipe`.
- Sessão inválida redireciona ao login em qualquer tela.
- Migração de domínio para `operum.adm.br`.

## [1.3.0] — 2026-06-14 — EAP/WBS
- Módulo EAP/WBS com canvas interativo.

## [1.2.0] — 2026-06-01 a 2026-06-09 — Multi-tenant
- Troca de tenant, gerenciador de tenants, provisionamento sem senha.
- Detalhe do card: histórico de movimentação, tempo com motivo obrigatório, anexos.
- Responsáveis e edição/exclusão de comentários.

## [1.1.0] — 2026-04-25 a 2026-05-09 — Documentação do projeto
- Stakeholders unificados, documentação versionada com aprovação, assinatura do gerente.
- Termo de Abertura de Projeto, rascunhos com autosave, backlog e custo por card.

## [1.0.0] — 2026-04-21 — Produção em microsserviços
- auth-service, api-gateway, file-service, project-service, sprint-service e notification-service.
- Pipeline DevSecOps com deploy via GHCR e webhook.
