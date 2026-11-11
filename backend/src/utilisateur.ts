import { z } from "zod";

// Courriel normalisé : sans espaces et en minuscules, pour que « Ana@X.ca » et « ana@x.ca » soient le même compte.
// L'ordre compte : on nettoie d'abord (trim, minuscules), PUIS on valide le format avec pipe().
const courriel = z
  .string({ error: "Le courriel est obligatoire" })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Courriel invalide" }));

export const inscriptionSchema = z.object({
  courriel,
  motDePasse: z
    .string({ error: "Le mot de passe est obligatoire" })
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .max(72, "Le mot de passe doit contenir au plus 72 caractères"), // limite de bcrypt
  nom: z.string().trim().min(1).max(100).optional(),
});

export const connexionSchema = z.object({
  courriel,
  motDePasse: z.string({ error: "Le mot de passe est obligatoire" }).min(1, "Le mot de passe est obligatoire"),
});

// Ce qui est stocké (avec le hachage)…
export type Utilisateur = {
  id: number;
  courriel: string;
  motDePasseHache: string;
  nom: string | null;
  creeLe: string;
};

// …et ce qui est renvoyé au client (SANS le hachage).
export type UtilisateurPublic = Omit<Utilisateur, "motDePasseHache">;

export function versPublic({ motDePasseHache: _, ...publicSeulement }: Utilisateur): UtilisateurPublic {
  return publicSeulement;
}
