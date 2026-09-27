# Changelog

Versionamento semântico (`MAJOR.MINOR.PATCH`). A versão exibida na UI (rodapé da
sidebar e `/sobre`) vem de `package.json` → `NEXT_PUBLIC_APP_VERSION` em `next.config.ts`.

As versões até 1.6.0 foram reconstruídas retroativamente a partir do histórico do git:
1.0.0 marca a entrada em produção na arquitetura de microsserviços, e cada marco de
funcionalidade depois disso é uma versão MINOR.

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
