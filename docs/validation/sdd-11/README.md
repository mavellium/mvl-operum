# Fase 11 — validação

Base: main `cebfd0f6`, versão 1.13.1. Entrega PATCH 1.13.2.
Nenhum merge/deploy/operação de produção executado.

Validação local em 04/10/2026:
- Suite raiz: 1773 testes aprovados, 76 ignorados por configuração existente.
- Auth-service: 108 testes aprovados; gateway: 17 aprovados.
- Build dos sete serviços aprovado; lint e typecheck da raiz aprovados.
- Audit high aprovado na raiz e nos sete pacotes. Raiz mantém 4 moderadas e
  gateway 2 moderadas; exceção existente de braces aplicado por patch não foi
  ampliada. Nenhuma nova exceção Trivy/audit.
- Simulação do deploy com Docker fixture confirma digests, rejeição de imagem
  com SHA incorreto, rollout malsucedido e rollback bloqueado por schema.
- Sintaxe shell, Node e YAML conferida. Não representa execução Docker real.

Docker local indisponível: daemon requer acesso administrativo com senha não
presente nesta sessão. CI executa imagens finais com dependências isoladas,
readiness/liveness sob queda, pressão Redis/OOM/AOF, restauração Restic com
PostgreSQL/MinIO sintéticos e observabilidade em ambiente vazio.

O ensaio de observabilidade usa endpoints métricos sintéticos para comprovar
provisioning/collector/alertas; smoke separado comprova os endpoints nas imagens
reais. O ensaio de backup usa cópia independente de repositório local criptografado
para simular perda do original; não comprova credenciais/transporte do backup real
fora da VPS. RPO/RTO reais permanecem a medir pelo operador. A rotina atual não
foi confirmada. Compatibilidade de migrations e destino real de alertas devem ser
configurados antes de uma implantação autorizada.

Resultados do CI serão acrescentados após a execução da PR.
