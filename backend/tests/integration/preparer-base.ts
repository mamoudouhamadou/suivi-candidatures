import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

// Exécuté UNE fois avant les tests d'intégration : applique les migrations
// sur la base de test pour que les tables existent et soient à jour.
export default function preparerBase() {
  const variablesTest = parseEnv(readFileSync(".env.test", "utf8"));
  const urlBase = process.env.DATABASE_URL ?? variablesTest.DATABASE_URL;
  if (!urlBase) throw new Error("DATABASE_URL manquante (voir .env.test)");

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: urlBase },
  });
}
