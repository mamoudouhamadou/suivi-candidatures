import { useAuth } from "./auth";
import { PageConnexion } from "./composants/PageConnexion";
import { TableauDeBord } from "./composants/TableauDeBord";

// Pas de routeur pour l'instant : connecté → tableau de bord, sinon → page de connexion.
export function App() {
  const { utilisateur, chargement } = useAuth();

  if (chargement) return <p className="chargement plein-ecran">Chargement…</p>;
  return utilisateur ? <TableauDeBord /> : <PageConnexion />;
}
