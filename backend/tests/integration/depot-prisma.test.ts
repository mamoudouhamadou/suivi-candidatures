import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  creerClientPrisma,
  creerDepotPrisma,
  creerDepotUtilisateursPrisma,
} from "../../src/depots/depot-prisma.js";

// Tests d'intégration : les dépôts Prisma contre une VRAIE base PostgreSQL (base de test séparée).
// Lancer avec : npm run test:integration   (Docker doit tourner : docker compose up -d)
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL manquante (voir .env.test)");

const prisma = creerClientPrisma(url);
const depot = creerDepotPrisma(prisma);
const utilisateurs = creerDepotUtilisateursPrisma(prisma);

let ana: number;
let bob: number;

beforeEach(async () => {
  // Tables vides et compteurs d'id remis à 1 avant chaque test
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Candidature", "Utilisateur" RESTART IDENTITY CASCADE`);
  ana = (await utilisateurs.creer({ courriel: "ana@exemple.ca", motDePasseHache: "h" }))!.id;
  bob = (await utilisateurs.creer({ courriel: "bob@exemple.ca", motDePasseHache: "h" }))!.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Dépôt des utilisateurs (PostgreSQL)", () => {
  it("trouve par courriel et par id", async () => {
    expect((await utilisateurs.trouverParCourriel("ana@exemple.ca"))?.id).toBe(ana);
    expect((await utilisateurs.trouverParId(bob))?.courriel).toBe("bob@exemple.ca");
    expect(await utilisateurs.trouverParCourriel("inconnu@exemple.ca")).toBeNull();
  });

  it("retourne null si le courriel existe déjà (contrainte UNIQUE)", async () => {
    expect(await utilisateurs.creer({ courriel: "ana@exemple.ca", motDePasseHache: "h" })).toBeNull();
  });
});

describe("Dépôt des candidatures (PostgreSQL)", () => {
  it("crée, lit et liste", async () => {
    const creee = await depot.creer(ana, { entreprise: "Mirego", poste: "Stagiaire", statut: "envoyee", dateEnvoi: "2026-11-10" });

    expect(creee).toMatchObject({ id: 1, entreprise: "Mirego", statut: "envoyee", dateEnvoi: "2026-11-10", lien: null });
    expect(creee).not.toHaveProperty("utilisateurId");
    expect(await depot.trouver(ana, 1)).toEqual(creee);
    expect(await depot.lister(ana)).toHaveLength(1);
  });

  it("liste la plus récente en premier", async () => {
    await depot.creer(ana, { entreprise: "A", poste: "p", statut: "a_envoyer" });
    await depot.creer(ana, { entreprise: "B", poste: "p", statut: "a_envoyer" });
    expect((await depot.lister(ana)).map((c) => c.entreprise)).toEqual(["B", "A"]);
  });

  it("modifie partiellement et efface avec null", async () => {
    await depot.creer(ana, { entreprise: "Exfo", poste: "Stagiaire", statut: "envoyee", notes: "note" });
    const modifiee = await depot.modifier(ana, 1, { statut: "entrevue", notes: null });
    expect(modifiee).toMatchObject({ entreprise: "Exfo", statut: "entrevue", notes: null });
  });

  it("retourne null / false pour un id inexistant", async () => {
    expect(await depot.trouver(ana, 99)).toBeNull();
    expect(await depot.modifier(ana, 99, { statut: "offre" })).toBeNull();
    expect(await depot.supprimer(ana, 99)).toBe(false);
  });

  it("supprime", async () => {
    await depot.creer(ana, { entreprise: "Coveo", poste: "Stagiaire", statut: "a_envoyer" });
    expect(await depot.supprimer(ana, 1)).toBe(true);
    expect(await depot.lister(ana)).toEqual([]);
  });

  it("isole les données de chaque utilisateur", async () => {
    await depot.creer(ana, { entreprise: "Mirego", poste: "Stagiaire", statut: "a_envoyer" });

    expect(await depot.lister(bob)).toEqual([]);
    expect(await depot.trouver(bob, 1)).toBeNull();
    expect(await depot.modifier(bob, 1, { statut: "offre" })).toBeNull();
    expect(await depot.supprimer(bob, 1)).toBe(false);
    expect((await depot.trouver(ana, 1))?.statut).toBe("a_envoyer");
  });

  it("supprime les candidatures quand l'utilisateur est supprimé (ON DELETE CASCADE)", async () => {
    await depot.creer(ana, { entreprise: "Mirego", poste: "Stagiaire", statut: "a_envoyer" });
    await prisma.utilisateur.delete({ where: { id: ana } });
    expect(await prisma.candidature.count()).toBe(0);
  });
});
