"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechResultEvent = {
  resultIndex: number;
  results: { length: number; [index: number]: { isFinal: boolean; [index: number]: { transcript: string } } };
};

type SpeechRecognitionErrorEvent = { error: string };

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

const WAKE_WORDS = ["vaani", "hey vaani", "bani", "wani", "baani", "vaanihisaab", "vaani hisaab", "vaani hisab", "vaanihisab"];

export const useWakeWord = (isPaused: boolean, onWakeWordDetected: () => void) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const isPausedRef = useRef(isPaused);
  const shouldRestartRef = useRef(false);
  const onDetectedRef = useRef(onWakeWordDetected);

  useEffect(() => {
    onDetectedRef.current = onWakeWordDetected;
  }, [onWakeWordDetected]);

  const startListening = useCallback(() => {
    if (!isSupported || isPausedRef.current) return;
    shouldRestartRef.current = true;
    try {
      if (recognitionRef.current) {
          recognitionRef.current.start();
          setIsListening(true);
      }
    } catch {
       setIsListening(true);
    }
  }, [isSupported]);
  
  const stopListening = useCallback(() => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
          setIsListening(false);
          try { recognitionRef.current.stop(); } catch {}
      }
  }, []);

  useEffect(() => {
    isPausedRef.current = isPaused;
    if (isPaused && recognitionRef.current) {
        setIsListening(false);
        try { recognitionRef.current.stop() } catch {}
    } else if (!isPaused && isSupported && shouldRestartRef.current) {
        startListening()
    }
  }, [isPaused, isSupported, startListening]);

  useEffect(() => {
    if (typeof window === "undefined") return;

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
    recognition.lang = "en-IN"; // English/Hindi hybrid common context
    
    recognition.onresult = (event) => {
      if (isPausedRef.current) return;
      
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0]?.transcript ?? "";
      }
      
      const normalized = transcript.toLowerCase().trim();
      
      const isMatch = WAKE_WORDS.some(word => normalized.includes(word));
      if (isMatch && !isPausedRef.current) {
          onDetectedRef.current();
          // Pause immediately so we don't spam while waiting for React state to update
          isPausedRef.current = true;
          try { recognition.stop(); } catch {}
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        setIsSupported(false);
        shouldRestartRef.current = false;
        setIsListening(false);
      } else if (event.error === "no-speech" || event.error === "network") {
         // silently restart implicitly handled by onend
      }
    };

    recognition.onend = () => {
       setIsListening(false);
       if (shouldRestartRef.current && !isPausedRef.current && isSupported) {
           setTimeout(() => {
              try { 
                  if (shouldRestartRef.current && !isPausedRef.current) {
                      recognition.start(); 
                      setIsListening(true);
                  }
              } catch {}
           }, 200);
       }
    };

    recognitionRef.current = recognition;
    shouldRestartRef.current = true;
    try { recognition.start(); setIsListening(true); } catch {}

    return () => {
      shouldRestartRef.current = false;
      try { recognition.stop(); } catch {}
      recognitionRef.current = null;
    };
  }, [isSupported]);

  return { isListening: isListening && !isPaused, isSupported, startListening, stopListening };
};
