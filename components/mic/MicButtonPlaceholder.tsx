"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Mic, MicOff, Loader2 } from "lucide-react";

import type { ParsedTransactionDraft, SupportedLanguage } from "@/lib/types/domain";
import { refreshStoredTransactionsFromApi } from "@/lib/utils/clientTransactions";
import { toUserFacingError } from "@/lib/utils/errorMessages";

type SpeechAlternative = { transcript: string };
type SpeechResult = { isFinal: boolean; length: number; [index: number]: SpeechAlternative };
type SpeechResultList = { length: number; [index: number]: SpeechResult };
type SpeechResultEvent = { resultIndex: number; results: SpeechResultList };
type SpeechRecognitionErrorEvent = { error: string };
type SpeechRecognitionLike = {
  continuous: boolean; interimResults: boolean; lang: string; maxAlternatives: number;
  start: () => void; stop: () => void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onspeechend: (() => void) | null;
  onnomatch: (() => void) | null;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

type ParseResponse = {
  success?: boolean;
  intent?: "transaction" | "chat" | "insight" | "command";
  parsedTransaction?: ParsedTransactionDraft;
  reply?: string;
  insights?: Array<unknown>;
  commandResult?: { message?: string; deletedTransactionId?: string };
  error?: { code?: string; message?: string };
};

interface MicButtonPlaceholderProps {
  onTransactionParsed?: (transaction: ParsedTransactionDraft) => void;
  savedSignal?: number;
}

const resolveSupportedLanguage = (input: string): SupportedLanguage => {
  const base = input.split("-")[0];
  if (base === "hi" || base === "te" || base === "ta") return base;
  return "en";
};

const mapToSpeechLocale = (lang: SupportedLanguage): string => {
  if (lang === "hi") return "hi-IN";
  if (lang === "te") return "te-IN";
  if (lang === "ta") return "ta-IN";
  return "en-IN";
};

export const MicButtonPlaceholder = ({ onTransactionParsed, savedSignal = 0 }: MicButtonPlaceholderProps) => {
  const { t, i18n } = useTranslation();
  const [isSupported, setIsSupported] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const submittedOnStopRef = useRef(false);
  const shouldRestartRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const liveTranscriptRef = useRef("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpeechTimeRef = useRef<number>(Date.now());

  const language = useMemo(() => resolveSupportedLanguage(i18n.language), [i18n.language]);
  const speechLocale = useMemo(() => mapToSpeechLocale(language), [language]);

  useEffect(() => {
    if (savedSignal > 0) {
      setSuccessMessage(t("mic.saved"));
      setErrorMessage(null);
    }
  }, [savedSignal, t]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
  }, []);

  const armSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      if (!recognitionRef.current || !shouldRestartRef.current || isProcessing) return;
      shouldRestartRef.current = false;
      submittedOnStopRef.current = true;
      recognitionRef.current.stop();
    }, 2500);
  }, [clearSilenceTimer, isProcessing]);

  const parseTranscript = useCallback(
    async (value: string) => {
      const rawInput = value.trim();
      if (!rawInput) { setErrorMessage(t("mic.notSupported")); return; }
      setIsProcessing(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      try {
        const response = await fetch("/api/parse-transaction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawInput, language }),
        });
        const payload = (await response.json()) as ParseResponse;
        if (!response.ok || payload.success === false) {
          throw new Error(toUserFacingError(payload.error, { fallback: "Could not process your input." }));
        }
        if (payload.intent === "transaction" && payload.parsedTransaction) {
          onTransactionParsed?.(payload.parsedTransaction);
          setSuccessMessage(t("mic.confirmSave"));
        } else if (payload.reply) {
          setSuccessMessage(payload.reply);
        } else if (Array.isArray(payload.insights)) {
          setSuccessMessage(`Generated ${payload.insights.length} insights`);
        } else if (payload.commandResult?.message) {
          if (payload.commandResult.deletedTransactionId) {
            await refreshStoredTransactionsFromApi().catch(() => undefined);
          }
          setSuccessMessage(payload.commandResult.message);
        } else {
          setSuccessMessage("Request completed.");
        }
        setTranscript("");
        liveTranscriptRef.current = "";
        finalTranscriptRef.current = "";
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Could not process your input.");
      } finally {
        setIsProcessing(false);
      }
    },
    [language, onTransactionParsed, t],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const windowWithSpeech = window as Window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Recognition = windowWithSpeech.SpeechRecognition ?? windowWithSpeech.webkitSpeechRecognition;
    if (!Recognition) { setIsSupported(false); return; }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = speechLocale;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event) => {
      lastSpeechTimeRef.current = Date.now();
      let finalStr = "";
      let interimStr = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const piece = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) {
          finalStr = `${finalStr} ${piece}`;
        } else {
          interimStr = `${interimStr} ${piece}`;
        }
      }
      finalTranscriptRef.current = finalStr.trim();
      const merged = `${finalStr.trim()} ${interimStr.trim()}`.trim();
      liveTranscriptRef.current = merged;
      setTranscript(merged);
      armSilenceTimer();
    };

    recognition.onnomatch = () => {
      armSilenceTimer();
    };

    recognition.onspeechend = () => {
      armSilenceTimer();
    };

    recognition.onerror = (event) => {
      clearSilenceTimer();
      if (event.error === "no-speech") {
        armSilenceTimer();
        return;
      }
      shouldRestartRef.current = false;
      submittedOnStopRef.current = false;
      setIsRecording(false);
      if (event.error !== "aborted") {
        setErrorMessage("Speech recognition failed. Please try again.");
      }
    };

    recognition.onend = () => {
      if (shouldRestartRef.current) {
        try { recognition.start(); armSilenceTimer(); return; } catch {
          shouldRestartRef.current = false;
          setIsRecording(false);
          return;
        }
      }
      setIsRecording(false);
      clearSilenceTimer();
      if (!submittedOnStopRef.current) return;
      submittedOnStopRef.current = false;
      void parseTranscript(finalTranscriptRef.current || liveTranscriptRef.current);
    };

    recognitionRef.current = recognition;
    return () => { clearSilenceTimer(); recognition.stop(); recognitionRef.current = null; };
  }, [armSilenceTimer, clearSilenceTimer, parseTranscript, speechLocale]);

  const onMicClick = () => {
    if (!isSupported || !recognitionRef.current || isProcessing) return;
    if (isRecording) {
      clearSilenceTimer();
      shouldRestartRef.current = false;
      submittedOnStopRef.current = false;
      setIsRecording(false);
      try { recognitionRef.current.stop(); } catch {}
      const input = finalTranscriptRef.current || liveTranscriptRef.current;
      if (input) {
        void parseTranscript(input);
      } else {
        setTranscript("");
      }
      return;
    }
    try {
      recognitionRef.current.lang = speechLocale;
      finalTranscriptRef.current = "";
      liveTranscriptRef.current = "";
      setTranscript("");
      setErrorMessage(null);
      setSuccessMessage(null);
      submittedOnStopRef.current = false;
      shouldRestartRef.current = true;
      setIsRecording(true);
      recognitionRef.current.start();
      armSilenceTimer();
    } catch {
      setIsRecording(false);
      clearSilenceTimer();
      shouldRestartRef.current = false;
      submittedOnStopRef.current = false;
      setErrorMessage("Unable to start microphone.");
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <AnimatePresence>
          {isRecording && [0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border border-expense/40"
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 2.5 + i * 0.4, opacity: 0 }}
              exit={{ scale: 1, opacity: 0 }}
              transition={{ duration: 1.5, delay: i * 0.4, repeat: Infinity, ease: "easeOut" }}
            />
          ))}
        </AnimatePresence>

        <motion.button
          onClick={onMicClick}
          disabled={!isSupported || isProcessing}
          animate={
            isRecording
              ? { scale: [1, 1.05, 1], backgroundColor: "#E8003D" }
              : isProcessing
              ? { scale: 1, backgroundColor: "#FF5500" }
              : { scale: [1, 1.04, 1], backgroundColor: "#FF5500" }
          }
          transition={isRecording || (!isProcessing) ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
          className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full shadow-glow disabled:cursor-not-allowed disabled:opacity-70"
          type="button"
        >
          {isProcessing ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <Loader2 className="h-8 w-8 text-white" />
            </motion.div>
          ) : isRecording ? (
            <MicOff className="h-8 w-8 text-white" />
          ) : (
            <Mic className="h-8 w-8 text-white" />
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {isRecording && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex items-center gap-1">
            {[0.4, 0.8, 1.2, 0.9, 0.5, 1.0, 0.6].map((h, i) => (
              <motion.div key={i} className="w-1.5 rounded-full bg-expense" animate={{ scaleY: [h, h * 0.4, h * 1.3, h] }} transition={{ duration: 0.6, delay: i * 0.08, repeat: Infinity, ease: "easeInOut" }} style={{ height: 24, transformOrigin: "center" }} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-xs text-textSecondary">
        {!isSupported ? t("mic.notSupported") : isRecording ? t("mic.listening") : isProcessing ? t("mic.processing") : t("mic.start")}
      </p>

      {transcript ? (
        <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="max-w-md rounded-xl border border-accent/12 bg-surface px-4 py-2 text-sm text-textPrimary">
          {transcript}
        </motion.p>
      ) : null}
      {successMessage ? (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-income">{successMessage}</motion.p>
      ) : null}
      {errorMessage ? (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-expense">{errorMessage}</motion.p>
      ) : null}
    </div>
  );
};
