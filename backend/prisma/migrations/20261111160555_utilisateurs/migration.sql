/*
  Warnings:

  - Added the required column `utilisateurId` to the `Candidature` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Candidature_statut_idx";

-- AlterTable
ALTER TABLE "Candidature" ADD COLUMN     "utilisateurId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" SERIAL NOT NULL,
    "courriel" TEXT NOT NULL,
    "motDePasseHache" TEXT NOT NULL,
    "nom" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_courriel_key" ON "Utilisateur"("courriel");

-- CreateIndex
CREATE INDEX "Candidature_utilisateurId_statut_idx" ON "Candidature"("utilisateurId", "statut");

-- AddForeignKey
ALTER TABLE "Candidature" ADD CONSTRAINT "Candidature_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;
