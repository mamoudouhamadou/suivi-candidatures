import "dotenv/config"; // charge les variables du fichier .env dans process.env
import { creerApp } from "./app.js";
import { creerDepotMemoire, creerDepotUtilisateursMemoire } from "./depots/depot-memoire.js";
import { creerClientPrisma, creerDepotPrisma, creerDepotUtilisateursPrisma } from "./depots/depot-prisma.js";

const PORT = Number(process.env.PORT ?? 3000);
const URL_BD = process.env.DATABASE_URL;
const SECRET_JWT = process.env.JWT_SECRET;

// Sans secret, n'importe qui pourrait fabriquer des jetons : on refuse de démarrer.
if (!SECRET_JWT || SECRET_JWT.length < 32) {
  console.error("❌ JWT_SECRET manquant ou trop court (32 caractères minimum). Voir .env.example.");
  process.exit(1);
}

// Avec une base de données configurée → PostgreSQL ; sinon → mémoire (pratique sans Docker).
let depots;
if (URL_BD) {
  const prisma = creerClientPrisma(URL_BD);
  depots = { candidatures: creerDepotPrisma(prisma), utilisateurs: creerDepotUtilisateursPrisma(prisma) };
} else {
  console.warn("⚠️  DATABASE_URL absente : données en mémoire (perdues au redémarrage).");
  depots = { candidatures: creerDepotMemoire(), utilisateurs: creerDepotUtilisateursMemoire() };
}

creerApp({ ...depots, secretJwt: SECRET_JWT }).listen(PORT, () => {
  console.log(`API démarrée sur http://localhost:${PORT} (${URL_BD ? "PostgreSQL" : "mémoire"})`);
});
