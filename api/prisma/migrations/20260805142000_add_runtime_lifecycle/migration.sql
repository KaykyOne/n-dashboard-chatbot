ALTER TABLE "WhatsappInstances"
ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "WhatsappInstances"
SET "enabled" = true
WHERE "status" IN ('CONNECTING', 'ONLINE');

CREATE UNIQUE INDEX "WhatsappInstances_cliente_id_provider_key"
ON "WhatsappInstances"("cliente_id", "provider");
