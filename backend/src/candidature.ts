import { z } from "zod";

// Les étapes possibles d'une candidature (colonnes du futur tableau kanban).
export const STATUTS = ["a_envoyer", "envoyee", "entrevue", "offre", "refusee"] as const;
export type Statut = (typeof STATUTS)[number];

// Champs qu'un client a le droit d'envoyer.
// Zod vérifie les données à l'exécution ; TypeScript ne le fait qu'à la compilation.
const champsSchema = z.object({
  entreprise: z.string({ error: "L'entreprise est obligatoire" }).trim().min(1, "L'entreprise est obligatoire"),
  poste: z.string({ error: "Le poste est obligatoire" }).trim().min(1, "Le poste est obligatoire"),
  statut: z.enum(STATUTS),
  dateEnvoi: z.iso.date().nullable(), // format AAAA-MM-JJ ; null pour effacer
  lien: z.url().nullable(),
  notes: z.string().max(2000).nullable(),
});

// Création (POST) : entreprise et poste obligatoires, le reste facultatif.
export const nouvelleCandidatureSchema = champsSchema.extend({
  statut: champsSchema.shape.statut.default("a_envoyer"),
  dateEnvoi: champsSchema.shape.dateEnvoi.optional(),
  lien: champsSchema.shape.lien.optional(),
  notes: champsSchema.shape.notes.optional(),
});

// Modification (PATCH) : tous les champs sont facultatifs, mais il en faut au moins un.
export const modificationCandidatureSchema = champsSchema
  .partial()
  .refine((donnees) => Object.keys(donnees).length > 0, "Aucun champ à modifier");

// Types TypeScript déduits automatiquement des schémas (une seule source de vérité).
export type NouvelleCandidature = z.infer<typeof nouvelleCandidatureSchema>;
export type ModificationCandidature = z.infer<typeof modificationCandidatureSchema>;

// Ce que l'API renvoie au client.
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
