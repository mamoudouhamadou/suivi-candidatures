// Les mêmes formes de données que l'API (voir backend/src/candidature.ts).

export const STATUTS = ["a_envoyer", "envoyee", "entrevue", "offre", "refusee"] as const;
export type Statut = (typeof STATUTS)[number];

export const LIBELLES_STATUT: Record<Statut, string> = {
  a_envoyer: "À envoyer",
  envoyee: "Envoyée",
  entrevue: "Entrevue",
  offre: "Offre",
  refusee: "Refusée",
};

export type Candidature = {
  id: number;
  entreprise: string;
  poste: string;
  statut: Statut;
  dateEnvoi: string | null;
  lien: string | null;
  notes: string | null;
  creeLe: string;
  modifieLe: string;
};

/** Ce que le formulaire envoie pour créer ou modifier. */
export type DonneesCandidature = {
  entreprise: string;
  poste: string;
  statut: Statut;
  dateEnvoi: string | null;
  lien: string | null;
  notes: string | null;
};

export type Utilisateur = {
  id: number;
  courriel: string;
  nom: string | null;
  creeLe: string;
};
