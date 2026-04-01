"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ChangePreview, { type ChangeDetail } from "./ChangePreview";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MessageRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  /** If this message proposes a change, attach the detail here */
  change?: ChangeDetail & { status: "pending" | "confirmed" | "undone" };
}

// ---------------------------------------------------------------------------
// Intent detection — hard-coded regex patterns (v1, no LLM)
// ---------------------------------------------------------------------------

interface DetectedIntent {
  type: "add_card" | "remove_card" | "set_columns" | "find_symbol" | "unknown";
  params: Record<string, string>;
}

function detectIntent(input: string): DetectedIntent {
  const lower = input.toLowerCase().trim();

  // "add card X to Y grid" / "add X to Y"
  const addMatch = lower.match(
    /add\s+(?:card\s+)?["']?(.+?)["']?\s+(?:to\s+)?(?:the\s+)?["']?(.+?)["']?\s*(?:grid|board|page)?$/
  );
  if (addMatch) {
    return { type: "add_card", params: { card: addMatch[1], grid: addMatch[2] } };
  }

  // "remove card X" / "delete X card"
  const removeMatch = lower.match(
    /(?:remove|delete)\s+(?:card\s+)?["']?(.+?)["']?\s*(?:card)?$/
  );
  if (removeMatch) {
    return { type: "remove_card", params: { card: removeMatch[1] } };
  }

  // "make grid N columns" / "set columns to N" / "N columns"
  const colMatch = lower.match(
    /(?:make|set|change)?\s*(?:the\s+)?(?:grid\s+)?(?:to\s+)?(\d+)\s*columns?/
  );
  if (colMatch) {
    return { type: "set_columns", params: { columns: colMatch[1] } };
  }

  // "find symbol for X" / "search symbol X"
  const symbolMatch = lower.match(
    /(?:find|search|look\s+up|get)\s+(?:a\s+)?(?:symbol|icon|image)\s+(?:for\s+)?["']?(.+?)["']?$/
  );
  if (symbolMatch) {
    return { type: "find_symbol", params: { term: symbolMatch[1] } };
  }

  return { type: "unknown", params: {} };
}

// ---------------------------------------------------------------------------
// Response generation
// ---------------------------------------------------------------------------

function generateResponse(intent: DetectedIntent): {
  text: string;
  change?: ChangeDetail;
} {
  switch (intent.type) {
    case "add_card":
      return {
        text: `Got it! I'll add "${intent.params.card}" to the ${intent.params.grid} grid.`,
        change: {
          description: `Add "${intent.params.card}" card to ${intent.params.grid}`,
          before: `${intent.params.grid} grid (current cards)`,
          after: `${intent.params.grid} grid + "${intent.params.card}"`,
        },
      };

    case "remove_card":
      return {
        text: `Removing the "${intent.params.card}" card.`,
        change: {
          description: `Remove "${intent.params.card}" card`,
          before: `Board with "${intent.params.card}"`,
          after: `Board without "${intent.params.card}"`,
        },
      };

    case "set_columns":
      return {
        text: `Changing the grid to ${intent.params.columns} columns.`,
        change: {
          description: `Change grid density to ${intent.params.columns} columns`,
          before: "Current grid layout",
          after: `${intent.params.columns}-column grid`,
        },
      };

    case "find_symbol":
      return {
        text: `Searching for a symbol for "${intent.params.term}"... Symbol search isn't wired up yet, but I've noted the request!`,
      };

    case "unknown":
    default:
      return {
        text: "I can help you customise the board! Try things like:\n- \"Add card Banana to food grid\"\n- \"Make grid 6 columns\"\n- \"Remove card Stop\"\n- \"Find symbol for happy\"",
      };
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    height: "100vh",
    minHeight: "100dvh",
    background: "#FAFAF8",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    borderBottom: "1px solid #E5E7EB",
    background: "#fff",
  },
  headerTitle: {
    fontSize: "1.1rem",
    fontWeight: 700 as const,
    color: "#1F2937",
  },
  headerSub: {
    fontSize: "0.75rem",
    color: "#9CA3AF",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    border: "2px solid #E5E7EB",
    background: "#fff",
    fontSize: 18,
    cursor: "pointer",
    display: "flex",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  messages: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  },
  bubble: (isUser: boolean) => ({
    maxWidth: "85%",
    alignSelf: isUser ? ("flex-end" as const) : ("flex-start" as const),
    background: isUser ? "#E8610A" : "#fff",
    color: isUser ? "#fff" : "#1F2937",
    borderRadius: 16,
    borderBottomRightRadius: isUser ? 4 : 16,
    borderBottomLeftRadius: isUser ? 16 : 4,
    padding: "10px 14px",
    fontSize: "0.9rem",
    lineHeight: 1.5,
    boxShadow: isUser ? "none" : "0 1px 4px rgba(0,0,0,0.08)",
    border: isUser ? "none" : "1px solid #E5E7EB",
    whiteSpace: "pre-wrap" as const,
  }),
  inputRow: {
    display: "flex",
    gap: 8,
    padding: "12px 16px",
    borderTop: "1px solid #E5E7EB",
    background: "#fff",
    paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
  },
  input: {
    flex: 1,
    fontSize: "1rem",
    padding: "10px 14px",
    borderRadius: 12,
    border: "2px solid #E5E7EB",
    outline: "none",
    fontFamily: "inherit",
    background: "#FAFAF8",
  },
  sendBtn: {
    width: 48,
    height: 48,
    minWidth: 48,
    borderRadius: 12,
    border: "none",
    background: "#E8610A",
    color: "#fff",
    fontSize: 20,
    fontWeight: 700 as const,
    cursor: "pointer",
    display: "flex",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    transition: "transform 0.1s",
  },
  emptyState: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 12,
    padding: 32,
    color: "#9CA3AF",
  },
  emptyTitle: {
    fontSize: "1.25rem",
    fontWeight: 700 as const,
    color: "#374151",
  },
  emptyHint: {
    fontSize: "0.85rem",
    color: "#9CA3AF",
    textAlign: "center" as const,
    lineHeight: 1.6,
    maxWidth: 340,
  },
  suggestionChip: {
    display: "inline-block",
    padding: "6px 14px",
    borderRadius: 20,
    border: "2px solid #FDBA74",
    background: "#FFF8F0",
    color: "#92400E",
    fontSize: "0.8rem",
    fontWeight: 600 as const,
    cursor: "pointer",
    transition: "background 0.1s",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

let msgIdCounter = 0;
function nextId() {
  return `msg-${++msgIdCounter}-${Date.now()}`;
}

export default function ParentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      const userMsg: ChatMessage = {
        id: nextId(),
        role: "user",
        text: text.trim(),
      };

      const intent = detectIntent(text);
      const response = generateResponse(intent);

      const assistantMsg: ChatMessage = {
        id: nextId(),
        role: "assistant",
        text: response.text,
        change: response.change
          ? { ...response.change, status: "pending" }
          : undefined,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
    },
    [],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleConfirmChange = useCallback((msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.change
          ? { ...m, change: { ...m.change, status: "confirmed" as const } }
          : m
      )
    );
  }, []);

  const handleUndoChange = useCallback((msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.change
          ? { ...m, change: { ...m.change, status: "undone" as const } }
          : m
      )
    );
  }, []);

  const suggestions = [
    "Add card Banana to food grid",
    "Make grid 6 columns",
    "Remove card Stop",
    "Find symbol for happy",
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <a href="/" style={{ textDecoration: "none" }}>
          <button style={styles.backBtn} aria-label="Back to home">
            &larr;
          </button>
        </a>
        <div>
          <div style={styles.headerTitle}>Parent Chat</div>
          <div style={styles.headerSub}>
            Customise your child&apos;s board with words
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div style={styles.messages}>
        {messages.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: 48 }}>&#x1F4AC;</div>
            <div style={styles.emptyTitle}>Hi there!</div>
            <div style={styles.emptyHint}>
              Tell me what you want to change on your child&apos;s board. I
              understand things like adding cards, changing grid size, and
              removing cards.
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                justifyContent: "center",
                marginTop: 8,
              }}
            >
              {suggestions.map((s) => (
                <button
                  key={s}
                  style={styles.suggestionChip}
                  onClick={() => sendMessage(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id}>
              <div style={styles.bubble(msg.role === "user")}>{msg.text}</div>
              {msg.change && msg.change.status === "pending" && (
                <ChangePreview
                  change={msg.change}
                  onConfirm={() => handleConfirmChange(msg.id)}
                  onUndo={() => handleUndoChange(msg.id)}
                />
              )}
              {msg.change && msg.change.status === "confirmed" && (
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "#059669",
                    fontWeight: 600,
                    marginTop: 6,
                    padding: "4px 10px",
                    background: "#D1FAE5",
                    borderRadius: 8,
                    display: "inline-block",
                  }}
                >
                  &#10003; Change applied
                </div>
              )}
              {msg.change && msg.change.status === "undone" && (
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "#DC2626",
                    fontWeight: 600,
                    marginTop: 6,
                    padding: "4px 10px",
                    background: "#FEE2E2",
                    borderRadius: 8,
                    display: "inline-block",
                  }}
                >
                  &#10005; Change reverted
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={styles.inputRow}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tell me what to change..."
          style={styles.input}
          aria-label="Chat message input"
        />
        <button
          type="submit"
          style={{
            ...styles.sendBtn,
            opacity: input.trim() ? 1 : 0.5,
          }}
          disabled={!input.trim()}
          aria-label="Send message"
        >
          &#8593;
        </button>
      </form>
    </div>
  );
}
