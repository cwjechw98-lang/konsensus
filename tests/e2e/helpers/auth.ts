import { expect, type Page } from "@playwright/test";

export async function loginWithPassword(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: /Войти/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}
