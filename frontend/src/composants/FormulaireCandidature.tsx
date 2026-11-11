import { useEffect, useRef, useState, type FormEvent } from "react";
import { ErreurApi } from "../api";
import { LIBELLES_STATUT, STATUTS, type Candidature, type DonneesCandidature, type Statut } from "../types";

type Proprietes = {
  /** Candidature à modifier, ou null pour en créer une nouvelle. */
  candidature: Candidature | null;
  onEnregistrer: (donnees: DonneesCandidature) => Promise<void>;
  onFermer: () => void;
};

// Fenêtre modale basée sur l'élément HTML <dialog> : le navigateur gère
// la touche Échap, le fond assombri et le focus clavier.
export function FormulaireCandidature({ candidature, onEnregistrer, onFermer }: Proprietes) {
  const dialogue = useRef<HTMLDialogElement>(null);
  const [entreprise, setEntreprise] = useState(candidature?.entreprise ?? "");
  const [poste, setPoste] = useState(candidature?.poste ?? "");
  const [statut, setStatut] = useState<Statut>(candidature?.statut ?? "a_envoyer");
  const [dateEnvoi, setDateEnvoi] = useState(candidature?.dateEnvoi ?? "");
  const [lien, setLien] = useState(candidature?.lien ?? "");
  const [notes, setNotes] = useState(candidature?.notes ?? "");
  const [erreur, setErreur] = useState<ErreurApi | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    const d = dialogue.current;
    if (!d || d.open) return;
    // showModal() n'existe pas dans tous les environnements (ex. jsdom pour les tests) :
    // on ouvre alors la fenêtre en mode normal.
    if (typeof d.showModal === "function") d.showModal();
    else d.setAttribute("open", "");
  }, []);

  async function soumettre(evenement: FormEvent) {
    evenement.preventDefault();
    setEnvoi(true);
    setErreur(null);
    try {
      // Les champs facultatifs vides deviennent null (= « pas de valeur » pour l'API).
      await onEnregistrer({
        entreprise,
        poste,
        statut,
        dateEnvoi: dateEnvoi || null,
        lien: lien.trim() || null,
        notes: notes.trim() || null,
      });
      onFermer();
    } catch (e) {
      setErreur(e instanceof ErreurApi ? e : new ErreurApi(0, "Erreur inattendue"));
      setEnvoi(false);
    }
  }

  const titre = candidature ? "Modifier la candidature" : "Nouvelle candidature";

  return (
    <dialog ref={dialogue} className="modale" aria-labelledby="titre-formulaire" onClose={onFermer}>
      <form onSubmit={soumettre} noValidate>
        <h2 id="titre-formulaire">{titre}</h2>

        <div className="grille-champs">
          <div className="champ">
            <label htmlFor="entreprise">Entreprise *</label>
            <input id="entreprise" value={entreprise} onChange={(e) => setEntreprise(e.target.value)} autoFocus />
            <ErreurChamp erreur={erreur} champ="entreprise" />
          </div>
          <div className="champ">
            <label htmlFor="poste">Poste *</label>
            <input id="poste" value={poste} onChange={(e) => setPoste(e.target.value)} />
            <ErreurChamp erreur={erreur} champ="poste" />
          </div>
          <div className="champ">
            <label htmlFor="statut">Statut</label>
            <select id="statut" value={statut} onChange={(e) => setStatut(e.target.value as Statut)}>
              {STATUTS.map((s) => (
                <option key={s} value={s}>
                  {LIBELLES_STATUT[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="champ">
            <label htmlFor="dateEnvoi">Date d'envoi</label>
            <input id="dateEnvoi" type="date" value={dateEnvoi} onChange={(e) => setDateEnvoi(e.target.value)} />
            <ErreurChamp erreur={erreur} champ="dateEnvoi" />
          </div>
          <div className="champ pleine-largeur">
            <label htmlFor="lien">Lien de l'offre</label>
            <input id="lien" type="url" placeholder="https://…" value={lien} onChange={(e) => setLien(e.target.value)} />
            <ErreurChamp erreur={erreur} champ="lien" />
          </div>
          <div className="champ pleine-largeur">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            <ErreurChamp erreur={erreur} champ="notes" />
          </div>
        </div>

        {erreur && erreur.details.length === 0 && (
          <p className="alerte" role="alert">
            {erreur.message}
          </p>
        )}

        <div className="actions">
          <button type="button" className="bouton" onClick={onFermer}>
            Annuler
          </button>
          <button type="submit" className="bouton principal" disabled={envoi}>
            {envoi ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function ErreurChamp({ erreur, champ }: { erreur: ErreurApi | null; champ: string }) {
  const message = erreur?.messagePour(champ);
  return message ? <span className="erreur-champ">{message}</span> : null;
}
