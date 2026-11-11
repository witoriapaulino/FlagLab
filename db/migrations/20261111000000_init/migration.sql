-- CreateEnum
CREATE TYPE "Ambiente" AS ENUM ('DEV', 'HOMOLOG', 'PROD');

-- CreateTable
CREATE TABLE "flags" (
    "id" SERIAL NOT NULL,
    "chave" VARCHAR(60) NOT NULL,
    "descricao" VARCHAR(200) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flag_versoes" (
    "id" SERIAL NOT NULL,
    "flag_id" INTEGER NOT NULL,
    "ambiente" "Ambiente" NOT NULL,
    "versao" INTEGER NOT NULL,
    "ativa" BOOLEAN NOT NULL,
    "autor" VARCHAR(80) NOT NULL,
    "motivo" VARCHAR(300) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flag_versoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "flags_chave_key" ON "flags"("chave");

-- CreateIndex
CREATE UNIQUE INDEX "flag_versoes_flag_id_ambiente_versao_key" ON "flag_versoes"("flag_id", "ambiente", "versao");

-- AddForeignKey
ALTER TABLE "flag_versoes" ADD CONSTRAINT "flag_versoes_flag_id_fkey" FOREIGN KEY ("flag_id") REFERENCES "flags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
