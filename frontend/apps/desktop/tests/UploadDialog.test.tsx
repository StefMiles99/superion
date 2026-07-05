import { MockBackend } from "@superion/api-client";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UploadDialog } from "@/components/UploadDialog";
import { renderWithProviders } from "./utils";

describe("UploadDialog", () => {
  beforeEach(() => {
    MockBackend.shared().reset();
  });

  it("rechaza un archivo que no es PDF", async () => {
    const { container } = renderWithProviders(<UploadDialog onClose={() => {}} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const png = new File(["x"], "foto.png", { type: "image/png" });
    await userEvent.upload(input, png, { applyAccept: false });
    expect(await screen.findByText("El archivo debe ser un PDF")).toBeInTheDocument();
  });

  it("sube un PDF válido y cierra el diálogo", async () => {
    const onClose = vi.fn();
    const { container } = renderWithProviders(<UploadDialog onClose={onClose} />);

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/Service Manual/), "Manual de prueba");
    await user.type(screen.getByPlaceholderText(/Atlas Copco GA-37$/), "Modelo X");

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const pdf = new File(["%PDF-1.4 contenido"], "manual.pdf", { type: "application/pdf" });
    await user.upload(input, pdf);

    await user.click(screen.getByRole("button", { name: "Subir e indexar" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(MockBackend.shared().listManuals().items.some((m) => m.title === "Manual de prueba")).toBe(
      true,
    );
  });
});
