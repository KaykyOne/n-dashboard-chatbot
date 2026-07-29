ALTER TABLE "Usuarios"
ADD COLUMN "modo_teste" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "NumerosTeste" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NumerosTeste_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NumerosTeste_cliente_id_numero_key"
ON "NumerosTeste"("cliente_id", "numero");

CREATE INDEX "NumerosTeste_cliente_id_idx"
ON "NumerosTeste"("cliente_id");

ALTER TABLE "NumerosTeste"
ADD CONSTRAINT "NumerosTeste_cliente_id_fkey"
FOREIGN KEY ("cliente_id") REFERENCES "Usuarios"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
