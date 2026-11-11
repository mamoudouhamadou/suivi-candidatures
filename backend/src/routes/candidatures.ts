import { Router } from "express";
import { utilisateurConnecte } from "../auth/middleware.js";
import { modificationCandidatureSchema, nouvelleCandidatureSchema } from "../candidature.js";
import type { DepotCandidatures } from "../depots/depot.js";
import { donneesInvalides, introuvable } from "./reponses.js";

// Le routeur reçoit le dépôt en paramètre (« injection de dépendance ») :
// il ne sait pas si les données sont en mémoire ou dans PostgreSQL.
// Toutes ces routes sont protégées (voir app.ts) : utilisateurConnecte(res) est toujours défini.
// Une candidature d'un autre utilisateur répond 404, pas 403 : on ne révèle même pas qu'elle existe.
export function creerRouteurCandidatures(depot: DepotCandidatures) {
  const routeur = Router();

  // GET /api/candidatures → mes candidatures, la plus récente en premier
  routeur.get("/", async (_req, res) => {
    res.json(await depot.lister(utilisateurConnecte(res)));
  });

  // GET /api/candidatures/:id → une de mes candidatures
  routeur.get("/:id", async (req, res) => {
    const id = lireId(req.params.id);
    const candidature = id ? await depot.trouver(utilisateurConnecte(res), id) : null;
    if (!candidature) return introuvable(res);
    res.json(candidature);
  });

  // POST /api/candidatures → crée une candidature après validation
  routeur.post("/", async (req, res) => {
    const resultat = nouvelleCandidatureSchema.safeParse(req.body);
    if (!resultat.success) return donneesInvalides(res, resultat.error);
    res.status(201).json(await depot.creer(utilisateurConnecte(res), resultat.data));
  });

  // PATCH /api/candidatures/:id → modifie seulement les champs envoyés
  routeur.patch("/:id", async (req, res) => {
    const id = lireId(req.params.id);
    if (!id) return introuvable(res);
    const resultat = modificationCandidatureSchema.safeParse(req.body);
    if (!resultat.success) return donneesInvalides(res, resultat.error);
    const candidature = await depot.modifier(utilisateurConnecte(res), id, resultat.data);
    if (!candidature) return introuvable(res);
    res.json(candidature);
  });

  // DELETE /api/candidatures/:id → 204 (succès, rien à renvoyer)
  routeur.delete("/:id", async (req, res) => {
    const id = lireId(req.params.id);
    if (!id || !(await depot.supprimer(utilisateurConnecte(res), id))) return introuvable(res);
    res.status(204).end();
  });

  return routeur;
}

// "12" → 12 ; "abc", "-1", "1.5" → null
function lireId(texte: string) {
  const id = Number(texte);
  return Number.isInteger(id) && id > 0 ? id : null;
}
