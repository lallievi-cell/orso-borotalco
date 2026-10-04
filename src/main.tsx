import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { OrsoGame } from "@/components/OrsoGame";
import "@/styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Manca #root");

createRoot(root).render(
  <StrictMode>
    <OrsoGame />
  </StrictMode>,
);
