# Registro de decisões do Operum

Este arquivo explica por que o projeto segue determinadas escolhas e quais consequências elas trazem. A descrição do sistema está em [architecture.md](architecture.md); as regras de manutenção estão no [AGENTS.md](../AGENTS.md).

Os primeiros registros foram reconstruídos da seção “Decisões de Arquitetura Notáveis” já existente em `architecture.md`. A data abaixo é a do registro, não a da aprovação original. Não representam novas aprovações nem uma auditoria completa da implementação. Motivos e alternativas ausentes das fontes são marcados explicitamente.

## Índice

| ID | Decisão | Status |
|---|---|---|
| ADR-001 | PostgreSQL compartilhado entre serviços | Existente — registro retrospectivo |
| ADR-002 | Identidade propagada pelo gateway aos serviços internos | Existente — registro retrospectivo |
| ADR-003 | Server Actions para as operações da interface | Existente — registro retrospectivo |
| ADR-004 | Dados específicos do vínculo entre usuário e projeto | Existente — registro retrospectivo |
| ADR-005 | O file-service confere o tenant consultando o sprint-service | Aceita |
| ADR-006 | Remoção de `/files/avatar` e `/files/logo` do file-service | Aceita |
| ADR-007 | URL assinada do storage gerada com o endpoint público | Aceita |
| ADR-008 | Permissões por função e ajustes por usuário | Aceita — implementação parcial |
| ADR-009 | Custos pelo responsável persistido na transação | Implementada |
| ADR-010 | Permissões de domínio resolvidas no app para o gateway | Implementada |
| ADR-011 | Patch temporário de profundidade em braces | Implementada — revisão ao sair correção upstream |

## ADR-001 — PostgreSQL compartilhado entre serviços

