import { expect, test } from "@playwright/test";

test.describe("Public smoke flows", () => {
  test("landing page renders primary CTAs", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /Спор — это/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Начать бесплатно/i }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Арена вызовов|Арена/i }).first()
    ).toBeVisible();
  });

  test("public feed opens without auth", async ({ page }) => {
    await page.goto("/feed");

    await expect(
      page.getByRole("heading", { name: /Публичные споры/i })
    ).toBeVisible();
  });

  test("arena is visible to guests and shows entry affordance", async ({ page }) => {
    await page.goto("/arena");

    await expect(
      page.getByRole("heading", { name: /Арена вызовов/i })
    ).toBeVisible();

    await expect(
      page.getByText(/Нет активных вызовов|открытых вызовов/i)
    ).toBeVisible();
  });

  test("telegram mini app page shows fallback outside telegram", async ({ page }) => {
    await page.goto("/tg");

    await expect(
      page.getByRole("heading", { name: /Ошибка|Аккаунт не привязан/i })
    ).toBeVisible();
  });
});
