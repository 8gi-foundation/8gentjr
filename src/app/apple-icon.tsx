import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "linear-gradient(135deg, #0E0F0F 0%, #1a1a2e 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 40,
        }}
      >
        <span
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: "#C9A84C",
            letterSpacing: "-2px",
          }}
        >
          8.
        </span>
      </div>
    ),
    { width: 180, height: 180 },
  );
}
