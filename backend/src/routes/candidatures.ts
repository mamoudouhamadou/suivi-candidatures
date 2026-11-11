import { Router, type Response } from "express";
import type { ZodError } from "zod";
import { modificationCandidatureSchema, nouvelleCandidatureSchema } from "../candidature.js";
import type { DepotCandidatures } from "../depots/depot.js";

// Le routeur reçoit le dépôt en paramètre (« injection de dépendance ») :
// il ne sait pas si les données sont en mémoire ou dans PostgreSQL.
export function creerRouteurCandidatures(depot: DepotCandidatures) {
  const routeur = Router();

  // GET /api/candidatures → liste complète, la plus récente en premier
  routeur.get("/", async (_req, res) => {
    res.json(await depot.lister());
  });

  // GET /api/candidatures/:id → une seule candidature
  routeur.get("/:id", async (req, res) => {
    const id = lireId(req.params.id);
    const candidature = id ? await depot.trouver(id) : null;
    if (!candidature) return introuvable(res);
    res.json(candidature);
  });

  // POST /api/candidatures → crée une candidature après validation
  routeur.post("/", async (req, res) => {
    const resultat = nouvelleCandidatureSchema.safeParse(req.body);
    if (!resultat.success) return donneesInvalides(res, resultat.error);
    res.status(201).json(await depot.creer(resultat.data));
  });

  // PATCH /api/candidatures/:id → modifie seulement les champs envoyés
  routeur.patch("/:id", async (req, res) => {
    const id = lireId(req.params.id);
    if (!id) return introuvable(res);
    const resultat = modificationCandidatureSchema.safeParse(req.body);
    if (!resultat.success) return donneesInvalides(res, resultat.error);
    const candidature = await depot.modifier(id, resultat.data);
    if (!candidature) return introuvable(res);
    res.json(candidature);
  });

  // DELETE /api/candidatures/:id → 204 (succès, rien à renvoyer)
  routeur.delete("/:id", async (req, res) => {
    const id = lireId(req.params.id);
    if (!id || !(await depot.supprimer(id))) return introuvable(res);
    res.status(204).end();
  });

  return routeur;
}

// "12" → 12 ; "abc", "-1", "1.5" → null
function lireId(texte: string) {
  const id = Number(texte);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function introuvable(res: Response) {
  res.status(404).json({ erreur: "Candidature introuvable" });
}

function donneesInvalides(res: Response, erreur: ZodError) {
  res.status(400).json({
    erreur: "Données invalides",
    details: erreur.issues.map((i) => ({ champ: i.path.join("."), message: i.message })),
  });
}
