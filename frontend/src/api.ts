// Petit client HTTP : une seule fonction pour tous les appels à l'API.
// Elle ajoute le jeton, convertit le JSON et transforme les erreurs HTTP en exceptions.

export type DetailErreur = { champ: string; message: string };

export class ErreurApi extends Error {
  constructor(
    public statut: number, // code HTTP (0 = serveur injoignable)
    message: string,
    public details: DetailErreur[] = [],
  ) {
    super(message);
  }

  /** Message d'erreur pour un champ précis du formulaire, s'il y en a un. */
  messagePour(champ: string) {
    return this.details.find((d) => d.champ === champ)?.message;
  }
}

type Options = {
  methode?: "GET" | "POST" | "PATCH" | "DELETE";
  corps?: unknown;
  jeton?: string | null;
};

export async function appelerApi<T>(chemin: string, { methode = "GET", corps, jeton }: Options = {}): Promise<T> {
  const entetes: Record<string, string> = {};
  if (corps !== undefined) entetes["Content-Type"] = "application/json";
  if (jeton) entetes["Authorization"] = `Bearer ${jeton}`;

  let reponse: Response;
  try {
    reponse = await fetch(`/api${chemin}`, {
      method: methode,
      headers: entetes,
      body: corps === undefined ? undefined : JSON.stringify(corps),
    });
  } catch {
    throw new ErreurApi(0, "Serveur injoignable. L'API est-elle démarrée ?");
  }

  if (reponse.status === 204) return undefined as T; // succès sans contenu (DELETE)

  const donnees = await reponse.json().catch(() => null);
  if (!reponse.ok) {
    throw new ErreurApi(reponse.status, donnees?.erreur ?? `Erreur ${reponse.status}`, donnees?.details);
  }
  return donnees as T;
}
