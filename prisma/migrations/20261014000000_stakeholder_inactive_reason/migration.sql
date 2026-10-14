-- Stakeholder inativo com motivo (card "Desativar um stakeholder"). Só acrescenta
-- colunas anuláveis: linhas existentes (inclusive as já inativas) ficam sem motivo.
ALTER TABLE "Stakeholder" ADD COLUMN "inactiveReason" TEXT;
ALTER TABLE "Stakeholder" ADD COLUMN "inactivatedAt" TIMESTAMP(3);
