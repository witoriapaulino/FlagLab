-- AlterTable
ALTER TABLE "flag_versoes" ADD COLUMN     "autor_id" INTEGER,
ADD COLUMN     "percentual" INTEGER NOT NULL DEFAULT 100;

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(80) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_token_hash_key" ON "usuarios"("token_hash");

-- AddForeignKey
ALTER TABLE "flag_versoes" ADD CONSTRAINT "flag_versoes_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
