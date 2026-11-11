import "dotenv/config"; // charge les variables du fichier .env dans process.env
import { creerApp } from "./app.js";
import { creerDepotMemoire } from "./depots/depot-memoire.js";
import { creerClientPrisma, creerDepotPrisma } from "./depots/depot-prisma.js";

const PORT = Number(process.env.PORT ?? 3000);
const URL_BD = process.env.DATABASE_URL;

// Avec une base de données configurée → PostgreSQL ; sinon → mémoire (pratique sans Docker).
const depot = URL_BD ? creerDepotPrisma(creerClientPrisma(URL_BD)) : creerDepotMemoire();
if (!URL_BD) console.warn("⚠️  DATABASE_URL absente : données en mémoire (perdues au redémarrage).");

creerApp(depot).listen(PORT, () => {
  console.log(`API démarrée sur http://localhost:${PORT} (${URL_BD ? "PostgreSQL" : "mémoire"})`);
});
