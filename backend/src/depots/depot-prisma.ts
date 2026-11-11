import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma, type Candidature as LignePrisma } from "../generated/prisma/client.js";
import type { Candidature, ModificationCandidature } from "../candidature.js";
import type { DepotCandidatures } from "./depot.js";

export function creerClientPrisma(urlBaseDeDonnees: string) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: urlBaseDeDonnees }) });
}

// Convertit une ligne de la base (objets Date) en objet JSON pour l'API (chaînes ISO).
function versApi(ligne: LignePrisma): Candidature {
  return {
    ...ligne,
    dateEnvoi: ligne.dateEnvoi ? ligne.dateEnvoi.toISOString().slice(0, 10) : null,
    creeLe: ligne.creeLe.toISOString(),
    modifieLe: ligne.modifieLe.toISOString(),
  };
}

// "2026-11-10" → Date ; null → null (efface) ; undefined → undefined (ne touche pas)
function versDate(date: string | null | undefined) {
  if (date === undefined) return undefined;
  return date === null ? null : new Date(date);
}

// Stockage dans PostgreSQL via Prisma. Prisma génère le SQL pour nous.
export function creerDepotPrisma(prisma: PrismaClient): DepotCandidatures {
  return {
    async lister() {
      const lignes = await prisma.candidature.findMany({ orderBy: { id: "desc" } });
      return lignes.map(versApi);
    },

    async trouver(id) {
      const ligne = await prisma.candidature.findUnique({ where: { id } });
      return ligne ? versApi(ligne) : null;
    },

    async creer(donnees) {
      const ligne = await prisma.candidature.create({
        data: { ...donnees, dateEnvoi: versDate(donnees.dateEnvoi) },
      });
      return versApi(ligne);
    },

    async modifier(id, donnees: ModificationCandidature) {
      try {
        const ligne = await prisma.candidature.update({
          where: { id },
          data: { ...donnees, dateEnvoi: versDate(donnees.dateEnvoi) },
        });
        return versApi(ligne);
      } catch (erreur) {
        if (estIntrouvable(erreur)) return null;
        throw erreur;
      }
    },

    async supprimer(id) {
      try {
        await prisma.candidature.delete({ where: { id } });
        return true;
      } catch (erreur) {
        if (estIntrouvable(erreur)) return false;
        throw erreur;
      }
    },
  };
}

// P2025 = code d'erreur Prisma « enregistrement introuvable »
function estIntrouvable(erreur: unknown) {
  return erreur instanceof Prisma.PrismaClientKnownRequestError && erreur.code === "P2025";
}
