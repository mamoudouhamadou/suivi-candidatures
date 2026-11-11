-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Statut" AS ENUM ('a_envoyer', 'envoyee', 'entrevue', 'offre', 'refusee');

-- CreateTable
CREATE TABLE "Candidature" (
    "id" SERIAL NOT NULL,
    "entreprise" TEXT NOT NULL,
    "poste" TEXT NOT NULL,
    "statut" "Statut" NOT NULL DEFAULT 'a_envoyer',
    "dateEnvoi" DATE,
    "lien" TEXT,
    "notes" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Candidature_statut_idx" ON "Candidature"("statut");
