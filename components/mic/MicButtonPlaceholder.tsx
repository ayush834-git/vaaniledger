"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Mic, MicOff, Loader2 } from "lucide-react";

import type { ParsedTransactionDraft, SupportedLanguage } from "@/lib/types/domain";
import { refreshStoredTransactionsFromApi } from "@/lib/utils/clientTransactions";
import { toUserFacingError } from "@/lib/utils/errorMessages";
import { useSmartVAD } from "@/lib/hooks/useSmartVAD";
import { useMicContext } from "@/lib/context/MicContext";

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

  const { energyLevel, startVAD, stopVAD } = useSmartVAD({
    onSilenceDetected: () => {
      if (!recognitionRef.current || !shouldRestartRef.current || isProcessing) return;
      shouldRestartRef.current = false;
      submittedOnStopRef.current = true;
      recognitionRef.current.stop();
    },
  });

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const submittedOnStopRef = useRef(false);
  const shouldRestartRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const liveTranscriptRef = useRef("");
  const lastSpeechTimeRef = useRef<number>(Date.now());

  const language = useMemo(() => resolveSupportedLanguage(i18n.language), [i18n.language]);
  const speechLocale = useMemo(() => mapToSpeechLocale(language), [language]);

  const { setIsMainMicActive } = useMicContext();

  useEffect(() => {
    setIsMainMicActive(isRecording);
  }, [isRecording, setIsMainMicActive]);

  useEffect(() => {
    if (savedSignal > 0) {
      setSuccessMessage(t("mic.saved"));
      setErrorMessage(null);
    }
  }, [savedSignal, t]);



  const parseTranscript = useCallback(
    async (value: string) => {
      let rawInput = value.trim();
      if (!rawInput) { 
        setErrorMessage(null); 
        setIsProcessing(false);
        return; 
      }
      setIsProcessing(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      try {
        try {
          const normRes = await fetch("/api/normalize-transcript", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rawInput }),
          });
          if (normRes.ok) {
            const normData = await normRes.json();
            if (typeof normData?.normalized === "string") {
              rawInput = normData.normalized;
            }
          }
        } catch {
          // Fall through on error, use original rawInput
        }

        const response = await fetch("/api/parse-transaction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawInput, language }),
        });
        const payload = (await response.json()) as ParseResponse;
        if (!response.ok || payload.success === false) {
          throw new Error(toUserFacingError(payload.error, { fallback: t("mic.errorProcess") }));
        }
        if (payload.intent === "transaction" && payload.parsedTransaction) {
          onTransactionParsed?.(payload.parsedTransaction);
          setSuccessMessage(t("mic.confirmSave"));
        } else if (payload.reply) {
          setSuccessMessage(payload.reply);
        } else if (Array.isArray(payload.insights)) {
          setSuccessMessage(t("mic.generatedInsights", { count: payload.insights.length }));
        } else if (payload.commandResult?.message) {
          if (payload.commandResult.deletedTransactionId) {
            await refreshStoredTransactionsFromApi().catch(() => undefined);
          }
          setSuccessMessage(payload.commandResult.message);
        } else {
          setSuccessMessage(t("mic.requestCompleted"));
        }
        setTranscript("");
        liveTranscriptRef.current = "";
        finalTranscriptRef.current = "";
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : t("mic.errorProcess"));
      } finally {
        setIsProcessing(false);
      }
    },
    [language, onTransactionParsed, t],
  );

  const parseTranscriptRef = useRef(parseTranscript);
  useEffect(() => { parseTranscriptRef.current = parseTranscript; }, [parseTranscript]);

  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);

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
    };

    recognition.onnomatch = () => {};

    recognition.onspeechend = () => {};

    recognition.onerror = (event) => {
      if (event.error === "no-speech") {
        shouldRestartRef.current = false;
        submittedOnStopRef.current = false;
        setIsRecording(false);
        stopVAD();
        return;
      }
      shouldRestartRef.current = false;
      submittedOnStopRef.current = false;
      setIsRecording(false);
      if (event.error !== "aborted" && event.error !== "no-speech") {
        setErrorMessage("Microphone recognition failed.");
      }
    };

    recognition.onend = () => {
      if (shouldRestartRef.current) {
        try {
          // Add a small delay to ensure the speech recognition has fully stopped before restarting
          setTimeout(() => {
            try {
              if (shouldRestartRef.current && recognitionRef.current) {
                recognitionRef.current.start();
              }
            } catch {
              shouldRestartRef.current = false;
              submittedOnStopRef.current = false;
              setIsRecording(false);
            }
          }, 100);
          return;
        } catch {
          shouldRestartRef.current = false;
          submittedOnStopRef.current = false;
          setIsRecording(false);
          return;
        }
      }
      setIsRecording(false);
      if (!submittedOnStopRef.current) return;
      submittedOnStopRef.current = false;
      void parseTranscriptRef.current(finalTranscriptRef.current || liveTranscriptRef.current);
    };

    recognitionRef.current = recognition;
    return () => { recognition.stop(); recognitionRef.current = null; };
  }, [speechLocale]);

  const onMicClick = () => {
    if (!isSupported || !recognitionRef.current || isProcessing) return;
    if (isRecording) {
      shouldRestartRef.current = false;
      submittedOnStopRef.current = false;
      setIsRecording(false);
      try { recognitionRef.current.stop(); } catch {}
      stopVAD();
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
      
      // Wrap start in try-catch to handle immediate errors
      try {
        recognitionRef.current.start();
      } catch {
        // If start fails immediately, reset state
        shouldRestartRef.current = false;
        submittedOnStopRef.current = false;
        setIsRecording(false);
        stopVAD();
        setErrorMessage("Microphone access denied or unavailable.");
        return;
      }
      
      startVAD();
    } catch {
      setIsRecording(false);
      stopVAD();
      shouldRestartRef.current = false;
      submittedOnStopRef.current = false;
      setErrorMessage("Microphone access denied or unavailable.");
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative py-10">
        <motion.button
          id="mic-button-trigger"
          onClick={onMicClick}
          disabled={!isSupported || isProcessing}
          animate={
            isRecording
              ? { scale: [1, 1.05, 1], boxShadow: ["0 0 0 0px rgba(255,85,0,0.4)", "0 0 0 20px rgba(255,85,0,0)"], backgroundColor: "#E8003D" }
              : isProcessing
              ? { scale: 1, backgroundColor: "#FF5500", boxShadow: "0 0 0 0px rgba(255,85,0,0)" }
              : { scale: [1, 1.03, 1], backgroundColor: "#FF5500", boxShadow: "0 0 0 0px rgba(255,85,0,0)" }
          }
          transition={isRecording ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : (!isProcessing) ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : {}}
          className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-70"
          type="button"
        >
          {isProcessing ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <Loader2 className="h-10 w-10 text-white" />
            </motion.div>
          ) : isRecording ? (
            <MicOff className="h-10 w-10 text-white" />
          ) : (
            <Mic className="h-10 w-10 text-white" />
          )}
        </motion.button>
      </div>

      <div className="flex h-12 items-center justify-center gap-[3px]">
        {[0.4, 0.9, 1.3, 0.9, 0.4].map((h, i) => {
          const safeEnergy = isRecording ? Math.max(0.1, energyLevel) : 0;
          const barHeight = isRecording ? 4 + safeEnergy * 40 * h : 4;
          return (
            <motion.div
              key={i}
              className={`w-1.5 rounded-full ${isRecording ? "bg-accent opacity-100" : "bg-textSecondary opacity-30"}`}
              animate={{ height: barHeight }}
              transition={{ type: "tween", duration: 0.1 }}
            />
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
          <p className="text-sm text-textSecondary">
            {!isSupported ? t("mic.notSupported") : isRecording ? t("mic.listening") : isProcessing ? t("mic.processing") : t("mic.start")}
          </p>
          {successMessage ? (
            <p className="mt-1 text-sm text-income">{successMessage}</p>
          ) : null}
          {errorMessage ? (
            <p className="mt-1 text-sm text-expense">{errorMessage}</p>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {transcript ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="mt-2 max-w-xs rounded-2xl border border-accent/8 bg-white p-4 shadow-resting text-center"
          >
            <p className="font-mono text-sm text-textPrimary">{transcript}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
