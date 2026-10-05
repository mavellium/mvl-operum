# Fase 7 — modelos e validação

Entrega MINOR 1.14.0 → 1.15.0; PR separada sobre a fase 6. Nenhum merge ou deploy.

## Fontes e mapeamento

- **7.1:** anexo “06 Aula GP - Formulario de Stakeholder - Exemplo.doc”, card `cmuk8z8d7001i01jw9682ytt9`. Arquivo convertido e inspecionado visualmente: paisagem, logo/título, categoria institucional, projeto, gerente, elaborador, aprovação/assinatura, versão/data e oito colunas. Telefone/Fax passa a Telefone/Celular; o campo persistido mantém seu nome para compatibilidade. Rodapé do arquivo recebido usa stakeholders.doc; o Operum usa o identificador solicitado 03_Form Stakeholders.
- **7.2:** modelo de Termo no Drive `19z9p6w36TGvOrnfLntWjeBjRr-vfQLX5` / documento `1Dg7Zjw88DbZm_ByZpyPRSYMrYWWqGplGSOu-Pm5ZLqc`, card `cmuk8zaa6001k01jw7s7fbnc0`. Texto lido integralmente; download bruto do PDF negado (403), portanto não há comparação visual com esse PDF. Implementação segue a estrutura textual: cabeçalho, justificativa, objetivos, produtos, premissas/restrições, fases numeradas/prazos/custos, envolvidos e designação do gerente. Metodologia existente preservada após as seções do modelo. Instituição/professor/patrocinador/fornecedores podem ser registrados em “Principais envolvidos”; integrantes vêm da equipe capturada.
- **7.3:** modelo `1etrrq7u-GzBvJZ2wt1QnwBj-1TPlkawG` e exemplo `1LU_WchWNSBvr86y4WZAFwN6PHIcAe5nr`, na pasta Documentação do Drive; texto integral recebido. Ambos os links anexados ao card `cmuk8zg1o001o01jwvh6ssr3x`. Cabeçalho institucional/projeto/local/data/elaboração/aprovação; presentes em duas colunas; assuntos/decisões; ações com prazo/responsável; anexos/cópias/plano/assinaturas/observações/rodapé. O documento das 11 etapas é referência de pauta, não conteúdo preenchido automaticamente. Assinaturas ficam em branco para preenchimento legítimo.
- **7.4:** formulário e documento separados; voltar mantém rascunho; história abre o snapshot da versão selecionada e mostra alterações, autor/data e condição de aprovação. Versões antigas sem contexto/diff indicam a ausência.

## Verificações

Testes de rascunho/alternância e snapshot histórico, validação de payload e serviços de Ata; XML DOCX confere orientação, largura de tabelas, seções, custo total e ações/assinaturas. Teste PostgreSQL adiciona persistência de diff/contexto e imutabilidade na aprovação; executado pelo workflow dedicado no CI, banco local não disponível.

Três DOCX gerados com dados sintéticos e renderizados via LibreOffice/Poppler. Inspeção visual dos PDFs: tabelas dentro das margens, oito colunas legíveis, valores brasileiros corretos e assinaturas vazias. PDFs sintéticos não contêm dados dos anexos de produção. Evidências e resultado da suite/CI serão atualizados após validação final.

Revisão de consistência: documentação de arquitetura/ADR-028 acompanha migration e fronteira navegador/servidor; changelog/versionamento atualizados uma única vez. Nenhuma alteração de permissões, tenant ou aprovação foi dispensada.
