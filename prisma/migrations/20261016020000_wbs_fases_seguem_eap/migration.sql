-- O padrão antigo do layout era ABAIXO, que a migration 20261015010000 converteu em DIREITA.
-- Desde a 1.31.0 (ADR-047), DIREITA numa fase é o formato próprio dela, que vence o formato da
-- EAP: as EAPs antigas só mudavam no Horizontal. Abaixo da raiz, todos os nós voltam a seguir a EAP.
UPDATE "WbsNode" SET "layout" = 'LADO_A_LADO'
WHERE "parentId" IS NOT NULL AND "layout" <> 'LADO_A_LADO';
