import request from "supertest";
import type { Express } from "express";
import { creerApp } from "../../src/app.js";
import { creerDepotMemoire, creerDepotUtilisateursMemoire } from "../../src/depots/depot-memoire.js";

export const SECRET_TEST = "secret-de-test-qui-fait-au-moins-32-caracteres";

/** Une app neuve avec des dépôts en mémoire (vides) et un hachage rapide. */
export function creerAppDeTest() {
  return creerApp({
    candidatures: creerDepotMemoire(),
    utilisateurs: creerDepotUtilisateursMemoire(),
    secretJwt: SECRET_TEST,
    coutHachage: 4,
  });
}

/** Inscrit un utilisateur et retourne son jeton. */
export async function inscrire(app: Express, courriel = "ana@exemple.ca", motDePasse = "motdepasse123") {
  const res = await request(app).post("/api/auth/inscription").send({ courriel, motDePasse });
  return res.body.jeton as string;
}
