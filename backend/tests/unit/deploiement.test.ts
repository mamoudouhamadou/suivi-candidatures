import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { creerApp } from "../../src/app.js";
import { creerDepotMemoire, creerDepotUtilisateursMemoire } from "../../src/depots/depot-memoire.js";
import { SECRET_TEST } from "./outils.js";

// Fonctionnalités ajoutées pour la mise en ligne : sécurité publique et service de l'interface.

function creer(options: Partial<Parameters<typeof creerApp>[0]> = {}) {
  return creerApp({
    candidatures: creerDepotMemoire(),
    utilisateurs: creerDepotUtilisateursMemoire(),
    secretJwt: SECRET_TEST,
    coutHachage: 4,
    ...options,
  });
}

describe("Limite de tentatives sur /api/auth", () => {
  it("répond 429 au-delà de la limite, sans bloquer les autres routes", async () => {
    const app = creer({ limiteAuth: 3 });
    const essai = () => request(app).post("/api/auth/connexion").send({ courriel: "x@exemple.ca", motDePasse: "faux" });

    for (let i = 0; i < 3; i++) expect((await essai()).status).toBe(401);
    const bloque = await essai();

    expect(bloque.status).toBe(429); // 429 = Too Many Requests
    expect(bloque.body.erreur).toMatch(/Trop de tentatives/);
    expect(bloque.headers["ratelimit-policy"]).toBeDefined();
    expect((await request(app).get("/api/sante")).status).toBe(200);
  });
});

describe("En-têtes de sécurité (helmet)", () => {
  it("ajoute CSP, anti-clickjacking et nosniff", async () => {
    const res = await request(creer()).get("/api/sante");
    expect(res.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("affiche la version déployée dans /api/sante", async () => {
    const res = await request(creer({ version: "abc1234" })).get("/api/sante");
    expect(res.body).toEqual({ statut: "ok", version: "abc1234" });
  });
});

describe("Service de l'interface (dossierStatique)", () => {
  let dossier: string;

  beforeAll(() => {
    // Une fausse interface compilée dans un dossier temporaire
    dossier = mkdtempSync(path.join(tmpdir(), "interface-"));
    mkdirSync(path.join(dossier, "assets"));
    writeFileSync(path.join(dossier, "index.html"), '<!doctype html><div id="racine"></div>');
    writeFileSync(path.join(dossier, "assets", "index-abc.js"), "console.log(1)");
  });

  afterAll(() => rmSync(dossier, { recursive: true, force: true }));

  it("sert index.html à la racine et pour toute page de l'application", async () => {
    const app = creer({ dossierStatique: dossier });
    for (const url of ["/", "/une/page/quelconque"]) {
      const res = await request(app).get(url);
      expect(res.status).toBe(200);
      expect(res.text).toContain('<div id="racine">');
      expect(res.headers["cache-control"]).toBe("no-cache");
    }
  });

  it("met les fichiers /assets en cache pour un an", async () => {
    const res = await request(creer({ dossierStatique: dossier })).get("/assets/index-abc.js");
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toContain("max-age=31536000");
    expect(res.headers["cache-control"]).toContain("immutable");
  });

  it("répond toujours en JSON pour une route /api inconnue", async () => {
    const res = await request(creer({ dossierStatique: dossier })).get("/api/inconnue");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ erreur: "Route introuvable" });
  });

  it("refuse de démarrer si l'interface n'est pas compilée", () => {
    expect(() => creer({ dossierStatique: path.join(dossier, "absent") })).toThrow(/index.html introuvable/);
  });
});
