import "@testing-library/jest-dom/vitest"; // ajoute expect(...).toBeInTheDocument(), etc.
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup(); // retire les composants affichés par le test précédent
  vi.restoreAllMocks();
  localStorage.clear();
});
