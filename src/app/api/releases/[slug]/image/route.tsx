import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";

export const alt = "Konsensus release card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: release } = await admin
    .from("release_announcements")
    .select("title, summary, features, created_at")
    .eq("slug", slug)
    .single<{
      title: string;
      summary: string;
      features: string[];
      created_at: string;
    }>();

  if (!release) {
    return new Response("Not found", { status: 404 });
  }

  const features = release.features.slice(0, 4);
  const date = new Date(release.created_at).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(circle at top left, rgba(56,189,248,0.25), transparent 35%), radial-gradient(circle at bottom right, rgba(168,85,247,0.30), transparent 35%), #0b1020",
          color: "white",
          padding: "54px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              fontSize: 28,
              color: "#c4b5fd",
            }}
          >
            <span>🚀</span>
            <span>Konsensus Release</span>
          </div>
          <div
            style={{
              border: "1px solid rgba(196,181,253,0.28)",
              borderRadius: 999,
              padding: "10px 18px",
              fontSize: 22,
              color: "#ddd6fe",
              background: "rgba(139,92,246,0.12)",
            }}
          >
            {date}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.05, maxWidth: "88%" }}>
            {release.title}
          </div>
          <div style={{ fontSize: 28, lineHeight: 1.4, color: "#d1d5db", maxWidth: "78%" }}>
            {release.summary}
          </div>
        </div>

        <div style={{ display: "flex", gap: "18px", flexWrap: "wrap" }}>
          {features.map((feature) => (
            <div
              key={feature}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
                borderRadius: 22,
                padding: "16px 22px",
                fontSize: 24,
                color: "#f3f4f6",
                maxWidth: "48%",
              }}
            >
              <span style={{ color: "#38bdf8" }}>•</span>
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
