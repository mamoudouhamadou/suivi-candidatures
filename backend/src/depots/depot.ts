import type { Candidature, ModificationCandidature, NouvelleCandidature } from "../candidature.js";

// « Dépôt » (repository) : l'interface qui cache COMMENT les données sont stockées.
// Les routes ne connaissent que ce contrat ; on peut brancher la mémoire (tests)
// ou PostgreSQL (vraie application) sans changer une ligne des routes.
export interface DepotCandidatures {
  lister(): Promise<Candidature[]>;
  trouver(id: number): Promise<Candidature | null>;
  creer(donnees: NouvelleCandidature): Promise<Candidature>;
  modifier(id: number, donnees: ModificationCandidature): Promise<Candidature | null>;
  supprimer(id: number): Promise<boolean>;
}
