import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TableauKanban } from "../composants/TableauKanban";
import type { Candidature } from "../types";

// On teste le composant comme un utilisateur : on cherche par texte et par rôle (accessibilité),
// pas par classes CSS. Les fonctions sont des « espions » (vi.fn) qui enregistrent leurs appels.

function candidature(partiel: Partial<Candidature>): Candidature {
  return {
    id: 1, entreprise: "Mirego", poste: "Stagiaire", statut: "envoyee",
    dateEnvoi: null, lien: null, notes: null, creeLe: "", modifieLe: "",
    ...partiel,
  };
}

const donnees = [
  candidature({ id: 1, entreprise: "Mirego", statut: "envoyee", dateEnvoi: "2026-11-10" }),
  candidature({ id: 2, entreprise: "Exfo", statut: "envoyee" }),
  candidature({ id: 3, entreprise: "Coveo", statut: "entrevue", lien: "https://coveo.com/offre" }),
];

function afficher() {
  const espions = { onChangerStatut: vi.fn(), onModifier: vi.fn(), onSupprimer: vi.fn() };
  render(<TableauKanban candidatures={donnees} {...espions} />);
  return espions;
}

describe("TableauKanban", () => {
  it("affiche une colonne par statut avec le bon nombre de cartes", () => {
    afficher();
    const envoyees = screen.getByRole("region", { name: /Envoyée/ });
    expect(within(envoyees).getAllByRole("listitem")).toHaveLength(2);
    expect(within(envoyees).getByText("Mirego")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: /Offre/ })).getByText("Aucune")).toBeInTheDocument();
  });

  it("affiche la date en français et un lien sécurisé vers l'offre", () => {
    afficher();
    expect(screen.getByText(/Envoyée le 10 nov\.? 2026/)).toBeInTheDocument();
    const lien = screen.getByRole("link", { name: /Voir l'offre/ });
    expect(lien).toHaveAttribute("href", "https://coveo.com/offre");
    expect(lien).toHaveAttribute("rel", "noopener noreferrer"); // empêche la page ouverte de contrôler la nôtre
  });

  it("change le statut avec la liste déroulante (accessible au clavier)", async () => {
    const { onChangerStatut } = afficher();
    await userEvent.selectOptions(screen.getByLabelText("Statut de Exfo"), "offre");
    expect(onChangerStatut).toHaveBeenCalledWith(2, "offre");
  });

  it("appelle modifier et supprimer avec la bonne candidature", async () => {
    const { onModifier, onSupprimer } = afficher();
    await userEvent.click(screen.getByRole("button", { name: "Modifier Coveo" }));
    await userEvent.click(screen.getByRole("button", { name: "Supprimer Mirego" }));
    expect(onModifier).toHaveBeenCalledWith(expect.objectContaining({ id: 3 }));
    expect(onSupprimer).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });
});
