import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { defineConfig } from "vitest/config";

// Configuration des tests d'intégration (npm run test:integration).
// Les variables viennent de .env.test, lues par Node lui-même (aucun outil externe).
// Une variable déjà définie dans l'environnement a priorité (utile en CI ou pour une autre base).
const variablesTest = parseEnv(readFileSync(".env.test", "utf8"));
const env: Record<string, string> = {};
for (const [cle, valeur] of Object.entries(variablesTest)) {
  env[cle] = process.env[cle] ?? valeur;
}

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    env, // variables visibles par les tests
    globalSetup: ["tests/integration/preparer-base.ts"], // migrations avant tous les tests
    fileParallelism: false, // les fichiers partagent la même base : un à la fois
  },
});
