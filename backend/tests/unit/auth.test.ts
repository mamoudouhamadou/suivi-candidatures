import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import type { Express } from "express";
import { creerAppDeTest, inscrire, SECRET_TEST } from "./outils.js";

let app: Express;

beforeEach(() => {
  app = creerAppDeTest();
});

const inscription = (corps: object) => request(app).post("/api/auth/inscription").send(corps);
const connexion = (corps: object) => request(app).post("/api/auth/connexion").send(corps);

describe("POST /api/auth/inscription", () => {
  it("crée un compte, renvoie un jeton et jamais le mot de passe", async () => {
    const res = await inscription({ courriel: "Ana@Exemple.ca ", motDePasse: "motdepasse123", nom: "Ana" });

    expect(res.status).toBe(201);
    expect(res.body.utilisateur).toMatchObject({ id: 1, courriel: "ana@exemple.ca", nom: "Ana" }); // normalisé
    expect(res.body.jeton).toEqual(expect.any(String));
    expect(JSON.stringify(res.body)).not.toContain("motdepasse123");
    expect(res.body.utilisateur.motDePasseHache).toBeUndefined();
  });

  it("refuse un courriel déjà utilisé (409), même avec une casse différente", async () => {
    await inscription({ courriel: "ana@exemple.ca", motDePasse: "motdepasse123" });
    const res = await inscription({ courriel: "ANA@exemple.ca", motDePasse: "autremotdepasse" });
    expect(res.status).toBe(409);
  });

  it("refuse un courriel invalide ou un mot de passe trop court", async () => {
    expect((await inscription({ courriel: "pas-un-courriel", motDePasse: "motdepasse123" })).status).toBe(400);
    const res = await inscription({ courriel: "ana@exemple.ca", motDePasse: "court" });
    expect(res.status).toBe(400);
    expect(res.body.details[0].champ).toBe("motDePasse");
  });
});

describe("POST /api/auth/connexion", () => {
  beforeEach(async () => {
    await inscription({ courriel: "ana@exemple.ca", motDePasse: "motdepasse123" });
  });

  it("connecte avec le bon mot de passe", async () => {
    const res = await connexion({ courriel: "ana@exemple.ca", motDePasse: "motdepasse123" });
    expect(res.status).toBe(200);
    expect(res.body.jeton).toEqual(expect.any(String));
  });

  it("répond 401 avec le même message pour un mauvais mot de passe ou un courriel inconnu", async () => {
    const mauvaisMotDePasse = await connexion({ courriel: "ana@exemple.ca", motDePasse: "mauvais" });
    const inconnu = await connexion({ courriel: "personne@exemple.ca", motDePasse: "motdepasse123" });

    expect(mauvaisMotDePasse.status).toBe(401);
    expect(inconnu.status).toBe(401);
    expect(mauvaisMotDePasse.body).toEqual(inconnu.body); // ne révèle pas si le compte existe
  });
});

describe("GET /api/auth/moi et protection par jeton", () => {
  it("renvoie l'utilisateur connecté", async () => {
    const jeton = await inscrire(app);
    const res = await request(app).get("/api/auth/moi").set("Authorization", `Bearer ${jeton}`);
    expect(res.status).toBe(200);
    expect(res.body.courriel).toBe("ana@exemple.ca");
  });

  it("refuse sans jeton, avec un jeton falsifié ou expiré (401)", async () => {
    const jetonFalsifie = jwt.sign({ sub: "1" }, "pas-le-bon-secret-pas-le-bon-secret");
    const jetonExpire = jwt.sign({ sub: "1" }, SECRET_TEST, { expiresIn: -10 });
    const jetonSansSignature = jwt.sign({ sub: "1" }, null, { algorithm: "none" });

    for (const autorisation of [undefined, "Bearer", "Basic abc", `Bearer ${jetonFalsifie}`, `Bearer ${jetonExpire}`, `Bearer ${jetonSansSignature}`]) {
      const req = request(app).get("/api/candidatures");
      const res = autorisation ? await req.set("Authorization", autorisation) : await req;
      expect(res.status, `Authorization: ${autorisation}`).toBe(401);
    }
  });
});
