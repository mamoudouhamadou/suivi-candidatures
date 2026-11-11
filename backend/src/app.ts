import express, { type NextFunction, type Request, type Response } from "express";
import type { DepotCandidatures } from "./depots/depot.js";
import { creerRouteurCandidatures } from "./routes/candidatures.js";

// On sépare la création de l'app (ici) du démarrage du serveur (server.ts)
// pour que les tests puissent appeler l'API sans ouvrir de port réseau.
export function creerApp(depot: DepotCandidatures) {
  const app = express();
  app.use(express.json()); // transforme le corps JSON des requêtes en objet JavaScript

  app.get("/api/sante", (_req, res) => {
    res.json({ statut: "ok" });
  });

  app.use("/api/candidatures", creerRouteurCandidatures(depot));

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
