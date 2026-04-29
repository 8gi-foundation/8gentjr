"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type MessageRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
}

let msgIdCounter = 0;
function nextId() {
  return `msg-${++msgIdCounter}-${Date.now()}`;
}

const SUGGESTIONS = [
  "What is AAC and what kinds of strategies exist?",
  "What is the difference between core and fringe vocabulary?",
  "What public resources can I read about gestalt language processing?",
  "What kinds of questions are good to bring to a speech-language therapist?",
];

export default function ParentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { id: nextId(), role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.text,
      }));

      const res = await fetch("/api/parent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      const data = await res.json();
      const reply = data.reply || "Sorry, I couldn't get a response. Please try again.";

      setMessages((prev) => [...prev, { id: nextId(), role: "assistant", text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", text: "Something went wrong. Check your connection and try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col h-screen min-h-[100dvh] bg-[#FAFAF8] font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
        <a href="/talk">
          <button
            className="w-10 h-10 rounded-[10px] border-2 border-gray-200 bg-white text-lg cursor-pointer flex items-center justify-center"
            aria-label="Back"
          >
            &larr;
          </button>
        </a>
        <div>
          <div className="text-[1.1rem] font-bold text-gray-800">Parent Chat</div>
          <div className="text-xs text-gray-400">AAC education for parents</div>
        </div>
      </div>

      {/* Non-clinical disclaimer banner. Persistent. EU MDR + AI Act guard. */}
      <div
        role="note"
        aria-label="Non-clinical disclaimer"
        className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-[0.78rem] leading-snug text-amber-900"
      >
        AAC education, not medical advice. For clinical guidance about your child, consult a qualified speech-language therapist.
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-gray-400">
            <div className="text-5xl">&#x1F4AC;</div>
            <div className="text-xl font-bold text-gray-700">Ask anything</div>
            <div className="text-sm text-gray-400 text-center leading-relaxed max-w-[340px]">
              General AAC education for parents. For questions about a specific child, please consult a qualified speech-language therapist.
            </div>
            <div className="flex flex-col gap-2 mt-2 w-full max-w-sm">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="text-left px-3.5 py-2.5 rounded-xl border-2 border-orange-200 bg-[#FFF8F0] text-amber-900 text-xs font-medium cursor-pointer transition-colors hover:bg-orange-100"
                  onClick={() => sendMessage(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "self-end bg-[#E8610A] text-white rounded-br-sm"
                  : "self-start bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-200"
              }`}
            >
              {msg.text}
            </div>
          ))
        )}

        {isLoading && (
          <div className="self-start bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
            <div className="flex gap-1 items-center">
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 px-4 py-3 border-t border-gray-200 bg-white pb-[calc(12px+env(safe-area-inset-bottom))]"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your child's AAC..."
          className="flex-1 text-base px-3.5 py-2.5 rounded-xl border-2 border-gray-200 outline-none font-[inherit] bg-[#FAFAF8] focus:border-[#E8610A] transition-colors"
          aria-label="Chat message input"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="w-12 h-12 min-w-[48px] rounded-xl border-none bg-[#E8610A] text-white text-xl font-bold cursor-pointer flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40"
          disabled={!input.trim() || isLoading}
          aria-label="Send message"
        >
          &#8593;
        </button>
      </form>
    </div>
  );
}
