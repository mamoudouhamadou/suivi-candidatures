import bcrypt from "bcryptjs";
import { Router } from "express";
import { creerJeton } from "../auth/jetons.js";
import { exigerAuthentification, utilisateurConnecte } from "../auth/middleware.js";
import type { DepotUtilisateurs } from "../depots/depot.js";
import { connexionSchema, inscriptionSchema, versPublic } from "../utilisateur.js";
import { donneesInvalides } from "./reponses.js";

export type OptionsAuth = {
  secretJwt: string;
  /** Coût de bcrypt : 12 en production (lent exprès, contre la force brute), 4 dans les tests (rapide). */
  coutHachage: number;
};

export function creerRouteurAuth(utilisateurs: DepotUtilisateurs, { secretJwt, coutHachage }: OptionsAuth) {
  const routeur = Router();

  // Hachage factice : sert à comparer quand le courriel n'existe pas,
  // pour que la réponse prenne le même temps dans les deux cas (voir /connexion).
  const hachageFactice = bcrypt.hashSync("mot-de-passe-factice", coutHachage);

  // POST /api/auth/inscription → crée un compte et renvoie un jeton
  routeur.post("/inscription", async (req, res) => {
    const resultat = inscriptionSchema.safeParse(req.body);
    if (!resultat.success) return donneesInvalides(res, resultat.error);
    const { courriel, motDePasse, nom } = resultat.data;

    // bcrypt ajoute un « sel » aléatoire puis hache : deux mots de passe identiques
    // donnent deux hachages différents, et on ne peut pas revenir au mot de passe.
    const motDePasseHache = await bcrypt.hash(motDePasse, coutHachage);
    const utilisateur = await utilisateurs.creer({ courriel, motDePasseHache, nom });
    if (!utilisateur) {
      res.status(409).json({ erreur: "Ce courriel est déjà utilisé" }); // 409 = conflit
      return;
    }
    res.status(201).json({ utilisateur: versPublic(utilisateur), jeton: creerJeton(utilisateur.id, secretJwt) });
  });

  // POST /api/auth/connexion → vérifie le mot de passe et renvoie un jeton
  routeur.post("/connexion", async (req, res) => {
    const resultat = connexionSchema.safeParse(req.body);
    if (!resultat.success) return donneesInvalides(res, resultat.error);
    const { courriel, motDePasse } = resultat.data;

    const utilisateur = await utilisateurs.trouverParCourriel(courriel);
    const motDePasseValide = await bcrypt.compare(motDePasse, utilisateur?.motDePasseHache ?? hachageFactice);

    if (!utilisateur || !motDePasseValide) {
      // Même message dans les deux cas : on ne révèle pas si le courriel a un compte.
      res.status(401).json({ erreur: "Courriel ou mot de passe incorrect" });
      return;
    }
    res.json({ utilisateur: versPublic(utilisateur), jeton: creerJeton(utilisateur.id, secretJwt) });
  });

  // GET /api/auth/moi → l'utilisateur connecté (route protégée)
  routeur.get("/moi", exigerAuthentification(secretJwt), async (_req, res) => {
    const utilisateur = await utilisateurs.trouverParId(utilisateurConnecte(res));
    if (!utilisateur) {
      res.status(401).json({ erreur: "Authentification requise" }); // compte supprimé depuis la création du jeton
      return;
    }
    res.json(versPublic(utilisateur));
  });

  return routeur;
}
