"use client";

import { FormEvent, useMemo, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const STARTER_MESSAGE: Message = {
  role: "assistant",
  content:
    "Hi, I can help find Mustang parts or point you toward the shop for fitment and service questions.",
};

export function StoreChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([STARTER_MESSAGE]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const visibleMessages = useMemo(() => messages.slice(-8), [messages]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || isSending) {
      return;
    }

    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ messages: nextMessages.slice(-10) }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Chat failed.");
      }
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            typeof payload.reply === "string"
              ? payload.reply
              : "I could not generate an answer. Please contact Mustang Magic.",
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "Chat is temporarily unavailable. Please contact Mustang Magic directly for help.",
        },
      ]);
    } finally {
      setIsSending(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 grid justify-items-end gap-3">
      {isOpen ? (
        <section
          aria-label="Mustang Magic chat"
          className="flex max-h-[min(640px,calc(100vh-7rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded border border-zinc-300 bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-950 px-4 py-3 text-white">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide">
                Mustang Magic Chat
              </h2>
              <p className="mt-1 text-xs font-medium text-zinc-300">
                Parts help and shop questions
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded border border-zinc-700 px-2 py-1 text-xs font-bold uppercase tracking-wide text-zinc-200 hover:border-zinc-400"
            >
              Close
            </button>
          </div>

          <div className="grid flex-1 gap-3 overflow-y-auto bg-zinc-50 p-4">
            {visibleMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}-${message.content.slice(0, 12)}`}
                className={[
                  "max-w-[88%] rounded px-3 py-2 text-sm leading-6",
                  message.role === "user"
                    ? "justify-self-end bg-red-700 text-white"
                    : "justify-self-start border border-zinc-200 bg-white text-zinc-800",
                ].join(" ")}
              >
                {message.content}
              </div>
            ))}
            {isSending ? (
              <div className="justify-self-start rounded border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-500">
                Thinking...
              </div>
            ) : null}
          </div>

          <form onSubmit={sendMessage} className="grid gap-2 border-t border-zinc-200 p-3">
            <label htmlFor="store-chat-message" className="sr-only">
              Message
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                id="store-chat-message"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                maxLength={500}
                placeholder="Ask about Mustang parts..."
                className="min-h-11 flex-1 rounded border border-zinc-300 px-3 text-sm text-zinc-950 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-700/15"
              />
              <button
                type="submit"
                disabled={isSending || input.trim().length === 0}
                className="min-h-11 rounded bg-red-700 px-4 text-sm font-black uppercase tracking-wide text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                Send
              </button>
            </div>
            <p className="text-xs leading-5 text-zinc-500">
              This assistant can be wrong. Confirm fitment, price, inventory,
              and service details with Mustang Magic.
            </p>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setIsOpen((current) => !current);
          window.setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="rounded bg-red-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white shadow-xl hover:bg-red-800"
      >
        Chat
      </button>
    </div>
  );
}
