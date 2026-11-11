import type { Candidature } from "../candidature.js";
import type { Utilisateur } from "../utilisateur.js";
import type { DepotCandidatures, DepotUtilisateurs } from "./depot.js";

// Stockage dans des tableaux en mémoire : rapide, sans base de données.
// Sert aux tests et au développement sans Docker. Les données disparaissent au redémarrage.

type CandidatureStockee = Candidature & { utilisateurId: number };

// Retire le champ interne utilisateurId avant de renvoyer au client.
function versApi({ utilisateurId: _, ...candidature }: CandidatureStockee): Candidature {
  return { ...candidature };
}

export function creerDepotMemoire(): DepotCandidatures {
  const candidatures: CandidatureStockee[] = [];
  let prochainId = 1;

  const trouverStockee = (utilisateurId: number, id: number) =>
    candidatures.find((c) => c.id === id && c.utilisateurId === utilisateurId);

  return {
    async lister(utilisateurId) {
      return candidatures
        .filter((c) => c.utilisateurId === utilisateurId)
        .reverse() // la plus récente en premier
        .map(versApi);
    },

    async trouver(utilisateurId, id) {
      const c = trouverStockee(utilisateurId, id);
      return c ? versApi(c) : null;
    },

    async creer(utilisateurId, donnees) {
      const maintenant = new Date().toISOString();
      const candidature: CandidatureStockee = {
        id: prochainId++,
        utilisateurId,
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
      return versApi(candidature);
    },

    async modifier(utilisateurId, id, donnees) {
      const c = trouverStockee(utilisateurId, id);
      if (!c) return null;
      Object.assign(c, donnees, { modifieLe: new Date().toISOString() });
      return versApi(c);
    },

    async supprimer(utilisateurId, id) {
      const c = trouverStockee(utilisateurId, id);
      if (!c) return false;
      candidatures.splice(candidatures.indexOf(c), 1);
      return true;
    },
  };
}

export function creerDepotUtilisateursMemoire(): DepotUtilisateurs {
  const utilisateurs: Utilisateur[] = [];
  let prochainId = 1;

  return {
    async trouverParCourriel(courriel) {
      return utilisateurs.find((u) => u.courriel === courriel) ?? null;
    },

    async trouverParId(id) {
      return utilisateurs.find((u) => u.id === id) ?? null;
    },

    async creer({ courriel, motDePasseHache, nom }) {
      if (utilisateurs.some((u) => u.courriel === courriel)) return null; // comme la contrainte UNIQUE de PostgreSQL
      const utilisateur: Utilisateur = {
        id: prochainId++,
        courriel,
        motDePasseHache,
        nom: nom ?? null,
        creeLe: new Date().toISOString(),
      };
      utilisateurs.push(utilisateur);
      return utilisateur;
    },
  };
}
