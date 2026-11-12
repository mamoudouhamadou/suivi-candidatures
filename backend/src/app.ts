import { existsSync } from "node:fs";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { exigerAuthentification } from "./auth/middleware.js";
import type { DepotCandidatures, DepotUtilisateurs } from "./depots/depot.js";
import { creerRouteurAuth } from "./routes/auth.js";
import { creerRouteurCandidatures } from "./routes/candidatures.js";

export type Dependances = {
  candidatures: DepotCandidatures;
  utilisateurs: DepotUtilisateurs;
  secretJwt: string;
  coutHachage?: number;
  /** Nombre maximal de requêtes vers /api/auth par adresse IP et par 15 minutes. */
  limiteAuth?: number;
  /** Dossier de l'interface React compilée : si défini, l'API sert aussi le site (déploiement en un seul service). */
  dossierStatique?: string;
  /** Vrai derrière un proxy (Render, nginx) : l'adresse IP réelle vient alors de l'en-tête X-Forwarded-For. */
  derriereProxy?: boolean;
  /** Identifiant de la version déployée (commit Git), affiché par /api/sante. */
  version?: string;
};

// On sépare la création de l'app (ici) du démarrage du serveur (server.ts)
// pour que les tests puissent appeler l'API sans ouvrir de port réseau.
export function creerApp({
  candidatures,
  utilisateurs,
  secretJwt,
  coutHachage = 12,
  limiteAuth = 20,
  dossierStatique,
  derriereProxy = false,
  version = "dev",
}: Dependances) {
  const app = express();
  app.disable("x-powered-by"); // ne pas annoncer « Express » aux curieux
  if (derriereProxy) app.set("trust proxy", 1); // faire confiance au 1er proxy seulement

  // En-têtes de sécurité (les mêmes idées que dans nginx.conf) : CSP, anti-clickjacking, nosniff…
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );
  app.use(express.json({ limit: "100kb" })); // transforme le corps JSON en objet ; refuse les corps énormes

  app.get("/api/sante", (_req, res) => {
    res.json({ statut: "ok", version });
  });

  // Limite de tentatives sur l'inscription et la connexion : freine les attaques par force brute.
  const limiteur = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: limiteAuth,
    standardHeaders: "draft-8", // en-têtes RateLimit-* pour informer le client
    legacyHeaders: false,
    message: { erreur: "Trop de tentatives. Veuillez réessayer dans 15 minutes." },
  });

  // Routes publiques : inscription et connexion
  app.use("/api/auth", limiteur, creerRouteurAuth(utilisateurs, { secretJwt, coutHachage }));

  // Routes protégées : le middleware passe en premier et bloque sans jeton valide
  app.use("/api/candidatures", exigerAuthentification(secretJwt), creerRouteurCandidatures(candidatures));

  // Toute autre URL /api → 404 en JSON
  app.use("/api", (_req, res) => {
    res.status(404).json({ erreur: "Route introuvable" });
  });

  // Interface React (déploiement en un seul service)
  if (dossierStatique) {
    const indexHtml = path.join(path.resolve(dossierStatique), "index.html");
    if (!existsSync(indexHtml)) throw new Error(`index.html introuvable dans ${dossierStatique}`);

    // Fichiers avec empreinte dans le nom (index-BX89VYhy.js) : cache d'un an
    app.use("/assets", express.static(path.join(dossierStatique, "assets"), { immutable: true, maxAge: "1y" }));
    app.use(express.static(dossierStatique, { index: false }));

    // Toute autre page → index.html (application d'une seule page), jamais en cache
    app.get(/.*/, (_req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(indexHtml);
    });
  }

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
