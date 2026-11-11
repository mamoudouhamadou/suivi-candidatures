import { useState, type DragEvent } from "react";
import { LIBELLES_STATUT, STATUTS, type Candidature, type Statut } from "../types";

type Proprietes = {
  candidatures: Candidature[];
  onChangerStatut: (id: number, statut: Statut) => void;
  onModifier: (candidature: Candidature) => void;
  onSupprimer: (candidature: Candidature) => void;
};

// Une colonne par statut. On change le statut d'une carte de deux façons :
// - glisser-déposer (souris) ;
// - la liste déroulante sur la carte (clavier, écran tactile, lecteur d'écran).
export function TableauKanban({ candidatures, onChangerStatut, onModifier, onSupprimer }: Proprietes) {
  const [colonneSurvolee, setColonneSurvolee] = useState<Statut | null>(null);

  function deposer(evenement: DragEvent, statut: Statut) {
    evenement.preventDefault();
    setColonneSurvolee(null);
    const id = Number(evenement.dataTransfer.getData("text/plain"));
    const carte = candidatures.find((c) => c.id === id);
    if (carte && carte.statut !== statut) onChangerStatut(id, statut);
  }

  return (
    <div className="kanban">
      {STATUTS.map((statut) => {
        const cartes = candidatures.filter((c) => c.statut === statut);
        return (
          <section
            key={statut}
            className={`colonne statut-${statut}${colonneSurvolee === statut ? " survolee" : ""}`}
            aria-labelledby={`titre-${statut}`}
            onDragOver={(e) => {
              e.preventDefault(); // autorise le dépôt
              setColonneSurvolee(statut);
            }}
            onDragLeave={() => setColonneSurvolee(null)}
            onDrop={(e) => deposer(e, statut)}
          >
            <h2 id={`titre-${statut}`}>
              {LIBELLES_STATUT[statut]} <span className="compteur">{cartes.length}</span>
            </h2>
            <ul>
              {cartes.map((c) => (
                <li
                  key={c.id}
                  className="carte"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", String(c.id))}
                >
                  <h3>{c.entreprise}</h3>
                  <p className="poste">{c.poste}</p>
                  {c.dateEnvoi && <p className="meta">Envoyée le {formaterDate(c.dateEnvoi)}</p>}
                  {c.notes && <p className="notes">{c.notes}</p>}
                  {c.lien && (
                    <a href={c.lien} target="_blank" rel="noopener noreferrer" className="lien-offre">
                      Voir l'offre ↗
                    </a>
                  )}
                  <div className="pied-carte">
                    <select
                      aria-label={`Statut de ${c.entreprise}`}
                      value={c.statut}
                      onChange={(e) => onChangerStatut(c.id, e.target.value as Statut)}
                    >
                      {STATUTS.map((s) => (
                        <option key={s} value={s}>
                          {LIBELLES_STATUT[s]}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="icone" onClick={() => onModifier(c)} aria-label={`Modifier ${c.entreprise}`}>
                      ✎
                    </button>
                    <button type="button" className="icone danger" onClick={() => onSupprimer(c)} aria-label={`Supprimer ${c.entreprise}`}>
                      🗑
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {cartes.length === 0 && <p className="vide">Aucune</p>}
          </section>
        );
      })}
    </div>
  );
}

// "2026-11-10" → "10 nov. 2026" (en heure locale, sans décalage de fuseau)
function formaterDate(date: string) {
  const [a, m, j] = date.split("-").map(Number);
  return new Date(a, m - 1, j).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" });
}
