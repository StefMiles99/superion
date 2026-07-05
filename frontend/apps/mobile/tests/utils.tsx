import { MemoryStorage } from "@superion/auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { createServices, type Services } from "@/services/container";
import { ServicesProvider } from "@/services/context";

export function renderWithProviders(
  ui: ReactElement,
  opts: { route?: string; services?: Services } = {},
): RenderResult & { services: Services } {
  const services = opts.services ?? createServices(new MemoryStorage());
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const result = render(
    <QueryClientProvider client={queryClient}>
      <ServicesProvider services={services}>
        <MemoryRouter initialEntries={[opts.route ?? "/"]}>{ui}</MemoryRouter>
      </ServicesProvider>
    </QueryClientProvider>,
  );

  return { ...result, services };
}
