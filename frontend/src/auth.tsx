import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { appelerApi, ErreurApi } from "./api";
import type { Utilisateur } from "./types";

// Contexte React : rend l'utilisateur connecté et les fonctions de connexion
// accessibles à TOUS les composants, sans les passer de parent en enfant (« prop drilling »).

const CLE_JETON = "suivi.jeton";

type ReponseAuth = { utilisateur: Utilisateur; jeton: string };
type ApiAuthentifiee = <T>(chemin: string, options?: Omit<Parameters<typeof appelerApi>[1], "jeton">) => Promise<T>;

type ValeurAuth = {
  utilisateur: Utilisateur | null;
  chargement: boolean; // vrai pendant la vérification du jeton au démarrage
  connexion: (courriel: string, motDePasse: string) => Promise<void>;
  inscription: (courriel: string, motDePasse: string, nom?: string) => Promise<void>;
  deconnexion: () => void;
  /** appelerApi avec le jeton ajouté automatiquement ; déconnecte si le jeton est expiré (401). */
  api: ApiAuthentifiee;
};

const ContexteAuth = createContext<ValeurAuth | null>(null);

// Lecture/écriture protégées : localStorage peut être bloqué (navigation privée, paramètres).
function lireJeton() {
  try {
    return localStorage.getItem(CLE_JETON);
  } catch {
    return null;
  }
}
function ecrireJeton(jeton: string | null) {
  try {
    if (jeton) localStorage.setItem(CLE_JETON, jeton);
    else localStorage.removeItem(CLE_JETON);
  } catch {
    /* le jeton restera seulement en mémoire */
  }
}

export function FournisseurAuth({ children }: { children: ReactNode }) {
  const [jeton, setJeton] = useState<string | null>(lireJeton);
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [chargement, setChargement] = useState(jeton !== null);

  const deconnexion = useCallback(() => {
    ecrireJeton(null);
    setJeton(null);
    setUtilisateur(null);
  }, []);

  const ouvrirSession = useCallback(({ utilisateur, jeton }: ReponseAuth) => {
    ecrireJeton(jeton);
    setJeton(jeton);
    setUtilisateur(utilisateur);
  }, []);

  // Au démarrage : si un jeton est déjà enregistré, on demande à l'API qui il représente.
  useEffect(() => {
    if (!jeton || utilisateur) return;
    let annule = false; // évite de mettre à jour un composant démonté
    appelerApi<Utilisateur>("/auth/moi", { jeton })
      .then((u) => !annule && setUtilisateur(u))
      .catch(() => !annule && deconnexion()) // jeton expiré ou invalide
      .finally(() => !annule && setChargement(false));
    return () => {
      annule = true;
    };
  }, [jeton, utilisateur, deconnexion]);

  const api = useCallback<ApiAuthentifiee>(
    async (chemin, options) => {
      try {
        return await appelerApi(chemin, { ...options, jeton });
      } catch (erreur) {
        if (erreur instanceof ErreurApi && erreur.statut === 401) deconnexion();
        throw erreur;
      }
    },
    [jeton, deconnexion],
  );

  const valeur: ValeurAuth = {
    utilisateur,
    chargement,
    deconnexion,
    api,
    connexion: async (courriel, motDePasse) =>
      ouvrirSession(await appelerApi<ReponseAuth>("/auth/connexion", { methode: "POST", corps: { courriel, motDePasse } })),
    inscription: async (courriel, motDePasse, nom) =>
      ouvrirSession(
        await appelerApi<ReponseAuth>("/auth/inscription", { methode: "POST", corps: { courriel, motDePasse, nom } }),
      ),
  };

  return <ContexteAuth.Provider value={valeur}>{children}</ContexteAuth.Provider>;
}

/** Hook pour lire le contexte d'authentification depuis n'importe quel composant. */
export function useAuth() {
  const valeur = useContext(ContexteAuth);
  if (!valeur) throw new Error("useAuth doit être utilisé dans <FournisseurAuth>");
  return valeur;
}
