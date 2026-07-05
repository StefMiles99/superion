import { MockBackend } from "@superion/api-client";
import { MemoryStorage } from "@superion/auth";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "@/App";
import { createServices } from "@/services/container";
import { renderWithProviders } from "./utils";

describe("flujo de login (offline, mock backend)", () => {
  beforeEach(() => {
    MockBackend.shared().reset();
  });

  it("autentica y muestra las órdenes de trabajo sin backend", async () => {
    const services = createServices(new MemoryStorage());
    renderWithProviders(<App />, { route: "/login", services });

    const user = userEvent.setup();
    const emailInput = await screen.findByLabelText("Correo");
    await user.clear(emailInput);
    await user.type(emailInput, "juan@planta.com");
    await user.clear(screen.getByLabelText("Contraseña"));
    await user.type(screen.getByLabelText("Contraseña"), "test1234");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() =>
      expect(screen.getByText("Órdenes de trabajo")).toBeInTheDocument(),
    );
    expect(await screen.findByText("Compresor C-3")).toBeInTheDocument();
  });

  it("muestra error con credenciales inválidas", async () => {
    const services = createServices(new MemoryStorage());
    renderWithProviders(<App />, { route: "/login", services });

    const user = userEvent.setup();
    const passwordInput = await screen.findByLabelText("Contraseña");
    await user.clear(passwordInput);
    await user.type(passwordInput, "mala");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() =>
      expect(screen.getByText("Credenciales inválidas")).toBeInTheDocument(),
    );
  });
});
