import { expect, test } from "@playwright/test";
import { loginWithPassword } from "./helpers/auth";
import {
  cleanupArenaLiveFixture,
  createArenaLiveFixture,
  type ArenaLiveFixture,
} from "./helpers/fixtures";

test.describe.serial("Arena live spectator layer", () => {
  test.setTimeout(180_000);

  let fixture: ArenaLiveFixture;

  test.beforeAll(async () => {
    fixture = await createArenaLiveFixture();
  });

  test.afterAll(async () => {
    await cleanupArenaLiveFixture(fixture);
  });

  test("guest can discover and open a live battle", async ({ page }) => {
    await page.goto("/arena");

    await expect(page.getByRole("heading", { name: /Арена вызовов/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Идущие бои/i })).toBeVisible();
    await expect(page.getByText(fixture.topic)).toBeVisible();

    await expect(page.locator(`a[href="/arena/${fixture.challengeId}"]`).first()).toBeVisible();
    await page.goto(`/arena/${fixture.challengeId}`);

    await expect(page).toHaveURL(new RegExp(`/arena/${fixture.challengeId}$`));
    await expect(page.getByRole("heading", { name: /Live battle/i })).toBeVisible();
    await expect(page.getByText(/Подписка в Telegram/i)).toBeVisible();
    await expect(page.getByText(/Войдите, чтобы подписаться/i)).toBeVisible();
    await expect(page.getByText(/Теневой медиатор/i)).toBeVisible();
    await expect(page.getByText("Чат наблюдателей", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /^Открыть$/ }).click();
    await expect(page.getByText(/Прогноз и ставки/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Параллельный кейс/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Отправить раунд/i })).toHaveCount(0);
  });

  test("watcher can subscribe, chat and leave an opinion", async ({ page }) => {
    await loginWithPassword(page, fixture.users.watcher.email, fixture.users.watcher.password);
    await page.goto(`/arena/${fixture.challengeId}`);

    await page.getByRole("button", { name: /Подписаться на бой в Telegram/i }).click();
    await expect(
      page.getByRole("button", { name: /Вы подписаны в Telegram/i })
    ).toBeVisible({ timeout: 10_000 });

    await page.getByPlaceholder(/Короткий комментарий наблюдателя/i).fill("Наблюдаю: spectator-layer выглядит живым и понятным.");
    await page.getByRole("button", { name: /^Отправить$/ }).click();
    await expect(page.getByText(/spectator-layer выглядит живым/i)).toBeVisible();

    await page.getByPlaceholder(/Какой угол взгляда мог бы помочь/i).fill("Стоит подчеркнуть не правоту, а то, что оба пытаются сохранить ощущение контроля.");
    await page.getByRole("button", { name: /Отправить мнение/i }).click();
    await expect(page.getByText(/1\/3/)).toBeVisible();
  });

  test("arena typing indicator is visible to the other participant and spectators", async ({ browser }) => {
    const authorContext = await browser.newContext();
    const opponentContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const authorPage = await authorContext.newPage();
    const opponentPage = await opponentContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      await loginWithPassword(authorPage, fixture.users.author.email, fixture.users.author.password);
      await loginWithPassword(opponentPage, fixture.users.opponent.email, fixture.users.opponent.password);

      await authorPage.goto(`/arena/${fixture.challengeId}`);
      await opponentPage.goto(`/arena/${fixture.challengeId}`);
      await guestPage.goto(`/arena/${fixture.challengeId}`);
      await expect(guestPage.getByText("Чат наблюдателей", { exact: true })).toBeVisible();
      await guestPage.waitForTimeout(1000);

      const arenaTextarea = opponentPage.getByPlaceholder(/Ответьте на аргумент оппонента/i);
      await arenaTextarea.fill("Печатаю тестовый ответ, чтобы проверить realtime typing banner.");

      await expect(authorPage.getByText(/печатает ответ/i)).toBeVisible({ timeout: 10_000 });
      await expect(guestPage.getByText(/печатает ответ/i)).toBeVisible({ timeout: 10_000 });
    } finally {
      await authorContext.close();
      await opponentContext.close();
      await guestContext.close();
    }
  });

  test("main dispute typing indicator is visible while opponent writes a response", async ({ browser }) => {
    const creatorContext = await browser.newContext();
    const opponentContext = await browser.newContext();
    const creatorPage = await creatorContext.newPage();
    const opponentPage = await opponentContext.newPage();

    try {
      await loginWithPassword(creatorPage, fixture.users.author.email, fixture.users.author.password);
      await loginWithPassword(opponentPage, fixture.users.opponent.email, fixture.users.opponent.password);

      await creatorPage.goto(`/dispute/${fixture.disputeId}`);
      await opponentPage.goto(`/dispute/${fixture.disputeId}/argue`);
      await opponentPage.waitForTimeout(1200);

      const disputeTextarea = opponentPage.locator('textarea[name="reasoning"]');
      await expect(disputeTextarea).toBeVisible();
      await disputeTextarea.click();
      await disputeTextarea.type("Проверяем typing indicator в основном споре.", { delay: 20 });

      await expect(creatorPage.getByText(/печатает ответ/i)).toBeVisible({ timeout: 10_000 });
    } finally {
      await creatorContext.close();
      await opponentContext.close();
    }
  });

  test("shadow mediator survives repeated remounts without major heap growth", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium");

    await page.goto(`/arena/${fixture.challengeId}`);
    const client = await page.context().newCDPSession(page);

    await client.send("HeapProfiler.enable");
    await client.send("HeapProfiler.collectGarbage");
    const before = await client.send("Runtime.getHeapUsage") as { usedSize: number };

    for (let index = 0; index < 6; index += 1) {
      await page.getByRole("button", { name: /^Открыть$/ }).click();
      await expect(page.getByText(/Прогноз и ставки/i)).toBeVisible();
      await page.getByRole("button", { name: /^Свернуть$/ }).click();
      await page.goto("/arena");
      await page.goto(`/arena/${fixture.challengeId}`);
    }

    await client.send("HeapProfiler.collectGarbage");
    const after = await client.send("Runtime.getHeapUsage") as { usedSize: number };

    expect(after.usedSize - before.usedSize).toBeLessThan(12 * 1024 * 1024);
  });
});
