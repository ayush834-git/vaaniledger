"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { addStoredTransaction } from "@/lib/utils/clientTransactions";
import type { SupportedLanguage, TransactionRecord } from "@/lib/types/domain";

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
  transaction?: TransactionRecord;
  reply?: string;
  insights?: Array<unknown>;
  commandResult?: {
    message?: string;
    deletedTransactionId?: string;
  };
  error?: {
    message?: string;
  };
};

interface MicButtonPlaceholderProps {
  onTransactionCreated?: (transaction: TransactionRecord) => void;
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

export const MicButtonPlaceholder = ({ onTransactionCreated }: MicButtonPlaceholderProps) => {
  const { t, i18n } = useTranslation();
  const [isSupported, setIsSupported] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");
  const parseOnEndRef = useRef(false);

  const language = useMemo(() => resolveSupportedLanguage(i18n.language), [i18n.language]);
  const speechLocale = useMemo(() => mapToSpeechLocale(language), [language]);

  const parseTranscript = useCallback(
    async (value: string) => {
      const rawInput = value.trim();
      if (!rawInput) {
        setErrorMessage("No speech detected. Please try again.");
        return;
      }

      setIsParsing(true);
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
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error?.message ?? "Failed to parse transaction.");
        }

        if (payload.transaction) {
          addStoredTransaction(payload.transaction);
          onTransactionCreated?.(payload.transaction);
          setSuccessMessage("Saved");
        } else if (payload.reply) {
          setSuccessMessage(payload.reply);
        } else if (Array.isArray(payload.insights)) {
          setSuccessMessage(`Generated ${payload.insights.length} insights`);
        } else if (payload.commandResult?.message) {
          setSuccessMessage(payload.commandResult.message);
        } else {
          setSuccessMessage("Saved");
        }

        setTranscript("");
        transcriptRef.current = "";
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save transaction.";
        setErrorMessage(message);
      } finally {
        setIsParsing(false);
      }
    },
    [language, onTransactionCreated],
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
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = speechLocale;

    recognition.onresult = (event) => {
      let spokenText = "";
      for (let idx = event.resultIndex; idx < event.results.length; idx += 1) {
        spokenText += event.results[idx][0]?.transcript ?? "";
      }
      const trimmed = spokenText.trim();
      setTranscript(trimmed);
      transcriptRef.current = trimmed;
    };

    recognition.onerror = (event) => {
      parseOnEndRef.current = false;
      setIsListening(false);
      setErrorMessage(`Speech recognition error: ${event.error}`);
    };

    recognition.onend = async () => {
      setIsListening(false);
      if (!parseOnEndRef.current) {
        return;
      }
      parseOnEndRef.current = false;
      await parseTranscript(transcriptRef.current);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [parseTranscript, speechLocale]);

  const onMicClick = () => {
    if (!isSupported || !recognitionRef.current || isParsing) {
      return;
    }

    if (isListening) {
      parseOnEndRef.current = true;
      recognitionRef.current.stop();
      return;
    }

    try {
      recognitionRef.current.lang = speechLocale;
      transcriptRef.current = "";
      setTranscript("");
      setErrorMessage(null);
      setSuccessMessage(null);
      parseOnEndRef.current = true;
      setIsListening(true);
      recognitionRef.current.start();
    } catch {
      setIsListening(false);
      parseOnEndRef.current = false;
      setErrorMessage("Unable to start microphone.");
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.button
        animate={{ scale: isListening ? [1, 1.08, 1] : [1, 1.04, 1] }}
        transition={{ duration: 1.8, repeat: Infinity }}
        className="relative inline-flex h-28 w-28 items-center justify-center rounded-full border border-accent/70 bg-accent text-bg shadow-soft disabled:cursor-not-allowed disabled:opacity-70"
        disabled={!isSupported || isParsing}
        onClick={onMicClick}
        type="button"
      >
        <span className="text-4xl">{isParsing ? "..." : "Mic"}</span>
        <motion.span
          animate={{ opacity: [0.5, 0], scale: [1, 1.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full border border-accent"
        />
      </motion.button>

      {!isSupported ? <p className="text-sm text-expense">Speech recognition is not supported in this browser.</p> : null}
      {isListening ? <p className="text-sm font-medium text-accent">Listening...</p> : null}
      {isParsing ? (
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
      {!isListening && !isParsing && isSupported ? (
        <p className="text-sm text-textSecondary">{t("mic.start")}</p>
      ) : null}
    </div>
  );
};
