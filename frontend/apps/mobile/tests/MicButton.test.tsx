import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MicButton } from "@/components/MicButton";
import { renderWithProviders } from "./utils";

describe("MicButton", () => {
  it("muestra la etiqueta según el estado de voz", () => {
    renderWithProviders(<MicButton state="listening" onToggle={() => {}} />);
    expect(screen.getByText("Escuchando")).toBeInTheDocument();
  });

  it("invoca onToggle al pulsar", async () => {
    const onToggle = vi.fn();
    renderWithProviders(<MicButton state="idle" onToggle={onToggle} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
