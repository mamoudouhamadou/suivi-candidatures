import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../App";
import { FournisseurAuth } from "../auth";

// Tests du parcours complet. On remplace fetch par une fausse API (« mock ») :
// pas besoin du vrai serveur, et on contrôle exactement ses réponses.

type Route = { status: number; corps?: unknown };
type Appel = { methode: string; url: string; corps: unknown; autorisation: string | null };

function simulerApi(routes: Record<string, Route>) {
  const appels: Appel[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
    const methode = init?.method ?? "GET";
    const entetes = new Headers(init?.headers);
    appels.push({
      methode,
      url: String(url),
      corps: init?.body ? JSON.parse(String(init.body)) : undefined,
      autorisation: entetes.get("Authorization"),
    });
    const route = routes[`${methode} ${url}`] ?? { status: 404, corps: { erreur: "Route introuvable" } };
    return new Response(route.status === 204 ? null : JSON.stringify(route.corps), { status: route.status });
  });
  return appels;
}

const ana = { id: 1, courriel: "ana@exemple.ca", nom: "Ana", creeLe: "" };
const mirego = {
  id: 7, entreprise: "Mirego", poste: "Stagiaire", statut: "envoyee",
  dateEnvoi: null, lien: null, notes: null, creeLe: "", modifieLe: "",
};

function afficherApp() {
  render(
    <FournisseurAuth>
      <App />
    </FournisseurAuth>,
  );
}

describe("Connexion", () => {
  it("affiche le message de l'API quand le mot de passe est incorrect", async () => {
    simulerApi({ "POST /api/auth/connexion": { status: 401, corps: { erreur: "Courriel ou mot de passe incorrect" } } });
    afficherApp();

    await userEvent.type(screen.getByLabelText("Courriel"), "ana@exemple.ca");
    await userEvent.type(screen.getByLabelText("Mot de passe"), "mauvais");
    await userEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Courriel ou mot de passe incorrect");
  });

  it("affiche l'erreur sous le bon champ à l'inscription", async () => {
    simulerApi({
      "POST /api/auth/inscription": {
        status: 400,
        corps: { erreur: "Données invalides", details: [{ champ: "motDePasse", message: "Au moins 8 caractères" }] },
      },
    });
    afficherApp();

    await userEvent.click(screen.getByRole("button", { name: "Créer un compte" }));
    await userEvent.type(screen.getByLabelText("Courriel"), "ana@exemple.ca");
    await userEvent.type(screen.getByLabelText("Mot de passe"), "court");
    await userEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));

    expect(await screen.findByText("Au moins 8 caractères")).toBeInTheDocument();
    expect(screen.getByLabelText("Mot de passe")).toHaveAttribute("aria-invalid", "true");
  });

  it("connecte, garde le jeton et affiche les candidatures", async () => {
    const appels = simulerApi({
      "POST /api/auth/connexion": { status: 200, corps: { utilisateur: ana, jeton: "jeton-abc" } },
      "GET /api/candidatures": { status: 200, corps: [mirego] },
    });
    afficherApp();

    await userEvent.type(screen.getByLabelText("Courriel"), "ana@exemple.ca");
    await userEvent.type(screen.getByLabelText("Mot de passe"), "motdepasse123");
    await userEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByText("Mirego")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(localStorage.getItem("suivi.jeton")).toBe("jeton-abc");
    // La liste a été demandée AVEC le jeton
    expect(appels.find((a) => a.url === "/api/candidatures")?.autorisation).toBe("Bearer jeton-abc");
  });
});

describe("Session existante", () => {
  it("restaure la session au démarrage avec le jeton enregistré", async () => {
    localStorage.setItem("suivi.jeton", "jeton-abc");
    simulerApi({
      "GET /api/auth/moi": { status: 200, corps: ana },
      "GET /api/candidatures": { status: 200, corps: [] },
    });
    afficherApp();
    expect(await screen.findByRole("button", { name: "Se déconnecter" })).toBeInTheDocument();
  });

  it("retourne à la connexion si le jeton est expiré", async () => {
    localStorage.setItem("suivi.jeton", "jeton-expire");
    simulerApi({ "GET /api/auth/moi": { status: 401, corps: { erreur: "Authentification requise" } } });
    afficherApp();
    expect(await screen.findByRole("button", { name: "Se connecter" })).toBeInTheDocument();
    expect(localStorage.getItem("suivi.jeton")).toBeNull();
  });
});

describe("Tableau de bord", () => {
  it("crée une candidature avec le formulaire et l'ajoute au tableau", async () => {
    localStorage.setItem("suivi.jeton", "jeton-abc");
    const appels = simulerApi({
      "GET /api/auth/moi": { status: 200, corps: ana },
      "GET /api/candidatures": { status: 200, corps: [] },
      "POST /api/candidatures": { status: 201, corps: { ...mirego, id: 8, entreprise: "Exfo", statut: "a_envoyer" } },
    });
    afficherApp();

    await userEvent.click(await screen.findByRole("button", { name: "+ Nouvelle candidature" }));
    await userEvent.type(screen.getByLabelText("Entreprise *"), "Exfo");
    await userEvent.type(screen.getByLabelText("Poste *"), "Stagiaire");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(await screen.findByText("Exfo")).toBeInTheDocument();
    expect(appels.find((a) => a.methode === "POST")?.corps).toEqual({
      entreprise: "Exfo", poste: "Stagiaire", statut: "a_envoyer", dateEnvoi: null, lien: null, notes: null,
    });
  });
});
