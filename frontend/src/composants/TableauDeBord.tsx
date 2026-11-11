import { useState } from "react";
import { useAuth } from "../auth";
import { useCandidatures } from "../useCandidatures";
import type { Candidature, Statut } from "../types";
import { FormulaireCandidature } from "./FormulaireCandidature";
import { TableauKanban } from "./TableauKanban";

// Formulaire fermé, ouvert pour créer, ou ouvert pour modifier une candidature précise.
type EtatFormulaire = { ouvert: false } | { ouvert: true; candidature: Candidature | null };

export function TableauDeBord() {
  const { utilisateur, deconnexion } = useAuth();
  const { candidatures, chargement, erreur, creer, modifier, supprimer } = useCandidatures();
  const [formulaire, setFormulaire] = useState<EtatFormulaire>({ ouvert: false });
  const [message, setMessage] = useState<string | null>(null);

  // Pour les actions rapides (glisser, supprimer), on affiche l'erreur dans un bandeau.
  async function essayer(action: () => Promise<void>) {
    try {
      await action();
      setMessage(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur inattendue");
    }
  }

  function demanderSuppression(c: Candidature) {
    if (window.confirm(`Supprimer la candidature chez ${c.entreprise} ?`)) void essayer(() => supprimer(c.id));
  }

  const total = candidatures.length;
  const envoyees = candidatures.filter((c) => c.statut !== "a_envoyer").length;
  const entrevues = candidatures.filter((c) => c.statut === "entrevue" || c.statut === "offre").length;
  const tauxReponse = envoyees ? Math.round((entrevues / envoyees) * 100) : 0;

  return (
    <div className="tableau-de-bord">
      <header className="entete">
        <h1>Suivi de candidatures</h1>
        <div className="utilisateur">
          <span>{utilisateur?.nom ?? utilisateur?.courriel}</span>
          <button type="button" className="bouton" onClick={deconnexion}>
            Se déconnecter
          </button>
        </div>
      </header>

      <main>
        <div className="barre">
          <dl className="stats">
            <div>
              <dt>Candidatures</dt>
              <dd>{total}</dd>
            </div>
            <div>
              <dt>Envoyées</dt>
              <dd>{envoyees}</dd>
            </div>
            <div>
              <dt>Taux d'entrevue</dt>
              <dd>{tauxReponse} %</dd>
            </div>
          </dl>
          <button type="button" className="bouton principal" onClick={() => setFormulaire({ ouvert: true, candidature: null })}>
            + Nouvelle candidature
          </button>
        </div>

        {(erreur || message) && (
          <p className="alerte" role="alert">
            {erreur ?? message}
          </p>
        )}

        {chargement ? (
          <p className="chargement">Chargement…</p>
        ) : (
          <TableauKanban
            candidatures={candidatures}
            onChangerStatut={(id, statut: Statut) => void essayer(() => modifier(id, { statut }))}
            onModifier={(c) => setFormulaire({ ouvert: true, candidature: c })}
            onSupprimer={demanderSuppression}
          />
        )}
      </main>

      {formulaire.ouvert && (
        <FormulaireCandidature
          candidature={formulaire.candidature}
          onEnregistrer={(donnees) =>
            formulaire.candidature ? modifier(formulaire.candidature.id, donnees) : creer(donnees)
          }
          onFermer={() => setFormulaire({ ouvert: false })}
        />
      )}
    </div>
  );
}
