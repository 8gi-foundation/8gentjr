export default function Home() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", textAlign: "center" }}>
      <h1 style={{ fontSize: "clamp(2rem, 5vw, 4rem)", fontWeight: 800, color: "#E8610A", marginBottom: "0.5rem" }}>
        8gent Jr
      </h1>
      <p style={{ fontSize: "clamp(1rem, 2.5vw, 1.5rem)", color: "#555", maxWidth: 600, lineHeight: 1.6 }}>
        A personalised AI companion for neurodivergent children.
        <br />Free forever. Built with love.
      </p>
      <p style={{ marginTop: "2rem", fontSize: "0.9rem", color: "#999" }}>
        Coming soon from the <a href="https://8gent.world" style={{ color: "#E8610A" }}>8GI Foundation</a>
      </p>
    </main>
  );
}