- **Data do registro:** 2026-09-29.
- **Status:** existente — registro retrospectivo; aprovação original não documentada.
- **Contexto:** o Next.js e os serviços de domínio utilizam PostgreSQL, com schemas Prisma próprios e parcialmente sobrepostos. Parte das funcionalidades permanece no monolito.
- **Escolha:** compartilhar o banco entre serviços, com `public` para a maior parte dos dados e `files` para os anexos do file-service.
- **Justificativa documentada:** reduzir a complexidade operacional em relação a bancos isolados por serviço.
- **Alternativas:** a documentação contrapõe database-per-service ao banco compartilhado; não registra uma avaliação detalhada nem critérios de aprovação da alternativa.
- **Consequências:** existe acoplamento de schema entre serviços. Migrations e alterações de tabelas precisam considerar todos os consumidores. Ter schemas Prisma separados não significa isolamento de banco ou de tenant.
- **Condição de revisão sugerida:** necessidade de independência de deploy, escala ou isolamento que o banco compartilhado não atenda. Não constitui compromisso de migração.
- **Referências:** [estratégia de banco](architecture.md#banco-de-dados--estratégia-multi-schema), [funcionalidades ainda no monolito](architecture.md#migração-incompleta--o-que-ainda-é-monolito), [schema do app](../prisma/schema.prisma), [schema do file-service](../file-service/prisma/schema.prisma).

## ADR-002 — Identidade propagada pelo gateway aos serviços internos

- **Data do registro:** 2026-09-29.
- **Status:** existente — registro retrospectivo; aprovação original não documentada.
- **Contexto:** o gateway autentica as chamadas e encaminha requisições aos serviços de domínio na rede interna.
- **Escolha:** transmitir a identidade por `x-user-id`, `x-tenant-id` e `x-user-role`, com proteção por `INTERNAL_API_KEY` e isolamento de rede, em vez de revalidar o JWT em cada serviço.
- **Justificativa documentada:** simplicidade e desempenho, com menor defesa em profundidade do que a revalidação independente.
- **Alternativas:** revalidação criptográfica do JWT em cada serviço é citada como contraste; a avaliação original detalhada não foi registrada.
- **Consequências:** a confiança depende da proteção do gateway, dos headers e do segredo interno. Identidade autenticada não substitui a autorização de acesso a cada recurso e tenant.
- **Pendência conhecida (atualizada em 2026-09-30):** a falta de conferência de tenant nos anexos do file-service (SDD 4.1) foi corrigida na PR #33. Ver [ADR-005](#adr-005--o-file-service-confere-o-tenant-consultando-o-sprint-service). Os demais serviços continuam confiando nos headers do gateway, como descrito acima.
- **Condição de revisão sugerida:** mudança nas fronteiras de rede ou exposição de serviços, ou necessidade de autenticação independente entre serviços.
- **Referências:** [arquitetura de serviços](architecture.md#arquitetura-de-serviços), [middleware de autenticação](../api-gateway/src/middleware/auth.ts), [SDD, item 4.1](specs/SDD-backlog-operum-2026-09.md).

## ADR-003 — Server Actions para as operações da interface

- **Data do registro:** 2026-09-29.
- **Status:** existente — registro retrospectivo; aprovação original não documentada.
- **Contexto:** a interface usa Next.js App Router e precisa executar operações no servidor.
- **Escolha:** componentes chamam Server Actions; as operações extraídas usam o gateway por `lib/api-client.ts`, enquanto funcionalidades legadas ainda usam services com Prisma direto.
- **Justificativa documentada:** evitar uma camada REST adicional entre o componente e o código de servidor da aplicação.
- **Alternativas:** API REST consumida diretamente pelo cliente é citada no documento; os critérios históricos completos não estão registrados.
- **Consequências:** existem dois caminhos de persistência durante a migração. A documentação deve explicitar qual caminho cada funcionalidade utiliza. Autorização e validação continuam necessárias nas operações do servidor.
- **Condição de revisão sugerida:** um consumidor externo precisar do mesmo contrato ou uma funcionalidade migrar de responsabilidade entre app e serviço.
- **Referências:** [fluxos de dados](architecture.md#fluxo-de-dados), [actions](../app/actions), [cliente de API](../lib/api-client.ts), [services](../services).

## ADR-004 — Dados específicos do vínculo entre usuário e projeto

- **Data do registro:** 2026-09-29.
- **Status:** existente — registro retrospectivo; aprovação original não documentada.
- **Contexto:** cargo, departamento, remuneração e situação do vínculo podem variar entre projetos para a mesma pessoa.
- **Escolha:** manter os dados específicos do projeto no vínculo `UsuarioProjeto` / modelo `UserProject`, em vez de tratá-los como atributos globais de `User`.
- **Justificativa documentada:** representar dados que variam por projeto. Não há registro da discussão original de alternativas.
- **Alternativas:** armazenar os dados em `User` é o contraste explicitado na arquitetura; não há evidência de outras opções avaliadas.
- **Consequências:** consultas e telas que mostram dados do membro em um projeto precisam considerar o vínculo. Identidade global e configuração por projeto têm responsabilidades distintas.
- **Condição de revisão sugerida:** alteração nas regras de cargos, remuneração ou permissões por projeto, incluindo a fase 5 do SDD.
- **Referências:** [schema do app](../prisma/schema.prisma), [decisões resumidas](architecture.md#decisões-de-arquitetura-notáveis), [SDD, fases 3 e 5](specs/SDD-backlog-operum-2026-09.md).

## ADR-005 — O file-service confere o tenant consultando o sprint-service

- **Data do registro:** 2026-09-30.
- **Status:** aceita. Implementada na PR #33, com merge em 2026-09-30.
- **Contexto:** o gateway repassa `/files/*` a qualquer JWT ou PAT válido, com `x-user-id` e `x-tenant-id` ([ADR-002](#adr-002--identidade-propagada-pelo-gateway-aos-serviços-internos)). O file-service não conhece cards nem tenants: a tabela `files."Attachment"` guarda só o `cardId`. Por isso, confiava que o chamador já tinha conferido o dono. Pelo gateway, com o id de um card ou anexo de outro tenant, dava para anexar, listar, renomear, trocar a capa, baixar e excluir.
- **Escolha:**
  - toda rota do file-service exige `x-tenant-id`;
  - antes de qualquer operação, o card é conferido no sprint-service por `POST /cards/in-tenant { ids }`, com a chave interna, que devolve só os ids do tenant;
  - nas rotas por anexo, vale o card do próprio anexo; com `cardId` informado, o anexo precisa ser desse card;
  - falha fechada (503) se o sprint-service não responder;
  - cache em memória de 30 s, só para respostas positivas.
- **Justificativa:** o sprint-service já é o dono da regra "card pertence ao tenant" (`cardInTenant`). Consultá-lo mantém a regra num lugar só e respeita a fronteira entre serviços. Uma rota em lote atende o `by-cards` com uma chamada.
- **Alternativas consideradas:**
  - *Consultar `public."Card"` direto pelo banco compartilhado:* acoplaria o file-service ao schema do sprint-service ([ADR-001](#adr-001--postgresql-compartilhado-entre-serviços)).
  - *Conferir só no app e no MCP:* deixaria o gateway aberto para quem chama `/files/*` direto.
- **Consequências:**
  - o file-service passa a depender do sprint-service para operar;
  - cada operação ganha uma chamada interna, amortizada pelo cache;
  - anexo cujo card foi excluído deixa de ser acessível.
- **Condições de revisão:** se o `Attachment` passar a guardar o `tenantId`, a conferência pode ser local.
- **Referências:** [SDD 4.1](specs/SDD-backlog-operum-2026-09.md), commit `398a26fa`, PR #33, `file-service/src/upload/card-scope.ts`, `sprint-service/src/card/card.controller.ts`.

## ADR-006 — Remoção de `/files/avatar` e `/files/logo` do file-service

- **Data do registro:** 2026-09-30.
- **Status:** aceita. Implementada na PR #33, com merge em 2026-09-30.
- **Contexto:** as duas rotas estavam expostas pelo gateway e não tinham nenhum chamador no repositório. O app grava avatar e logo direto no MinIO (`uploadAvatarAction`). `/files/logo` não conferia o dono do projeto ou stakeholder, e a chave era previsível (`logos/<tipo>s/<id>.<ext>`): outro tenant podia sobrescrever o arquivo.
- **Escolha:** remover as duas rotas e os métodos correspondentes do file-service.
- **Justificativa:** rota sem uso e sem conferência de dono é só superfície de ataque. Remover é mais seguro que proteger algo que ninguém usa.
- **Alternativas consideradas:** manter as rotas e conferir o dono no project-service. Foi descartada por não haver uso que justificasse o custo.
- **Consequências:** avatar e logo continuam só pelo app. Um cliente externo que dependesse dessas rotas deixaria de funcionar; nenhum foi encontrado no repositório.
- **Condições de revisão:** mover o upload de avatar e logo para o file-service, com conferência de dono.
- **Referências:** [SDD 4.1](specs/SDD-backlog-operum-2026-09.md), commit `398a26fa`, PR #33.

## ADR-007 — URL assinada do storage gerada com o endpoint público

- **Data do registro:** 2026-09-30.
- **Status:** aceita. Implementada na PR #33, com merge em 2026-09-30.
- **Contexto:** o file-service assinava as URLs de download com o mesmo `S3Client` do upload, cujo endpoint é o interno (`http://minio:9000`), que só existe dentro do Docker. A assinatura SigV4 inclui o host, então trocar o host depois de assinar invalida a URL. Em produção, anexo de arquivo não abria, e a rota de miniatura do app recusava o host interno.
- **Escolha:**
  - um segundo `S3Client`, só para assinar (sem chamada de rede), com `MINIO_PUBLIC_URL`;
  - upload, exclusão e leitura continuam pelo cliente interno;
  - no app, o anexo é um link para `/api/files/:id/download`, que confere a sessão e responde 302 para a URL assinada.
- **Justificativa:** o navegador precisa de uma URL no host público. Assinar já com esse host resolve sem proxy de arquivo pelo app.
- **Alternativas consideradas:**
  - *Trocar o host depois de assinar:* invalida a assinatura.
  - *O app servir o arquivo como proxy:* gasta banda e memória do container do app, principalmente com vídeos de até 50 MB.
- **Consequências:** o proxy de miniatura (`/api/files/:id/image`) busca a URL pública a partir do servidor. Se o container do app não alcançar o host público, as miniaturas falham, e seria preciso uma assinatura interna só para esse uso.
- **Condições de revisão:** mudança do storage ou do domínio público; falha de alcance do host público a partir dos containers.
- **Referências:** [SDD 4.2](specs/SDD-backlog-operum-2026-09.md), commit `488eb3f3`, PR #33, `file-service/src/minio/minio.service.ts`, `app/api/files/[attachmentId]/download/route.ts`.

## Como registrar a próxima decisão

Usar o próximo ID disponível, acrescentar ao índice e preencher:

- **Título e ID:** ADR-NNN — escolha descrita de forma concreta.
- **Data do registro:** AAAA-MM-DD; data da aprovação separada, apenas se conhecida.
- **Status:** proposta, aceita, rejeitada ou substituída; registros históricos podem usar “existente — registro retrospectivo”.
- **Contexto:** problema, restrições e requisitos que motivaram a escolha.
- **Escolha:** o que foi decidido e seu alcance.
- **Justificativa:** por que essa opção atende ao contexto.
- **Alternativas consideradas:** opções realmente avaliadas e motivos de descarte; marcar ausência de evidência quando necessário.
- **Consequências:** benefícios, custos, limitações e pendências.
- **Condições de revisão:** quando reconsiderar, se conhecidas.
- **Referências:** código, SDD, PRs, commits e decisões relacionadas.

Ao substituir uma decisão, manter o texto histórico, alterar seu status e ligar os dois registros. Não confundir uma proposta com algo já implementado.


## ADR-008 — Permissões por função e ajustes por usuário

- **Data do registro:** 2026-09-30.
- **Status:** aceita conforme decisões do usuário registradas nos commits `12d427e0` e `ef7f1bbb`; implementação parcial. Registro retrospectivo dessas decisões, sem inferir participantes ou aprovação adicional.
- **Contexto:** a autorização binária por admin/gerente não atende à concessão ou restrição de acessos individuais pedida no SDD 5.1.
- **Escolha:** matriz global por função, função-base de membro e ajustes GRANT/DENY por usuário, globais ou no projeto. Somar os cargos `UserProject.role` normalizados e o papel de `UserProjectRole`; aplicar ajustes globais e depois os do projeto. Só admin configura; admin mantém acesso total, não membros ativos não ganham acesso por ajuste. Tech Lead/PO começam com a base do membro.
- **Justificativa:** representar os cargos visíveis em Stakeholders e permitir exceções individuais sem criar uma função para cada pessoa, conforme o pedido registrado. A marca `permissoesDefinidasEm` distingue ausência de configuração de uma matriz vazia deliberada.
- **Alternativas consideradas no SDD:** usar somente `UserProjectRole` como fonte das funções; oferecer padrões privilegiados para Tech Lead e PO. O histórico registra a escolha dos cargos e ausência desses privilégios; não documenta uma avaliação adicional das alternativas.
- **Consequências:** exige migration, auditoria, isolamento de tenant e aplicação consistente nos consumidores. Configurar uma permissão não basta para proteger uma operação que ainda usa o teste antigo. UI de configuração, núcleo, services e actions estão implementados. Atualização de estado em 03/10/2026: adoção nos consumidores registrada na ADR-010; planilha por responsável registrada na ADR-009; fluxo documental pendente (5.2) permanece em desenvolvimento.
- **Condição de revisão:** conclusão da fase 5 e extensão do contrato de autorização às APIs/MCP; mudança da fonte de cargos ou das regras de associação a projetos.
- **Referências:** [catálogo e resolvedor](../lib/permissoes.ts), [autorização](../services/authz.ts), [serviço](../services/permissoesService.ts), [actions](../app/actions/permissoes.ts), [SDD 5.1](specs/SDD-backlog-operum-2026-09.md#51-modelo-de-permissões-funções--ajuste-por-usuário); commits `12d427e0` e `ef7f1bbb`.

## ADR-009 — Validar custos pelo responsável persistido na transação

- **Data do registro:** 01/10/2026.
- **Status:** implementada localmente na continuação do SDD 5.3; sem validação em produção.
- **Contexto:** um membro pode editar realizado das próprias linhas. O mesmo patch de propriedades também permite orçamento e troca de responsável; confiar no responsável enviado pelo cliente permitiria contornar o controle.
- **Escolha:** exigir contexto de autorização no serviço, separar permissões por campo e ler o responsável persistido após bloquear a linha por ID/projeto/tenant com `FOR UPDATE`. Persistência e auditoria usam a mesma transação. Exportação segue as permissões de leitura da página.
- **Justificativa:** a identidade da linha deve ser conferida no servidor, e uma troca concorrente de responsável deve ser serializada com a edição do realizado. Erro na auditoria não deve produzir edição confirmada sem registro.
- **Alternativas consideradas nesta continuação:** apenas bloquear inputs (insuficiente para chamadas diretas); validar o ID enviado junto ao patch (permite autoatribuição); validar antes da transação (permite corrida com troca de responsável); registrar auditoria depois do commit (pode confirmar apenas parte da operação).
- **Consequências:** a edição aguarda outras gravações na mesma linha; falha de permissão ou auditoria aborta a transação. Permissão de orçamento não implica realizado, nem o inverso. Substituição da árvore e importação exigem edição de ambos para não contornar o controle por campo.
- **Condição de revisão:** revisar a serialização se a planilha migrar de JSON de `WbsNode` para um modelo próprio ou se houver gravações em outro serviço.
- **Referências:** `lib/permissoesCustos.ts`, `services/wbsService.ts` (`updateNodeProperties`), `app/actions/wbs.ts`, `app/api/projetos/[projetoId]/planilha-custos/export/route.ts`, `__tests__/unit/services/wbsCustosPermissions.test.ts`, SDD 5.3 e ADR-008.


## ADR-010 — Resolver permissões de domínio no app para o gateway

- **Data do registro:** 03/10/2026.
- **Status:** implementada nesta entrega do SDD 5.1; sem validação em produção.
- **Contexto:** matriz e ajustes de usuário estão persistidos no schema do app, mas API/MCP usam gateway e microsserviços. Guardas por admin/gerente não refletiam concessões/negações configuradas e duplicar o resolvedor permitiria divergências.
- **Escolha:** gateway consulta o app por endpoint com chave interna; o app obtém identidade ativa e papel no banco e aplica o resolvedor existente. Headers confiáveis transportam escopo de listagens e ocultação documental; cada operação é reavaliada, com 403 para negação e 503 para indisponibilidade. App usa o mesmo resolvedor em páginas, actions e controles de UI.
- **Justificativa:** manter uma fonte de decisão para UI, actions e API/MCP sem espalhar o modelo de permissões por todos os serviços. Cargos/papel de gerente afetam concessões e só podem ser atribuídos pelo administrador; gestão de equipe não deve permitir autoelevação.
- **Alternativas consideradas nesta implementação:** somente controles visuais (permite chamadas diretas); duplicar resolução em cada serviço (aumenta divergência de contratos); cachear concessões no gateway (atrasa revogações e requer invalidação distribuída).
- **Consequências:** operações de domínio dependem da disponibilidade do app e acrescentam uma consulta interna; timeout é de 10 segundos e falha fechado. Multipart é preservado; JSON precisa ser reposto no proxy. Escopo vazio deve continuar sendo filtro explícito. Catálogos globais são administrados pelo admin; associações de projeto usam `cadastros:gerenciar`. Edição de stakeholder compartilhado exige gestão de equipe em todos os projetos ativos afetados. A ponte documental protege conteúdo publicado com edição/aprovação, até a implementação de snapshots pendentes em 5.2.
- **Condições de revisão:** extração do resolvedor para serviço próprio, custo das consultas em instituições grandes, mudanças nas APIs ou conclusão do fluxo documental 5.2. Sessões/Redis e demais correções de infraestrutura da fase 11 continuam fora desta entrega.
- **Referências:** `services/apiAuthorization.ts`, `services/authz.ts`, `services/projectAccess.ts`, `app/api/internal/authorize/route.ts`, `api-gateway/src/middleware/authorization.ts`, `components/permissoes/ProjectPermissions.tsx`, testes `apiAuthorization.test.ts` e `authorization.test.ts`; SDD 5.1, ADR-008 e ADR-009.

## ADR-011 — Mitigar profundidade de braces enquanto não há correção publicada

- **Data do registro:** 2026-10-03.
- **Status:** implementada nesta PR; sem validação em produção.
- **Contexto:** GHSA-vfj7-8cjw-p6xm afeta `braces <=3.0.3`, transitivo do lint e do proxy. Na consulta ao registro e ao advisory em 03/10/2026, não havia versão corrigida. O audit bloqueia o CI mesmo após corrigir Next.js.
- **Escolha:** aplicar patch pnpm em parse e percursos recursivos de compile/expand/stringify, limitando a profundidade a 128, incluindo AST fornecida diretamente. Registrar somente esse GHSA na exceção do audit enquanto o patch estiver ativo. Espelhar o patch no gateway isolado e copiá-lo nos estágios Docker antes da instalação congelada.
- **Justificativa:** rejeitar entradas excessivamente aninhadas antes de esgotar a pilha, mantendo globs usuais e uma mudança de dependência rastreável por hash. O audit consulta a versão publicada e não inspeciona correções locais. Testes carregam os consumidores reais para impedir que a exceção mascare ausência do patch.
- **Alternativas consideradas:** atualizar braces (não existe versão corrigida); atualizar o proxy (a versão atual continua usando micromatch/braces); ignorar sem mitigação ou todos os alertas sem correção (não protege o código e amplia a exceção).
- **Consequências:** globs extremamente aninhados passam a lançar `SyntaxError`; há manutenção temporária de patch em duas instalações. Quatro alertas moderados permanecem fora do limiar high do CI. A exceção não se estende a outros advisories.
- **Condição de revisão:** verificar correção upstream em atualizações de dependências; quando disponível, atualizar, remover patches/exceção e repetir testes/audit/instalação congelada. Novos advisories sobre AST/globs exigem reavaliação.
- **Referências:** [advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [pnpm patch](https://pnpm.io/cli/patch), [audit](https://pnpm.io/cli/audit), `patches/braces@3.0.3.patch`, `api-gateway/patches/braces@3.0.3.patch`, `__tests__/unit/security/bracesPatch.test.ts`, Dockerfiles e lockfiles.
