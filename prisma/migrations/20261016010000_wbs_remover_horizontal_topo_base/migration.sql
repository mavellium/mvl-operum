-- Menu Organizar da EAP (16/10): "Horizontal (topo)" e "Horizontal (base)" foram removidos a
-- pedido e viram "Horizontal". O tipo é recriado porque o PostgreSQL não remove valores de um enum.
ALTER TYPE "WbsLayoutOrientation" RENAME TO "WbsLayoutOrientation_old";
CREATE TYPE "WbsLayoutOrientation" AS ENUM ('LADO_A_LADO', 'DIREITA', 'ESQUERDA', 'HORIZONTAL');
ALTER TABLE "WbsNode" ALTER COLUMN "layout" DROP DEFAULT;
ALTER TABLE "WbsNode" ALTER COLUMN "layout" TYPE "WbsLayoutOrientation"
  USING (CASE "layout"::text
    WHEN 'HORIZONTAL_TOPO' THEN 'HORIZONTAL'
    WHEN 'HORIZONTAL_BASE' THEN 'HORIZONTAL'
    ELSE "layout"::text
  END)::"WbsLayoutOrientation";
ALTER TABLE "WbsNode" ALTER COLUMN "layout" SET DEFAULT 'LADO_A_LADO';
DROP TYPE "WbsLayoutOrientation_old";
