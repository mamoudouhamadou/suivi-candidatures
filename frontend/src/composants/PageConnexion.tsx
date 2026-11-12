import { useState, type FormEvent } from "react";
import { ErreurApi } from "../api";
import { useAuth } from "../auth";

// Un seul formulaire pour la connexion et l'inscription : le « mode » change les champs et l'action.
export function PageConnexion() {
  const { connexion, inscription } = useAuth();
  const [mode, setMode] = useState<"connexion" | "inscription">("connexion");
  const [courriel, setCourriel] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [nom, setNom] = useState("");
  const [erreur, setErreur] = useState<ErreurApi | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const estInscription = mode === "inscription";

  async function soumettre(evenement: FormEvent) {
    evenement.preventDefault(); // empêche le navigateur de recharger la page
    setEnvoi(true);
    setErreur(null);
    try {
      if (estInscription) await inscription(courriel, motDePasse, nom.trim() || undefined);
      else await connexion(courriel, motDePasse);
      // Succès : le contexte d'authentification change et App affiche le tableau de bord.
    } catch (e) {
      setErreur(e instanceof ErreurApi ? e : new ErreurApi(0, "Erreur inattendue"));
      setEnvoi(false);
    }
  }

  function changerMode() {
    setMode(estInscription ? "connexion" : "inscription");
    setErreur(null);
  }

  return (
    <main className="page-connexion">
      <div className="carte-connexion">
        <h1>Suivi de candidatures</h1>
        <p className="sous-titre">{estInscription ? "Créez votre compte" : "Connectez-vous pour voir vos candidatures"}</p>

        <form onSubmit={soumettre} noValidate>
          {estInscription && (
            <Champ id="nom" libelle="Nom (facultatif)" valeur={nom} onChange={setNom} autoComplete="name" />
          )}
          <Champ
            id="courriel"
            libelle="Courriel"
            type="email"
            valeur={courriel}
            onChange={setCourriel}
            autoComplete="email"
            erreur={erreur?.messagePour("courriel")}
          />
          <Champ
            id="motDePasse"
            libelle="Mot de passe"
            type="password"
            valeur={motDePasse}
            onChange={setMotDePasse}
            autoComplete={estInscription ? "new-password" : "current-password"}
            aide={estInscription ? "8 caractères minimum" : undefined}
            erreur={erreur?.messagePour("motDePasse")}
          />

          {erreur && erreur.details.length === 0 && (
            <p className="alerte" role="alert">
              {erreur.message}
            </p>
          )}

          <button type="submit" className="bouton principal large" disabled={envoi}>
            {envoi ? "Un instant…" : estInscription ? "Créer mon compte" : "Se connecter"}
          </button>
        </form>

        <p className="bascule">
          {estInscription ? "Déjà un compte ?" : "Pas encore de compte ?"}{" "}
          <button type="button" className="lien" onClick={changerMode}>
            {estInscription ? "Se connecter" : "Créer un compte"}
          </button>
        </p>
      </div>
    </main>
  );
}

type ProprietesChamp = {
  id: string;
  libelle: string;
  valeur: string;
  onChange: (valeur: string) => void;
  type?: string;
  autoComplete?: string;
  aide?: string;
  erreur?: string;
};

// <label htmlFor> relié à l'<input id> : cliquer le libellé met le curseur dans le champ,
// et les lecteurs d'écran annoncent le libellé (accessibilité).
function Champ({ id, libelle, valeur, onChange, type = "text", autoComplete, aide, erreur }: ProprietesChamp) {
  return (
    <div className="champ">
      <label htmlFor={id}>{libelle}</label>
      <input
        id={id}
        type={type}
        value={valeur}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? `${id}-erreur` : aide ? `${id}-aide` : undefined}
      />
      {erreur ? (
        <span id={`${id}-erreur`} className="erreur-champ">
          {erreur}
        </span>
      ) : (
        aide && (
          <span id={`${id}-aide`} className="aide">
            {aide}
          </span>
        )
      )}
    </div>
  );
}
