import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth";
import type { Candidature, DonneesCandidature } from "./types";

// Hook personnalisé : regroupe l'état de la liste et les appels à l'API.
// Les composants n'ont qu'à appeler creer(), modifier(), supprimer().
export function useCandidatures() {
  const { api } = useAuth();
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const recharger = useCallback(async () => {
    setChargement(true);
    try {
      setCandidatures(await api<Candidature[]>("/candidatures"));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setChargement(false);
    }
  }, [api]);

  useEffect(() => {
    void recharger();
  }, [recharger]);

  // Après chaque réponse du serveur, on met à jour la liste locale
  // au lieu de tout recharger : l'interface reste rapide.
  const creer = async (donnees: DonneesCandidature) => {
    const nouvelle = await api<Candidature>("/candidatures", { methode: "POST", corps: donnees });
    setCandidatures((liste) => [nouvelle, ...liste]);
  };

  const modifier = async (id: number, donnees: Partial<DonneesCandidature>) => {
    const modifiee = await api<Candidature>(`/candidatures/${id}`, { methode: "PATCH", corps: donnees });
    setCandidatures((liste) => liste.map((c) => (c.id === id ? modifiee : c)));
  };

  const supprimer = async (id: number) => {
    await api(`/candidatures/${id}`, { methode: "DELETE" });
    setCandidatures((liste) => liste.filter((c) => c.id !== id));
  };

  return { candidatures, chargement, erreur, recharger, creer, modifier, supprimer };
}
