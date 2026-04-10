import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const size = Number(req.nextUrl.searchParams.get("size") || "512");
  const maskable = req.nextUrl.searchParams.get("maskable") === "1";

  // Maskable icons need extra padding (safe zone is inner 80%)
  const padding = maskable ? size * 0.1 : 0;
  const fontSize = Math.round((maskable ? size * 0.32 : size * 0.4));

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: "linear-gradient(135deg, #0E0F0F 0%, #1a1a2e 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding,
          borderRadius: maskable ? 0 : size * 0.22,
        }}
      >
        <span
          style={{
            fontSize,
            fontWeight: 800,
            color: "#C9A84C",
            letterSpacing: `${-fontSize * 0.025}px`,
          }}
        >
          8.
        </span>
      </div>
    ),
    { width: size, height: size },
  );
}
