"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

interface ChatPanelProps {
  onClose: () => void;
}

export const ChatPanel = ({ onClose }: ChatPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = input.trim();
    if (!value || isSending) {
      return;
    }

    setMessages((previous) => [...previous, { role: "user", text: value }]);
    setInput("");
    setIsSending(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: value }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        reply?: string;
        error?: { message?: string };
      };

      if (!response.ok || !payload.ok || !payload.reply) {
        throw new Error(payload.error?.message ?? "Unable to fetch chat response.");
      }

      setMessages((previous) => [...previous, { role: "assistant", text: payload.reply ?? "" }]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to fetch chat response.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[min(92vw,380px)] rounded-xl border border-white/10 bg-surface/95 p-4 shadow-soft backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-textPrimary">Finance Assistant</h4>
        <Button type="button" variant="ghost" className="h-7 px-2 text-xs" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="mb-3 h-64 space-y-2 overflow-y-auto rounded-lg border border-white/10 bg-bg/50 p-3">
        {messages.length === 0 ? <p className="text-sm text-textSecondary">Ask a question about your finances.</p> : null}
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`rounded-lg px-3 py-2 text-sm ${
              message.role === "user" ? "ml-8 bg-accent/20 text-textPrimary" : "mr-8 bg-white/5 text-textSecondary"
            }`}
          >
            {message.text}
          </div>
        ))}
      </div>

      <form className="space-y-2" onSubmit={onSubmit}>
        <Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about spending, profit, trends..." />
        <Button type="submit" className="w-full" disabled={isSending}>
          {isSending ? "Sending..." : "Send"}
        </Button>
      </form>

      {errorMessage ? <p className="mt-2 text-sm text-expense">{errorMessage}</p> : null}
    </div>
  );
};

