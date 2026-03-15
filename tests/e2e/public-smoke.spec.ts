import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { loadLocalEnv } from "./helpers/local-env";

const localEnv = loadLocalEnv();
const hasTelegramCta = Boolean(process.env.TELEGRAM_BOT_USERNAME ?? localEnv.TELEGRAM_BOT_USERNAME);

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(metrics.scrollWidth - metrics.clientWidth).toBeLessThanOrEqual(1);
}

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
    if (hasTelegramCta) {
      await expect(
        page.getByRole("link", { name: /Войти через Telegram/i }).first()
      ).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);
  });

  test("public feed opens without auth", async ({ page }) => {
    await page.goto("/feed");

    await expect(
      page.getByRole("heading", { name: /Публичные споры/i })
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("arena is visible to guests and shows entry affordance", async ({ page }) => {
    await page.goto("/arena");

    await expect(
      page.getByRole("heading", { name: /Арена вызовов/i })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: /Идущие бои/i })
    ).toBeVisible();
    await expect(
      page.getByText(/Нет активных вызовов|открытых вызовов/i).first()
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("support page renders support links without layout overflow", async ({ page }) => {
    await page.goto("/support");

    await expect(
      page.getByRole("heading", { name: /Поддержать/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Boosty/i }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Crypto/i }).first()
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("login and register pages keep Telegram CTA visible", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /Войти/i })).toBeVisible();
    if (hasTelegramCta) {
      await expect(page.getByRole("link", { name: /Войти через Telegram/i }).first()).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);

    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /Регистрация/i })).toBeVisible();
    if (hasTelegramCta) {
      await expect(page.getByRole("link", { name: /Войти через Telegram/i }).first()).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);
  });

  test("telegram mini app page shows fallback outside telegram", async ({ page }) => {
    await page.goto("/tg");

    await expect(
      page.getByText(/Эта страница работает только внутри Telegram/i)
    ).toBeVisible({ timeout: 10_000 });
    await expectNoHorizontalOverflow(page);
  });
});
