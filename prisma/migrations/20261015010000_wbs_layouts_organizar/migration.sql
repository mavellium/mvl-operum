-- Menu Organizar da EAP com os 6 layouts dos ícones do usuário (15/10). "Abaixo" foi
-- removido a pedido; "Abaixo com L" é substituído por "Direita", o layout equivalente.
-- O tipo é recriado porque o PostgreSQL não remove valores de um enum.
ALTER TYPE "WbsLayoutOrientation" RENAME TO "WbsLayoutOrientation_old";
CREATE TYPE "WbsLayoutOrientation" AS ENUM ('LADO_A_LADO', 'DIREITA', 'ESQUERDA', 'HORIZONTAL', 'HORIZONTAL_TOPO', 'HORIZONTAL_BASE');
ALTER TABLE "WbsNode" ALTER COLUMN "layout" DROP DEFAULT;
ALTER TABLE "WbsNode" ALTER COLUMN "layout" TYPE "WbsLayoutOrientation"
  USING (CASE "layout"::text WHEN 'LADO_A_LADO' THEN 'LADO_A_LADO' ELSE 'DIREITA' END)::"WbsLayoutOrientation";
ALTER TABLE "WbsNode" ALTER COLUMN "layout" SET DEFAULT 'LADO_A_LADO';
DROP TYPE "WbsLayoutOrientation_old";
