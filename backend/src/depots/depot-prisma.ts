import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  Prisma,
  type Candidature as LigneCandidature,
  type Utilisateur as LigneUtilisateur,
} from "../generated/prisma/client.js";
import type { Candidature } from "../candidature.js";
import type { Utilisateur } from "../utilisateur.js";
import type { DepotCandidatures, DepotUtilisateurs } from "./depot.js";

export function creerClientPrisma(urlBaseDeDonnees: string) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: urlBaseDeDonnees }) });
}

// Convertit une ligne de la base (objets Date) en objet JSON pour l'API (chaînes ISO),
// sans la clé étrangère interne utilisateurId.
function versApi({ utilisateurId: _, ...ligne }: LigneCandidature): Candidature {
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
// Le filtre { id, utilisateurId } garantit qu'on ne touche jamais aux données d'un autre utilisateur.
export function creerDepotPrisma(prisma: PrismaClient): DepotCandidatures {
  return {
    async lister(utilisateurId) {
      const lignes = await prisma.candidature.findMany({ where: { utilisateurId }, orderBy: { id: "desc" } });
      return lignes.map(versApi);
    },

    async trouver(utilisateurId, id) {
      const ligne = await prisma.candidature.findFirst({ where: { id, utilisateurId } });
      return ligne ? versApi(ligne) : null;
    },

    async creer(utilisateurId, donnees) {
      const ligne = await prisma.candidature.create({
        data: { ...donnees, dateEnvoi: versDate(donnees.dateEnvoi), utilisateurId },
      });
      return versApi(ligne);
    },

    async modifier(utilisateurId, id, donnees) {
      try {
        const ligne = await prisma.candidature.update({
          where: { id, utilisateurId },
          data: { ...donnees, dateEnvoi: versDate(donnees.dateEnvoi) },
        });
        return versApi(ligne);
      } catch (erreur) {
        if (estCode(erreur, "P2025")) return null; // P2025 = enregistrement introuvable
        throw erreur;
      }
    },

    async supprimer(utilisateurId, id) {
      try {
        await prisma.candidature.delete({ where: { id, utilisateurId } });
        return true;
      } catch (erreur) {
        if (estCode(erreur, "P2025")) return false;
        throw erreur;
      }
    },
  };
}

function versUtilisateur(ligne: LigneUtilisateur): Utilisateur {
  return { ...ligne, creeLe: ligne.creeLe.toISOString() };
}

export function creerDepotUtilisateursPrisma(prisma: PrismaClient): DepotUtilisateurs {
  return {
    async trouverParCourriel(courriel) {
      const ligne = await prisma.utilisateur.findUnique({ where: { courriel } });
      return ligne ? versUtilisateur(ligne) : null;
    },

    async trouverParId(id) {
      const ligne = await prisma.utilisateur.findUnique({ where: { id } });
      return ligne ? versUtilisateur(ligne) : null;
    },

    async creer(donnees) {
      try {
        return versUtilisateur(await prisma.utilisateur.create({ data: donnees }));
      } catch (erreur) {
        if (estCode(erreur, "P2002")) return null; // P2002 = violation de contrainte UNIQUE (courriel déjà pris)
        throw erreur;
      }
    },
  };
}

function estCode(erreur: unknown, code: string) {
  return erreur instanceof Prisma.PrismaClientKnownRequestError && erreur.code === code;
}
