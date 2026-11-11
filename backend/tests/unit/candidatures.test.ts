import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { creerApp } from "../../src/app.js";
import { creerDepotMemoire } from "../../src/depots/depot-memoire.js";

// Tests des routes avec le dépôt en mémoire : rapides, aucune base de données requise.
let app: Express;

// Une nouvelle app (donc une liste vide) avant chaque test : les tests restent indépendants.
beforeEach(() => {
  app = creerApp(creerDepotMemoire());
});

const creer = (corps: object) => request(app).post("/api/candidatures").send(corps);

describe("GET /api/sante", () => {
  it("répond ok", async () => {
    const res = await request(app).get("/api/sante");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ statut: "ok" });
  });
});

describe("Création et lecture", () => {
  it("retourne une liste vide au départ", async () => {
    const res = await request(app).get("/api/candidatures");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("crée une candidature avec le statut par défaut", async () => {
    const res = await creer({ entreprise: "Mirego", poste: "Stagiaire développeur" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 1, entreprise: "Mirego", statut: "a_envoyer", notes: null });

    const liste = await request(app).get("/api/candidatures");
    expect(liste.body).toHaveLength(1);
  });

  it("refuse une candidature sans entreprise", async () => {
    const res = await creer({ poste: "Stagiaire" });
    expect(res.status).toBe(400);
    expect(res.body.details[0]).toEqual({ champ: "entreprise", message: "L'entreprise est obligatoire" });
  });

  it("refuse un statut inconnu", async () => {
    const res = await creer({ entreprise: "Exfo", poste: "Stagiaire", statut: "peut-etre" });
    expect(res.status).toBe(400);
  });

  it("refuse un JSON mal formé", async () => {
    const res = await request(app)
      .post("/api/candidatures")
      .set("Content-Type", "application/json")
      .send("{ pas du json");
    expect(res.status).toBe(400);
    expect(res.body.erreur).toBe("JSON mal formé");
  });

  it("retrouve une candidature par son id, sinon 404", async () => {
    await creer({ entreprise: "Coveo", poste: "Stagiaire" });
    expect((await request(app).get("/api/candidatures/1")).body.entreprise).toBe("Coveo");
    expect((await request(app).get("/api/candidatures/99")).status).toBe(404);
    expect((await request(app).get("/api/candidatures/abc")).status).toBe(404);
  });
});

describe("PATCH /api/candidatures/:id", () => {
  it("modifie seulement les champs envoyés", async () => {
    await creer({ entreprise: "Exfo", poste: "Stagiaire", notes: "Contact : RH" });

    const res = await request(app)
      .patch("/api/candidatures/1")
      .send({ statut: "entrevue", dateEnvoi: "2026-11-10" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      entreprise: "Exfo",
      statut: "entrevue",
      dateEnvoi: "2026-11-10",
      notes: "Contact : RH", // inchangé
    });
  });

  it("permet d'effacer un champ facultatif avec null", async () => {
    await creer({ entreprise: "Exfo", poste: "Stagiaire", notes: "à effacer" });
    const res = await request(app).patch("/api/candidatures/1").send({ notes: null });
    expect(res.body.notes).toBeNull();
  });

  it("refuse un corps vide ou invalide", async () => {
    await creer({ entreprise: "Exfo", poste: "Stagiaire" });
    expect((await request(app).patch("/api/candidatures/1").send({})).status).toBe(400);
    expect((await request(app).patch("/api/candidatures/1").send({ entreprise: "" })).status).toBe(400);
  });

  it("répond 404 si la candidature n'existe pas", async () => {
    const res = await request(app).patch("/api/candidatures/42").send({ statut: "offre" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/candidatures/:id", () => {
  it("supprime puis répond 404 la deuxième fois", async () => {
    await creer({ entreprise: "Beneva", poste: "Stagiaire" });

    expect((await request(app).delete("/api/candidatures/1")).status).toBe(204);
    expect((await request(app).get("/api/candidatures")).body).toEqual([]);
    expect((await request(app).delete("/api/candidatures/1")).status).toBe(404);
  });
});
