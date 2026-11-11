import express, { type NextFunction, type Request, type Response } from "express";
import { exigerAuthentification } from "./auth/middleware.js";
import type { DepotCandidatures, DepotUtilisateurs } from "./depots/depot.js";
import { creerRouteurAuth } from "./routes/auth.js";
import { creerRouteurCandidatures } from "./routes/candidatures.js";

export type Dependances = {
  candidatures: DepotCandidatures;
  utilisateurs: DepotUtilisateurs;
  secretJwt: string;
  coutHachage?: number;
};

// On sépare la création de l'app (ici) du démarrage du serveur (server.ts)
// pour que les tests puissent appeler l'API sans ouvrir de port réseau.
export function creerApp({ candidatures, utilisateurs, secretJwt, coutHachage = 12 }: Dependances) {
  const app = express();
  app.disable("x-powered-by"); // ne pas annoncer « Express » aux curieux
  app.use(express.json({ limit: "100kb" })); // transforme le corps JSON en objet ; refuse les corps énormes

  app.get("/api/sante", (_req, res) => {
    res.json({ statut: "ok" });
  });

  // Routes publiques : inscription et connexion
  app.use("/api/auth", creerRouteurAuth(utilisateurs, { secretJwt, coutHachage }));

  // Routes protégées : le middleware passe en premier et bloque sans jeton valide
  app.use("/api/candidatures", exigerAuthentification(secretJwt), creerRouteurCandidatures(candidatures));

  // Toute autre URL → 404 en JSON
  app.use((_req, res) => {
    res.status(404).json({ erreur: "Route introuvable" });
  });

  // Erreurs imprévues (ex. base de données injoignable) → 500, sans exposer les détails au client.
  // Express reconnaît un gestionnaire d'erreurs à ses 4 paramètres.
  app.use((erreur: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (erreur instanceof SyntaxError) {
      res.status(400).json({ erreur: "JSON mal formé" });
      return;
    }
    console.error(erreur);
    res.status(500).json({ erreur: "Erreur interne du serveur" });
  });

  return app;
}
