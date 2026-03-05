"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import type { ParsedTransactionDraft, SupportedLanguage } from "@/lib/types/domain";
import { refreshStoredTransactionsFromApi } from "@/lib/utils/clientTransactions";
import { toUserFacingError } from "@/lib/utils/errorMessages";

type SpeechAlternative = {
  transcript: string;
};

type SpeechResult = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechAlternative;
};

type SpeechResultList = {
  length: number;
  [index: number]: SpeechResult;
};

type SpeechResultEvent = {
  resultIndex: number;
  results: SpeechResultList;
};

type SpeechRecognitionErrorEvent = {
  error: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

type ParseResponse = {
  success?: boolean;
  intent?: "transaction" | "chat" | "insight" | "command";
  parsedTransaction?: ParsedTransactionDraft;
  reply?: string;
  insights?: Array<unknown>;
  commandResult?: {
    message?: string;
    deletedTransactionId?: string;
  };
  error?: {
    code?: string;
    message?: string;
  };
};

interface MicButtonPlaceholderProps {
  onTransactionParsed?: (transaction: ParsedTransactionDraft) => void;
  savedSignal?: number;
}

const resolveSupportedLanguage = (input: string): SupportedLanguage => {
  const base = input.split("-")[0];
  if (base === "hi" || base === "te" || base === "ta") {
    return base;
  }
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

  const language = useMemo(() => resolveSupportedLanguage(i18n.language), [i18n.language]);
  const speechLocale = useMemo(() => mapToSpeechLocale(language), [language]);

  useEffect(() => {
    if (savedSignal > 0) {
      setSuccessMessage("Saved");
      setErrorMessage(null);
    }
  }, [savedSignal]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const armSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      if (!recognitionRef.current || !shouldRestartRef.current || isProcessing) {
        return;
      }
      shouldRestartRef.current = false;
      submittedOnStopRef.current = true;
      recognitionRef.current.stop();
    }, 2000);
  }, [clearSilenceTimer, isProcessing]);

  const parseTranscript = useCallback(
    async (value: string) => {
      const rawInput = value.trim();
      if (!rawInput) {
        setErrorMessage("Could not capture speech. Please try again.");
        return;
      }

      setIsProcessing(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        const response = await fetch("/api/parse-transaction", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rawInput,
            language,
          }),
        });

        const payload = (await response.json()) as ParseResponse;
        if (!response.ok || payload.success === false) {
          throw new Error(
            toUserFacingError(payload.error, {
              fallback: "Could not process your input.",
            }),
          );
        }

        if (payload.intent === "transaction" && payload.parsedTransaction) {
          onTransactionParsed?.(payload.parsedTransaction);
          setSuccessMessage("Processing complete. Confirm to save.");
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
        const message = error instanceof Error ? error.message : "Could not process your input.";
        setErrorMessage(message);
      } finally {
        setIsProcessing(false);
      }
    },
    [language, onTransactionParsed],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const windowWithSpeech = window as Window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };

    const Recognition = windowWithSpeech.SpeechRecognition ?? windowWithSpeech.webkitSpeechRecognition;
    if (!Recognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = speechLocale;

    recognition.onresult = (event) => {
      let interim = "";
      for (let idx = event.resultIndex; idx < event.results.length; idx += 1) {
        const piece = event.results[idx][0]?.transcript ?? "";
        if (event.results[idx].isFinal) {
          finalTranscriptRef.current = `${finalTranscriptRef.current} ${piece}`.trim();
        } else {
          interim = `${interim} ${piece}`.trim();
        }
      }
      const merged = `${finalTranscriptRef.current} ${interim}`.trim();
      liveTranscriptRef.current = merged;
      setTranscript(merged);
      armSilenceTimer();
    };

    recognition.onerror = (event) => {
      clearSilenceTimer();
      shouldRestartRef.current = false;
      submittedOnStopRef.current = false;
      setIsRecording(false);
      if (event.error !== "aborted") {
        setErrorMessage("Speech recognition failed. Please try again.");
      }
    };

    recognition.onend = () => {
      if (shouldRestartRef.current) {
        try {
          recognition.start();
          armSilenceTimer();
          return;
        } catch {
          shouldRestartRef.current = false;
          setIsRecording(false);
          setErrorMessage("Microphone stopped unexpectedly. Please try again.");
          return;
        }
      }

      setIsRecording(false);
      clearSilenceTimer();
      if (!submittedOnStopRef.current) {
        return;
      }
      submittedOnStopRef.current = false;
      void parseTranscript(finalTranscriptRef.current || liveTranscriptRef.current);
    };

    recognitionRef.current = recognition;

    return () => {
      clearSilenceTimer();
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [armSilenceTimer, clearSilenceTimer, parseTranscript, speechLocale]);

  const onMicClick = () => {
    if (!isSupported || !recognitionRef.current || isProcessing) {
      return;
    }

    if (isRecording) {
      clearSilenceTimer();
      shouldRestartRef.current = false;
      submittedOnStopRef.current = true;
      recognitionRef.current.stop();
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
    <div className="flex flex-col items-center gap-3">
      <motion.button
        animate={{ scale: isRecording ? [1, 1.08, 1] : [1, 1.04, 1] }}
        transition={{ duration: 1.8, repeat: Infinity }}
        className="relative inline-flex h-28 w-28 items-center justify-center rounded-full border border-accent/70 bg-accent text-bg shadow-soft disabled:cursor-not-allowed disabled:opacity-70"
        disabled={!isSupported || isProcessing}
        onClick={onMicClick}
        type="button"
      >
        <span className="text-4xl">{isProcessing ? "..." : "Mic"}</span>
        <motion.span
          animate={{ opacity: [0.5, 0], scale: [1, 1.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full border border-accent"
        />
      </motion.button>

      {!isSupported ? <p className="text-sm text-expense">Speech recognition is not supported in this browser.</p> : null}
      {isRecording ? <p className="text-sm font-medium text-accent">Listening...</p> : null}
      {isProcessing ? (
        <div className="flex items-center gap-2 text-sm text-textSecondary">
          <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-textSecondary border-t-transparent" />
          Processing...
        </div>
      ) : null}
      {transcript ? (
        <p className="max-w-md rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-textPrimary">
          {transcript}
        </p>
      ) : null}
      {successMessage ? <p className="text-sm text-income">{successMessage}</p> : null}
      {errorMessage ? <p className="text-sm text-expense">{errorMessage}</p> : null}
      {!isRecording && !isProcessing && isSupported ? (
        <p className="text-sm text-textSecondary">{t("mic.start")} / {t("mic.stop")}</p>
      ) : null}
    </div>
  );
};
