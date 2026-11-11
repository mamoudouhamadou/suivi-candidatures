import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { creerAppDeTest, inscrire } from "./outils.js";

// Tests des routes avec les dépôts en mémoire : rapides, aucune base de données requise.
let app: Express;
let jeton: string;

// Une nouvelle app (donc des listes vides) et un utilisateur connecté avant chaque test.
beforeEach(async () => {
  app = creerAppDeTest();
  jeton = await inscrire(app);
});

// Petites fonctions qui ajoutent automatiquement l'en-tête d'authentification
const auth = (j = jeton) => ({ Authorization: `Bearer ${j}` });
const get = (url: string, j?: string) => request(app).get(url).set(auth(j));
const post = (corps: object, j?: string) => request(app).post("/api/candidatures").set(auth(j)).send(corps);
const patch = (id: number | string, corps: object, j?: string) =>
  request(app).patch(`/api/candidatures/${id}`).set(auth(j)).send(corps);
const del = (id: number, j?: string) => request(app).delete(`/api/candidatures/${id}`).set(auth(j));

describe("GET /api/sante", () => {
  it("répond ok sans authentification", async () => {
    const res = await request(app).get("/api/sante");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ statut: "ok" });
  });
});

describe("Création et lecture", () => {
  it("retourne une liste vide au départ", async () => {
    const res = await get("/api/candidatures");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("crée une candidature avec le statut par défaut", async () => {
    const res = await post({ entreprise: "Mirego", poste: "Stagiaire développeur" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 1, entreprise: "Mirego", statut: "a_envoyer", notes: null });
    expect(res.body.utilisateurId).toBeUndefined(); // champ interne non exposé
    expect((await get("/api/candidatures")).body).toHaveLength(1);
  });

  it("refuse une candidature sans entreprise", async () => {
    const res = await post({ poste: "Stagiaire" });
    expect(res.status).toBe(400);
    expect(res.body.details[0]).toEqual({ champ: "entreprise", message: "L'entreprise est obligatoire" });
  });

  it("refuse un statut inconnu", async () => {
    expect((await post({ entreprise: "Exfo", poste: "Stagiaire", statut: "peut-etre" })).status).toBe(400);
  });

  it("refuse un JSON mal formé", async () => {
    const res = await request(app)
      .post("/api/candidatures")
      .set(auth())
      .set("Content-Type", "application/json")
      .send("{ pas du json");
    expect(res.status).toBe(400);
    expect(res.body.erreur).toBe("JSON mal formé");
  });

  it("retrouve une candidature par son id, sinon 404", async () => {
    await post({ entreprise: "Coveo", poste: "Stagiaire" });
    expect((await get("/api/candidatures/1")).body.entreprise).toBe("Coveo");
    expect((await get("/api/candidatures/99")).status).toBe(404);
    expect((await get("/api/candidatures/abc")).status).toBe(404);
  });
});

describe("PATCH /api/candidatures/:id", () => {
  it("modifie seulement les champs envoyés", async () => {
    await post({ entreprise: "Exfo", poste: "Stagiaire", notes: "Contact : RH" });
    const res = await patch(1, { statut: "entrevue", dateEnvoi: "2026-11-10" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      entreprise: "Exfo",
      statut: "entrevue",
      dateEnvoi: "2026-11-10",
      notes: "Contact : RH", // inchangé
    });
  });

  it("permet d'effacer un champ facultatif avec null", async () => {
    await post({ entreprise: "Exfo", poste: "Stagiaire", notes: "à effacer" });
    expect((await patch(1, { notes: null })).body.notes).toBeNull();
  });

  it("refuse un corps vide ou invalide", async () => {
    await post({ entreprise: "Exfo", poste: "Stagiaire" });
    expect((await patch(1, {})).status).toBe(400);
    expect((await patch(1, { entreprise: "" })).status).toBe(400);
  });

  it("répond 404 si la candidature n'existe pas", async () => {
    expect((await patch(42, { statut: "offre" })).status).toBe(404);
  });
});

describe("DELETE /api/candidatures/:id", () => {
  it("supprime puis répond 404 la deuxième fois", async () => {
    await post({ entreprise: "Beneva", poste: "Stagiaire" });
    expect((await del(1)).status).toBe(204);
    expect((await get("/api/candidatures")).body).toEqual([]);
    expect((await del(1)).status).toBe(404);
  });
});

describe("Isolation entre utilisateurs", () => {
  it("un utilisateur ne voit, ne modifie ni ne supprime les candidatures d'un autre", async () => {
    await post({ entreprise: "Mirego", poste: "Stagiaire" }); // candidature 1, appartient à Ana
    const jetonBob = await inscrire(app, "bob@exemple.ca");

    expect((await get("/api/candidatures", jetonBob)).body).toEqual([]);
    expect((await get("/api/candidatures/1", jetonBob)).status).toBe(404);
    expect((await patch(1, { statut: "offre" }, jetonBob)).status).toBe(404);
    expect((await del(1, jetonBob)).status).toBe(404);

    // La candidature d'Ana est intacte
    expect((await get("/api/candidatures/1")).body).toMatchObject({ entreprise: "Mirego", statut: "a_envoyer" });
  });
});
