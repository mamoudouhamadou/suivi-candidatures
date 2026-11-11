import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { FournisseurAuth } from "./auth";
import "./styles.css";

// Point d'entrée : React prend le contrôle de <div id="racine"> dans index.html.
createRoot(document.getElementById("racine")!).render(
  <StrictMode>
    <FournisseurAuth>
      <App />
    </FournisseurAuth>
  </StrictMode>,
);
