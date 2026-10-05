# Fase 8 — validação

Entrega MINOR 1.15.0 → 1.16.0, encadeada sobre a PR da fase 7. 8.1 e 8.3 implementados; 8.2 e 8.4 já entregues permanecem cobertos pela suite MCP. Sem merge/deploy de produção.

- MCP: 184 testes aprovados em 11 arquivos; build TypeScript aprovado.
- Raiz: 1798 testes aprovados, 77 ignorados por configuração em 183 arquivos aprovados/7 ignorados. Após essa execução, teste adicional HTTP upstream real aprovado (o arquivo enviado chega com bytes idênticos). Arquivo de upload tem oito testes aprovados na configuração raiz.
- Typecheck da aplicação e ESLint de fontes sem erros. Build local dos serviços gera `dist`, que foi excluído da execução local de lint (artefato ignorado pelo Git, ausente no checkout limpo do CI); nenhuma regra de fonte dispensada.
- Instalação `--frozen-lockfile --ignore-scripts` aprovada no workspace e no pacote independente MCP; os dois lockfiles incluem Busboy/tipos.
- Audit high MCP: nenhuma vulnerabilidade conhecida. Audit raiz aprovado com baseline existente de quatro moderadas e um high ignorado já coberto por patch/exceção anterior; nenhuma exceção nova.
- Compose de produção validado com digests/configurações sintéticos e arquivo .env temporário vazio, removido após `config --quiet`. Não conectado à VPS.

Importação verifica simulação sem escrita, destino do tenant, preservação de cadastro/colunas, nomes normalizados, deduplicação, repetição e limiar de similaridade. Upload verifica cifragem sem PAT em claro, expiração, reinício, adulteração, reserva única concorrente, tenant/revogação, tamanho/tipo/campos extras, erro upstream sem vazamento, rate limit resistente a X-Forwarded-For forjado e transmissão real HTTP multipart.

Operação: configure MCP_UPLOAD_SECRET/MCP_PUBLIC_URL para habilitar a tool; uma réplica é obrigatória para nonce em memória. O teste usa arquivos sintéticos locais. Não houve upload em cards de produção como parte dos ensaios. Referências e restrições de retries/proxy/temporários estão no README MCP e ADR-029.

Revisão de consistência das fases: arquitetura acompanha novos contratos/configuração, ADR-029 documenta escolhas e condições para Redis/proxy confiável, e changelog/versionamento refletem uma única entrega. Evidência atualizada do CI: consultar os checks e a descrição da PR #57. O CI registra 1799 testes aprovados antes da regressão adicional do calendário; a implementação MCP tem 184 testes, imagem final smoke/Trivy aprovados e CodeQL sem o alerta novo após adotar express-rate-limit. A correção de calendário herdada da fase 6 é revalidada no novo head.
