import { expect, test } from "@playwright/test";

test("login → orden → sesión de voz (mock)", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Correo").fill("juan@planta.com");
  await page.getByLabel("Contraseña").fill("test1234");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByText("Órdenes de trabajo")).toBeVisible();
  await page.getByText("Compresor C-3").click();

  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  // La sesión muestra el primer paso del procedimiento.
  await expect(page.getByText("Preparar área de trabajo")).toBeVisible();
});
