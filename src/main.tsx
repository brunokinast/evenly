import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css"; // first: theme.ts reads its tokens
import "@/app/theme";
import "@/app/viewport";
import "@/app/install";
import { App } from "@/app/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
