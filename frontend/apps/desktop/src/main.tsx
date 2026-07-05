import { MockBackend } from "@superion/api-client";
import { config } from "@superion/config";
import { setupI18n } from "@superion/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "@/App";
import { createServices } from "@/services/container";
import { ServicesProvider } from "@/services/context";
import "@/index.css";

setupI18n(config.defaultLocale);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const services = createServices();

if (config.isDev) {
  (globalThis as Record<string, unknown>).__superion = {
    api: services.api,
    config,
    reset: () => MockBackend.shared().reset(),
  };
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ServicesProvider services={services}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ServicesProvider>
    </QueryClientProvider>
  </StrictMode>,
);
