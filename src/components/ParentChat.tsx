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

  const addMatch = lower.match(
    /add\s+(?:card\s+)?["']?(.+?)["']?\s+(?:to\s+)?(?:the\s+)?["']?(.+?)["']?\s*(?:grid|board|page)?$/
  );
  if (addMatch) {
    return { type: "add_card", params: { card: addMatch[1], grid: addMatch[2] } };
  }

  const removeMatch = lower.match(
    /(?:remove|delete)\s+(?:card\s+)?["']?(.+?)["']?\s*(?:card)?$/
  );
  if (removeMatch) {
    return { type: "remove_card", params: { card: removeMatch[1] } };
  }

  const colMatch = lower.match(
    /(?:make|set|change)?\s*(?:the\s+)?(?:grid\s+)?(?:to\s+)?(\d+)\s*columns?/
  );
  if (colMatch) {
    return { type: "set_columns", params: { columns: colMatch[1] } };
  }

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
    <div className="flex flex-col h-screen min-h-[100dvh] bg-[#FAFAF8] font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
        <a href="/">
          <button
            className="w-10 h-10 rounded-[10px] border-2 border-gray-200 bg-white text-lg cursor-pointer flex items-center justify-center"
            aria-label="Back to home"
          >
            &larr;
          </button>
        </a>
        <div>
          <div className="text-[1.1rem] font-bold text-gray-800">Parent Chat</div>
          <div className="text-xs text-gray-400">
            Customise your child&apos;s board with words
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-gray-400">
            <div className="text-5xl">&#x1F4AC;</div>
            <div className="text-xl font-bold text-gray-700">Hi there!</div>
            <div className="text-sm text-gray-400 text-center leading-relaxed max-w-[340px]">
              Tell me what you want to change on your child&apos;s board. I
              understand things like adding cards, changing grid size, and
              removing cards.
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  className="inline-block px-3.5 py-1.5 rounded-full border-2 border-orange-300 bg-[#FFF8F0] text-amber-800 text-xs font-semibold cursor-pointer transition-colors hover:bg-orange-100"
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
              <div
                className={
                  msg.role === "user"
                    ? "max-w-[85%] self-end bg-[#E8610A] text-white rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                    : "max-w-[85%] self-start bg-white text-gray-800 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm leading-relaxed shadow-sm border border-gray-200 whitespace-pre-wrap"
                }
              >
                {msg.text}
              </div>
              {msg.change && msg.change.status === "pending" && (
                <ChangePreview
                  change={msg.change}
                  onConfirm={() => handleConfirmChange(msg.id)}
                  onUndo={() => handleUndoChange(msg.id)}
                />
              )}
              {msg.change && msg.change.status === "confirmed" && (
                <div className="text-xs text-emerald-600 font-semibold mt-1.5 px-2.5 py-1 bg-emerald-100 rounded-lg inline-block">
                  &#10003; Change applied
                </div>
              )}
              {msg.change && msg.change.status === "undone" && (
                <div className="text-xs text-red-600 font-semibold mt-1.5 px-2.5 py-1 bg-red-100 rounded-lg inline-block">
                  &#10005; Change reverted
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 px-4 py-3 border-t border-gray-200 bg-white pb-[calc(12px+env(safe-area-inset-bottom))]">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tell me what to change..."
          className="flex-1 text-base px-3.5 py-2.5 rounded-xl border-2 border-gray-200 outline-none font-[inherit] bg-[#FAFAF8] focus:border-[#E8610A] transition-colors"
          aria-label="Chat message input"
        />
        <button
          type="submit"
          className="w-12 h-12 min-w-[48px] rounded-xl border-none bg-[#E8610A] text-white text-xl font-bold cursor-pointer flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50"
          disabled={!input.trim()}
          aria-label="Send message"
        >
          &#8593;
        </button>
      </form>
    </div>
  );
}
