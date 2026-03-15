import fs from "node:fs/promises";

async function main() {
  const [, , filePath, target = "both"] = process.argv;

  if (!filePath) {
    console.error("Usage: node scripts/publish-release.mjs <release.json> [bot|channel|both]");
    process.exit(1);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!appUrl || !secret) {
    console.error("NEXT_PUBLIC_APP_URL and TELEGRAM_WEBHOOK_SECRET must be set.");
    process.exit(1);
  }

  const raw = await fs.readFile(filePath, "utf8");
  const release = JSON.parse(raw);

  const res = await fetch(`${appUrl.replace(/\/$/, "")}/api/telegram/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-broadcast-secret": secret,
    },
    body: JSON.stringify({ release, target }),
  });

  const json = await res.json();
  if (!res.ok) {
    console.error(JSON.stringify(json, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(json, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
