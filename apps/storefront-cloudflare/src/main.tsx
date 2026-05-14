import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initGoogleAnalytics } from "./lib/analytics";
import { initSalesforceDataCloud } from "./lib/salesforceDataCloud";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing #root mount element");
}

void initSalesforceDataCloud();
initGoogleAnalytics();

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
