"use client";

import { useCallback, useRef, useState, useEffect } from "react";

export type UseSmartVADOptions = {
  onSilenceDetected: () => void;
};

export const useSmartVAD = ({ onSilenceDetected }: UseSmartVADOptions) => {
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [energyLevel, setEnergyLevel] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);

  const onSilenceRef = useRef(onSilenceDetected);
  useEffect(() => {
    onSilenceRef.current = onSilenceDetected;
  }, [onSilenceDetected]);

  const stopVAD = useCallback(() => {
    isRunningRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsVoiceActive(false);
    setEnergyLevel(0);
    silenceStartRef.current = null;
  }, []);

  const startVAD = useCallback(async () => {
    stopVAD();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      isRunningRef.current = true;
      silenceStartRef.current = Date.now();
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);

      const checkAudio = () => {
        if (!isRunningRef.current || !analyserRef.current) return;

        analyserRef.current.getFloatTimeDomainData(dataArray);

        let sumSquares = 0.0;
        for (let i = 0; i < bufferLength; i++) {
          sumSquares += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sumSquares / bufferLength);
        
        // Map rms to 0-1 range for energy level (assuming typical voice doesn't exceed 0.5 too often)
        const normalizedEnergy = Math.min(1, rms * 5);
        setEnergyLevel(normalizedEnergy);

        if (rms > 0.012) {
          setIsVoiceActive(true);
          silenceStartRef.current = null;
        } else {
          setIsVoiceActive(false);
          if (silenceStartRef.current === null) {
            silenceStartRef.current = Date.now();
          } else if (silenceStartRef.current !== Infinity && Date.now() - silenceStartRef.current > 1200) {
            onSilenceRef.current();
            silenceStartRef.current = Infinity; // Prevent multiple triggers until voice is active again
          }
        }

        rafRef.current = requestAnimationFrame(checkAudio);
      };

      checkAudio();
    } catch {
      // fail silently
    }
  }, [stopVAD]);

  useEffect(() => {
    return () => {
      stopVAD();
    };
  }, [stopVAD]);

  return { isVoiceActive, energyLevel, startVAD, stopVAD };
};
