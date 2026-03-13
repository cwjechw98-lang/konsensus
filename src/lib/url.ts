import { headers } from "next/headers";

export async function getAppUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  return host.includes("localhost") ? `http://${host}` : `https://${host}`;
}
