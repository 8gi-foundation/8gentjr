import type { Metadata } from "next";
import { OfflineBanner } from "../components/OfflineBanner";

export const metadata: Metadata = {
  title: "8gent Jr - AI for Every Child",
  description: "Personalised AI OS for neurodivergent children. Free forever. Built with love by the 8GI Foundation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Inter, system-ui, -apple-system, sans-serif", background: "#FFF8F0", color: "#1a1a2e" }}>
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
