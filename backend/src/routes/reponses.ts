import type { Response } from "express";
import type { ZodError } from "zod";

// Réponses d'erreur partagées par les routeurs, pour un format identique partout.

export function donneesInvalides(res: Response, erreur: ZodError) {
  res.status(400).json({
    erreur: "Données invalides",
    details: erreur.issues.map((i) => ({ champ: i.path.join("."), message: i.message })),
  });
}

export function introuvable(res: Response) {
  res.status(404).json({ erreur: "Candidature introuvable" });
}
