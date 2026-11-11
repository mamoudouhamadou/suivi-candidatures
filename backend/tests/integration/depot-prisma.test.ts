import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { creerClientPrisma, creerDepotPrisma } from "../../src/depots/depot-prisma.js";

// Tests d'intégration : le dépôt Prisma contre une VRAIE base PostgreSQL (base de test séparée).
// Lancer avec : npm run test:integration   (Docker doit tourner : docker compose up -d)
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL manquante (voir .env.test)");

const prisma = creerClientPrisma(url);
const depot = creerDepotPrisma(prisma);

beforeEach(async () => {
  // Table vide et compteur d'id remis à 1 avant chaque test
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Candidature" RESTART IDENTITY`);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Dépôt PostgreSQL", () => {
  it("crée, lit et liste", async () => {
    const creee = await depot.creer({ entreprise: "Mirego", poste: "Stagiaire", statut: "envoyee", dateEnvoi: "2026-11-10" });

    expect(creee).toMatchObject({ id: 1, entreprise: "Mirego", statut: "envoyee", dateEnvoi: "2026-11-10", lien: null });
    expect(await depot.trouver(1)).toEqual(creee);
    expect(await depot.lister()).toHaveLength(1);
  });

  it("liste la plus récente en premier", async () => {
    await depot.creer({ entreprise: "A", poste: "p", statut: "a_envoyer" });
    await depot.creer({ entreprise: "B", poste: "p", statut: "a_envoyer" });
    expect((await depot.lister()).map((c) => c.entreprise)).toEqual(["B", "A"]);
  });

  it("modifie partiellement et efface avec null", async () => {
    await depot.creer({ entreprise: "Exfo", poste: "Stagiaire", statut: "envoyee", notes: "note" });
    const modifiee = await depot.modifier(1, { statut: "entrevue", notes: null });
    expect(modifiee).toMatchObject({ entreprise: "Exfo", statut: "entrevue", notes: null });
  });

  it("retourne null / false pour un id inexistant", async () => {
    expect(await depot.trouver(99)).toBeNull();
    expect(await depot.modifier(99, { statut: "offre" })).toBeNull();
    expect(await depot.supprimer(99)).toBe(false);
  });

  it("supprime", async () => {
    await depot.creer({ entreprise: "Coveo", poste: "Stagiaire", statut: "a_envoyer" });
    expect(await depot.supprimer(1)).toBe(true);
    expect(await depot.lister()).toEqual([]);
  });
});
