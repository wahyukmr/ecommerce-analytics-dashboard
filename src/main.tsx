import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { LocaleProvider } from "./context/LocaleProvider.tsx";
import { SyntheticAnalyticsProvider } from "./context/SyntheticAnalyticsProvider.tsx";
import { createGeneratorConfig } from "./config/generatorConfig.ts";
import { resolveInitialDatasetUsers } from "./config/runtimeConfig.ts";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("The application root element (#root) was not found.");
}

createRoot(rootElement).render(
  <AppErrorBoundary>
    <StrictMode>
      <LocaleProvider>
        <SyntheticAnalyticsProvider
          config={createGeneratorConfig(resolveInitialDatasetUsers())}
        >
          <App />
        </SyntheticAnalyticsProvider>
      </LocaleProvider>
    </StrictMode>
  </AppErrorBoundary>,
);
