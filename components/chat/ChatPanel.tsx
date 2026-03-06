"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { X, Send, Mic, MicOff, Loader2, Volume2, VolumeX } from "lucide-react";

type SpeechRecognitionLike = {
  continuous: boolean; interimResults: boolean; lang: string; maxAlternatives: number;
  start: () => void; stop: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onresult: ((event: any) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
};


const useChatMic = (locale: string, onUpdate: (text: string) => void, onSubmit: () => void) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const submitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const windowWithSpeech = window as any;
    const Recognition = windowWithSpeech.SpeechRecognition ?? windowWithSpeech.webkitSpeechRecognition;
    if (!Recognition) return;
    
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalStr = ""; let interimStr = "";
      for (let i = 0; i < event.results.length; i++) {
        const piece = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) finalStr += piece;
        else interimStr += piece;
      }
      const text = `${finalStr} ${interimStr}`.trim();
      onUpdate(text);

      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
      submitTimerRef.current = setTimeout(() => {
         if (text.length > 0 && finalStr.length > 0) {
             setIsRecording(false);
             try { recognition.stop() } catch {}
             onSubmit();
         }
      }, 800); 
    };

    recognition.onerror = () => { setIsRecording(false); };
    recognition.onend = () => { setIsRecording(false); };
    recognitionRef.current = recognition;

    return () => { try { recognition.stop(); } catch {} };
  }, [onUpdate, onSubmit, locale]);

  const toggleMic = useCallback(() => {
      if (!recognitionRef.current) return;
      if (isRecording) {
          setIsRecording(false);
          try { recognitionRef.current.stop(); } catch {}
          if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
      } else {
          recognitionRef.current.lang = locale;
          setIsRecording(true);
          onUpdate("");
          try { recognitionRef.current.start(); } catch {}
      }
  }, [isRecording, locale, onUpdate]);

  return { isRecording, isProcessing, setIsProcessing, toggleMic };
};

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
  const [voiceMode, setVoiceMode] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  useEffect(() => {
    setVoiceMode(localStorage.getItem("vaani_voice_mode") !== "false");
    return () => { if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel(); };
  }, []);

  const toggleVoiceMode = () => {
    const next = !voiceMode;
    setVoiceMode(next);
    localStorage.setItem("vaani_voice_mode", next.toString());
  };

  const language = useMemo(() => resolveSupportedLanguage(i18n.language), [i18n.language]);

  const mapToSpeechLocale = (lang: string) => {
    if (lang === "hi") return "hi-IN";
    if (lang === "te") return "te-IN";
    if (lang === "ta") return "ta-IN";
    return "en-IN";
  };
  const speechLocale = useMemo(() => mapToSpeechLocale(language), [language]);

  const formRef = useRef<HTMLFormElement>(null);
  
  const handleAutoSubmit = useCallback(() => {
    if (formRef.current) {
        formRef.current.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    }
  }, []);

  const { isRecording, isProcessing, setIsProcessing, toggleMic } = useChatMic(speechLocale, setInput, handleAutoSubmit);

  const speak = useCallback((text: string, index: number) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (playingIndex === index) {
      setPlayingIndex(null);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLocale;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => setPlayingIndex((prev) => prev === index ? null : prev);
    utterance.onerror = () => setPlayingIndex((prev) => prev === index ? null : prev);
    setPlayingIndex(index);
    window.speechSynthesis.speak(utterance);
  }, [playingIndex, speechLocale]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isSending]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = input.trim();
    if (!value || isSending) return;
    setMessages((prev) => [...prev, { role: "user", text: value }]);
    setInput("");
    setIsSending(true);
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value, language }),
      });
      const payload = (await response.json()) as { ok?: boolean; reply?: string; error?: { message?: string } };
      if (!response.ok || !payload.ok || !payload.reply) throw new Error(payload.error?.message ?? t("chat.error"));
      
      const replyText = payload.reply ?? "";
      const replyIndex = messages.length + 1; // +1 because we added user message above
      
      setMessages((prev) => [...prev, { role: "assistant", text: replyText }]);
      if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
      if (voiceMode) speak(replyText, replyIndex);
      
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("chat.error"));
    } finally { setIsSending(false); setIsProcessing(false); }
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
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={toggleVoiceMode} title={voiceMode ? "Voice Mode: On" : "Voice Mode: Off"} className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${voiceMode ? "border-accent/40 bg-accent/5 text-accent" : "border-accent/12 text-textSecondary hover:border-accent/30 hover:text-accent"}`}>
            {voiceMode ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg border border-accent/12 text-textSecondary transition hover:border-accent/30 hover:text-accent">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
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
            <motion.div key={`${message.role}-${index}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className={`group flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              {message.role === "assistant" && (
                <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 border border-accent/20">
                  <span className="text-[8px] font-bold font-mono text-accent">VL</span>
                </div>
              )}
              <div className={`flex items-end gap-2 max-w-[80%]`}>
                <div className={`rounded-xl px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "bg-accent/10 text-textPrimary rounded-tr-none border border-accent/15"
                    : "bg-surface text-textPrimary rounded-tl-none border border-accent/[0.08]"
                }`}>
                  {message.text}
                </div>
                {message.role === "assistant" && typeof window !== "undefined" && window.speechSynthesis && (
                  <button 
                    type="button" 
                    onClick={() => speak(message.text, index)}
                    className="opacity-0 group-hover:opacity-100 mb-1 flex shrink-0 items-center justify-center h-6 w-6 rounded-md hover:bg-accent/10 text-textSecondary hover:text-accent transition-all"
                  >
                    {playingIndex === index ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                  </button>
                )}
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
      <form ref={formRef} className="border-t border-accent/[0.08] p-3" onSubmit={onSubmit}>
        <div className="flex gap-2 items-center">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("chat.inputPlaceholder")} className="flex-1 rounded-xl border border-accent/12 bg-white px-4 py-2.5 text-sm text-textPrimary outline-none transition placeholder:text-textSecondary/50 focus:border-accent/40 focus:ring-2 focus:ring-accent/15" />
          <button 
            type="button" 
            onClick={toggleMic} 
            disabled={isSending || isProcessing}
            className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent transition hover:bg-accent/20 border border-accent/20 disabled:opacity-50"
          >
            {isProcessing ? (
               <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                  <Loader2 className="h-3.5 w-3.5" />
               </motion.div>
            ) : isRecording ? (
               <>
                 <MicOff className="h-3.5 w-3.5 relative z-10" />
                 <motion.div className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-expense" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }} />
               </>
            ) : (
               <Mic className="h-3.5 w-3.5" />
            )}
          </button>
          <motion.button type="submit" disabled={isSending || isProcessing} whileTap={{ scale: 0.95 }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition disabled:opacity-50 hover:bg-[#CC4400]">
            <Send className="h-4 w-4" />
          </motion.button>
        </div>
        {errorMessage ? <p className="mt-2 text-xs text-expense">{errorMessage}</p> : null}
      </form>
    </motion.div>
  );
};
