"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { X, Send } from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; text: string };

interface ChatPanelProps { onClose: () => void }

const resolveSupportedLanguage = (input: string) => {
  const base = input.split("-")[0];
  if (base === "hi" || base === "te" || base === "ta") return base;
  return "en";
};

export const ChatPanel = ({ onClose }: ChatPanelProps) => {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const language = useMemo(() => resolveSupportedLanguage(i18n.language), [i18n.language]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isSending]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = input.trim();
    if (!value || isSending) return;
    setMessages((prev) => [...prev, { role: "user", text: value }]);
    setInput("");
    setIsSending(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value, language }),
      });
      const payload = (await response.json()) as { ok?: boolean; reply?: string; error?: { message?: string } };
      if (!response.ok || !payload.ok || !payload.reply) throw new Error(payload.error?.message ?? t("chat.error"));
      setMessages((prev) => [...prev, { role: "assistant", text: payload.reply ?? "" }]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("chat.error"));
    } finally { setIsSending(false); }
  };

  return (
    <motion.div
      initial={{ y: 80, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 80, opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-6 right-6 z-50 w-[min(92vw,400px)] rounded-2xl border border-accent/12 bg-white shadow-[0_20px_60px_rgba(255,85,0,0.12)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-accent/[0.08] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 border border-accent/20">
            <span className="text-[10px] font-bold font-mono text-accent">VL</span>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-textPrimary">{t("chat.title")}</h4>
            <div className="flex items-center gap-1">
              <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }} className="h-1.5 w-1.5 rounded-full bg-income" />
              <span className="text-[10px] text-textSecondary">{t("chat.online")}</span>
            </div>
          </div>
        </div>
        <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg border border-accent/12 text-textSecondary transition hover:border-accent/30 hover:text-accent">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div className="h-72 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center mb-3">
              <span className="text-lg">💬</span>
            </div>
            <p className="text-sm text-textSecondary">{t("chat.emptyTitle")}</p>
            <p className="text-xs text-textSecondary/60 mt-1">{t("chat.emptyHint")}</p>
          </div>
        ) : null}

        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div key={`${message.role}-${index}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              {message.role === "assistant" && (
                <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 border border-accent/20">
                  <span className="text-[8px] font-bold font-mono text-accent">VL</span>
                </div>
              )}
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                message.role === "user"
                  ? "bg-accent/10 text-textPrimary rounded-tr-none border border-accent/15"
                  : "bg-surface text-textPrimary rounded-tl-none border border-accent/[0.08]"
              }`}>
                {message.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isSending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
            <div className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 border border-accent/20">
              <span className="text-[8px] font-bold font-mono text-accent">VL</span>
            </div>
            <div className="flex gap-1 rounded-xl bg-surface border border-accent/[0.08] px-4 py-3 rounded-tl-none">
              {[0, 1, 2].map((i) => (
                <motion.div key={i} className="h-2 w-2 rounded-full bg-accent" animate={{ y: [-3, 0, -3] }} transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }} />
              ))}
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form className="border-t border-accent/[0.08] p-3" onSubmit={onSubmit}>
        <div className="flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("chat.inputPlaceholder")} className="flex-1 rounded-xl border border-accent/12 bg-white px-4 py-2.5 text-sm text-textPrimary outline-none transition placeholder:text-textSecondary/50 focus:border-accent/40 focus:ring-2 focus:ring-accent/15" />
          <motion.button type="submit" disabled={isSending} whileTap={{ scale: 0.95 }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition disabled:opacity-50 hover:bg-[#CC4400]">
            <Send className="h-4 w-4" />
          </motion.button>
        </div>
        {errorMessage ? <p className="mt-2 text-xs text-expense">{errorMessage}</p> : null}
      </form>
    </motion.div>
  );
};
