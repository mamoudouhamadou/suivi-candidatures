import type { Candidature, ModificationCandidature, NouvelleCandidature } from "../candidature.js";
import type { Utilisateur } from "../utilisateur.js";

// « Dépôt » (repository) : l'interface qui cache COMMENT les données sont stockées.
// Les routes ne connaissent que ce contrat ; on peut brancher la mémoire (tests)
// ou PostgreSQL (vraie application) sans changer une ligne des routes.
//
// Chaque méthode reçoit l'id de l'utilisateur connecté : on ne voit, ne modifie
// et ne supprime QUE ses propres candidatures.
export interface DepotCandidatures {
  lister(utilisateurId: number): Promise<Candidature[]>;
  trouver(utilisateurId: number, id: number): Promise<Candidature | null>;
  creer(utilisateurId: number, donnees: NouvelleCandidature): Promise<Candidature>;
  modifier(utilisateurId: number, id: number, donnees: ModificationCandidature): Promise<Candidature | null>;
  supprimer(utilisateurId: number, id: number): Promise<boolean>;
}

export type NouvelUtilisateur = { courriel: string; motDePasseHache: string; nom?: string };

export interface DepotUtilisateurs {
  trouverParCourriel(courriel: string): Promise<Utilisateur | null>;
  trouverParId(id: number): Promise<Utilisateur | null>;
  /** Retourne null si le courriel est déjà utilisé. */
  creer(donnees: NouvelUtilisateur): Promise<Utilisateur | null>;
}
