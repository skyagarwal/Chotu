'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  language?: string;
  className?: string;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscription,
  language = 'hi-IN',
  className = '',
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);

        try {
          // Create blob from chunks
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

          // Create FormData
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          formData.append('language', language);

          // Send to voice API
          const response = await fetch('/api/asr/transcribe/upload', {
            method: 'POST',
            body: formData,
          });

          const result = await response.json();

          if (result.success && result.text) {
            onTranscription(result.text);
          } else {
            console.error('Transcription failed:', result.error);
            alert('Voice transcription failed. Please try again.');
          }
        } catch (error) {
          console.error('Error sending audio:', error);
          alert('Failed to send audio. Please try again.');
        } finally {
          setIsProcessing(false);
          chunksRef.current = [];
        }

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  }, [language, onTranscription]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <button
      onClick={toggleRecording}
      disabled={isProcessing}
      className={`voice-input-button ${className} ${
        isRecording ? 'recording' : ''
      } ${isProcessing ? 'processing' : ''}`}
      title={isRecording ? 'Stop recording' : 'Start voice input'}
      type="button"
    >
      {isProcessing ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : isRecording ? (
        <MicOff className="w-5 h-5 text-red-500 animate-pulse" />
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </button>
  );
};

export default VoiceInput;
