import type { NextFunction, Request, Response } from "express";
import { verifierJeton } from "./jetons.js";

// Middleware : s'exécute AVANT les routes protégées.
// Il lit l'en-tête « Authorization: Bearer <jeton> », vérifie le jeton,
// puis range l'id de l'utilisateur dans res.locals pour les routes suivantes.
export function exigerAuthentification(secret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const [type, jeton] = (req.headers.authorization ?? "").split(" ");
    const utilisateurId = type === "Bearer" && jeton ? verifierJeton(jeton, secret) : null;

    if (!utilisateurId) {
      // 401 : non authentifié (jeton absent, invalide ou expiré)
      res.status(401).json({ erreur: "Authentification requise" });
      return;
    }
    res.locals.utilisateurId = utilisateurId;
    next();
  };
}

/** L'id de l'utilisateur connecté (à utiliser après exigerAuthentification). */
export function utilisateurConnecte(res: Response): number {
  return res.locals.utilisateurId as number;
}
