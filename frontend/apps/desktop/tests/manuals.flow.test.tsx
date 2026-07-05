import { MockBackend } from "@superion/api-client";
import { MemoryStorage } from "@superion/auth";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "@/App";
import { createServices } from "@/services/container";
import { renderWithProviders } from "./utils";

describe("dashboard de manuales (offline)", () => {
  beforeEach(() => {
    MockBackend.shared().reset();
  });

  it("un admin inicia sesión y ve la lista de manuales", async () => {
    const services = createServices(new MemoryStorage());
    renderWithProviders(<App />, { route: "/login", services });

    const user = userEvent.setup();
    const email = await screen.findByLabelText("Correo");
    await user.clear(email);
    await user.type(email, "admin@planta.com");
    await user.clear(screen.getByLabelText("Contraseña"));
    await user.type(screen.getByLabelText("Contraseña"), "test1234");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(screen.getByText("Manuales técnicos")).toBeInTheDocument());
    expect(
      await screen.findByText("Atlas Copco GA-37 — Service Manual"),
    ).toBeInTheDocument();
  });

  it("un técnico (rol no admin) no puede acceder al panel", async () => {
    const services = createServices(new MemoryStorage());
    renderWithProviders(<App />, { route: "/login", services });

    const user = userEvent.setup();
    const email = await screen.findByLabelText("Correo");
    await user.clear(email);
    await user.type(email, "juan@planta.com");
    await user.clear(screen.getByLabelText("Contraseña"));
    await user.type(screen.getByLabelText("Contraseña"), "test1234");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() =>
      expect(
        screen.getByText(
          "Esta app es para supervisores y administradores RAG. Los técnicos deben usar la app móvil.",
        ),
      ).toBeInTheDocument(),
    );
  });
});
