'use client';

import React, { useState, useCallback } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';

interface TTSButtonProps {
  text: string;
  language?: string;
  className?: string;
}

export const TTSButton: React.FC<TTSButtonProps> = ({
  text,
  language = 'hi-IN',
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const playAudio = useCallback(async () => {
    if (isPlaying && audioElement) {
      // Stop currently playing audio
      audioElement.pause();
      audioElement.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Request TTS synthesis
      const response = await fetch('/api/tts/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          language,
        }),
      });

      const result = await response.json();

      if (result.success && result.audio) {
        // Convert base64 to audio blob
        const audioData = atob(result.audio);
        const arrayBuffer = new ArrayBuffer(audioData.length);
        const view = new Uint8Array(arrayBuffer);
        for (let i = 0; i < audioData.length; i++) {
          view[i] = audioData.charCodeAt(i);
        }
        const blob = new Blob([arrayBuffer], { type: result.contentType || 'audio/wav' });
        const audioUrl = URL.createObjectURL(blob);

        // Create and play audio
        const audio = new Audio(audioUrl);
        audio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };
        audio.onerror = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
          console.error('Error playing audio');
        };

        setAudioElement(audio);
        await audio.play();
        setIsPlaying(true);
      } else {
        console.error('TTS synthesis failed:', result.error);
        setErrorMessage(result.error || 'Text-to-speech failed');
      }
    } catch (error) {
      console.error('Error synthesizing speech:', error);
      setErrorMessage('Failed to synthesize speech');
    } finally {
      setIsLoading(false);
    }
  }, [text, language, isPlaying, audioElement]);

  return (
    <button
      onClick={playAudio}
      disabled={isLoading}
      className={`tts-button ${className} ${isPlaying ? 'playing' : ''}`}
      title={errorMessage ? errorMessage : isPlaying ? 'Stop audio' : 'Play audio'}
      type="button"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isPlaying ? (
        <VolumeX className="w-4 h-4 text-blue-500" />
      ) : errorMessage ? (
        <VolumeX className="w-4 h-4 text-red-500" />
      ) : (
        <Volume2 className="w-4 h-4 text-gray-500" />
      )}
    </button>
  );
};

export default TTSButton;
