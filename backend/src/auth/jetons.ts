import jwt from "jsonwebtoken";

// JWT (JSON Web Token) = en-tête.contenu.signature, encodés en base64.
// Le contenu est LISIBLE par n'importe qui (pas chiffré) : on n'y met jamais de secret.
// La signature (HMAC-SHA256 avec notre clé secrète) empêche de le falsifier :
// si quelqu'un change l'id dans le contenu, la signature ne correspond plus.

const DUREE_VALIDITE = "24h";

export function creerJeton(utilisateurId: number, secret: string): string {
  // "sub" (subject) = à qui appartient le jeton ; c'est un nom standard des JWT.
  return jwt.sign({ sub: String(utilisateurId) }, secret, { algorithm: "HS256", expiresIn: DUREE_VALIDITE });
}

/** Retourne l'id de l'utilisateur, ou null si le jeton est invalide, falsifié ou expiré. */
export function verifierJeton(jeton: string, secret: string): number | null {
  try {
    // On impose l'algorithme : sinon, un attaquant pourrait envoyer un jeton « alg: none » non signé.
    const contenu = jwt.verify(jeton, secret, { algorithms: ["HS256"] });
    const id = typeof contenu === "object" ? Number(contenu.sub) : NaN;
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}
