import type { Candidature } from "../candidature.js";
import type { DepotCandidatures } from "./depot.js";

// Stockage dans un tableau en mémoire : rapide, sans base de données.
// Sert aux tests et au développement sans Docker. Les données disparaissent au redémarrage.
export function creerDepotMemoire(): DepotCandidatures {
  const candidatures: Candidature[] = [];
  let prochainId = 1;

  return {
    async lister() {
      return [...candidatures].reverse(); // la plus récente en premier
    },

    async trouver(id) {
      return candidatures.find((c) => c.id === id) ?? null;
    },

    async creer(donnees) {
      const maintenant = new Date().toISOString();
      const candidature: Candidature = {
        id: prochainId++,
        entreprise: donnees.entreprise,
        poste: donnees.poste,
        statut: donnees.statut,
        dateEnvoi: donnees.dateEnvoi ?? null,
        lien: donnees.lien ?? null,
        notes: donnees.notes ?? null,
        creeLe: maintenant,
        modifieLe: maintenant,
      };
      candidatures.push(candidature);
      return candidature;
    },

    async modifier(id, donnees) {
      const candidature = candidatures.find((c) => c.id === id);
      if (!candidature) return null;
      Object.assign(candidature, donnees, { modifieLe: new Date().toISOString() });
      return candidature;
    },

    async supprimer(id) {
      const index = candidatures.findIndex((c) => c.id === id);
      if (index === -1) return false;
      candidatures.splice(index, 1);
      return true;
    },
  };
}
