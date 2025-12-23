'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Mic, MicOff, Loader2, Volume2, VolumeX, Waves, Radio, 
  Settings, X, CheckCircle, AlertCircle 
} from 'lucide-react';

interface EnhancedVoiceInputProps {
  onTranscription: (text: string) => void;
  onInterimTranscription?: (text: string) => void;
  language?: string;
  className?: string;
  enableStreaming?: boolean;
  showSettings?: boolean;
  autoSend?: boolean;
}

interface VoiceSettings {
  language: string;
  enableVAD: boolean;
  silenceTimeout: number;
  enableInterim: boolean;
}

export const EnhancedVoiceInput: React.FC<EnhancedVoiceInputProps> = ({
  onTranscription,
  onInterimTranscription,
  language = 'hi-IN',
  className = '',
  enableStreaming = true,
  showSettings = false,
  autoSend = true,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
  const [settings, setSettings] = useState<VoiceSettings>({
    language: language,
    enableVAD: true,
    silenceTimeout: 1500,
    enableInterim: true,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Audio level visualization
  const startAudioVisualization = useCallback((stream: MediaStream) => {
    audioContextRef.current = new AudioContext();
    const source = audioContextRef.current.createMediaStreamSource(stream);
    analyzerRef.current = audioContextRef.current.createAnalyser();
    analyzerRef.current.fftSize = 256;
    source.connect(analyzerRef.current);

    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);

    const updateLevel = () => {
      if (analyzerRef.current && isRecording) {
        analyzerRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(average / 255);
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      }
    };

    updateLevel();
  }, [isRecording]);

  // WebSocket streaming for real-time transcription
  const startStreamingASR = useCallback(async (stream: MediaStream) => {
    const wsUrl = process.env.NEXT_PUBLIC_VOICE_STREAMING_URL || 'ws://192.168.0.151:7200/ws/asr';
    
    setConnectionStatus('connecting');
    websocketRef.current = new WebSocket(wsUrl);

    websocketRef.current.onopen = () => {
      setConnectionStatus('connected');
      setIsStreaming(true);
      
      // Send config
      websocketRef.current?.send(JSON.stringify({
        type: 'config',
        language: settings.language,
        enableVAD: settings.enableVAD,
        enableInterim: settings.enableInterim,
      }));
    };

    websocketRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'interim' && settings.enableInterim) {
          setInterimText(data.text);
          onInterimTranscription?.(data.text);
        } else if (data.type === 'final') {
          setInterimText('');
          onTranscription(data.text);
          
          // Auto-stop after final result if VAD detected silence
          if (data.endOfSpeech) {
            stopRecording();
          }
        } else if (data.type === 'error') {
          setError(data.message);
          stopRecording();
        }
      } catch (e) {
        console.error('Error parsing ASR response:', e);
      }
    };

    websocketRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Connection error. Falling back to upload mode.');
      setIsStreaming(false);
      setConnectionStatus('disconnected');
    };

    websocketRef.current.onclose = () => {
      setConnectionStatus('disconnected');
      setIsStreaming(false);
    };

    // Start audio processor for streaming
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
        }
        websocketRef.current.send(pcmData.buffer);
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  }, [settings, onTranscription, onInterimTranscription]);

  // Traditional upload-based transcription
  const uploadForTranscription = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', settings.language);

      const response = await fetch('/api/asr/transcribe/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.text) {
        onTranscription(result.text);
      } else {
        setError(result.error || 'Transcription failed');
      }
    } catch (error) {
      console.error('Error uploading audio:', error);
      setError('Failed to process audio');
    } finally {
      setIsProcessing(false);
      chunksRef.current = [];
    }
  }, [settings.language, onTranscription]);

  const startRecording = useCallback(async () => {
    setError(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        } 
      });

      streamRef.current = stream;
      startAudioVisualization(stream);

      // Try streaming first if enabled
      if (enableStreaming) {
        try {
          await startStreamingASR(stream);
          setIsRecording(true);
          return;
        } catch (e) {
          console.warn('Streaming not available, using upload mode');
        }
      }

      // Fall back to MediaRecorder
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
        await uploadForTranscription();
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000); // Capture in 1s chunks
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      // VAD-based auto-stop
      if (settings.enableVAD) {
        const checkSilence = () => {
          if (audioLevel < 0.02) {
            silenceTimerRef.current = setTimeout(() => {
              if (audioLevel < 0.02 && isRecording) {
                stopRecording();
              }
            }, settings.silenceTimeout);
          } else if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
        };
        
        const silenceInterval = setInterval(checkSilence, 500);
        return () => clearInterval(silenceInterval);
      }
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setError('Microphone access denied');
    }
  }, [enableStreaming, settings, startAudioVisualization, startStreamingASR, uploadForTranscription, audioLevel, isRecording]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setAudioLevel(0);
    setInterimText('');

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    if (websocketRef.current) {
      websocketRef.current.send(JSON.stringify({ type: 'end' }));
      websocketRef.current.close();
      websocketRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <div className="relative inline-flex items-center">
      {/* Main button */}
      <button
        onClick={toggleRecording}
        disabled={isProcessing}
        className={`relative p-2 rounded-full transition-all duration-200 ${className} ${
          isRecording 
            ? 'bg-red-500 text-white animate-pulse' 
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={isRecording ? 'Stop recording' : 'Start voice input'}
        type="button"
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isRecording ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
        
        {/* Audio level indicator */}
        {isRecording && (
          <span 
            className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-25"
            style={{ transform: `scale(${1 + audioLevel * 0.5})` }}
          />
        )}
      </button>

      {/* Streaming indicator */}
      {isStreaming && (
        <span className="ml-1 flex items-center gap-1 text-xs text-green-500">
          <Radio className="w-3 h-3 animate-pulse" />
          Live
        </span>
      )}

      {/* Settings button */}
      {showSettings && (
        <button
          onClick={() => setShowSettingsModal(true)}
          className="ml-1 p-1 text-gray-400 hover:text-gray-600"
          type="button"
        >
          <Settings className="w-4 h-4" />
        </button>
      )}

      {/* Interim text display */}
      {interimText && (
        <div className="absolute bottom-full left-0 mb-2 px-3 py-1 bg-gray-800 text-white text-sm rounded shadow-lg whitespace-nowrap">
          <Waves className="w-3 h-3 inline mr-1 animate-pulse" />
          {interimText}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="absolute bottom-full left-0 mb-2 px-3 py-1 bg-red-500 text-white text-sm rounded shadow-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-2">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSettingsModal(false)}>
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl p-6 w-80 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold dark:text-white">Voice Settings</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Language</label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="hi-IN">Hindi (हिंदी)</option>
                  <option value="en-US">English (US)</option>
                  <option value="en-IN">English (India)</option>
                  <option value="auto">Auto-detect</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Voice Activity Detection</span>
                <button
                  onClick={() => setSettings({ ...settings, enableVAD: !settings.enableVAD })}
                  className={`w-10 h-5 rounded-full transition ${
                    settings.enableVAD ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`block w-4 h-4 bg-white rounded-full transform transition ${
                    settings.enableVAD ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Show Interim Results</span>
                <button
                  onClick={() => setSettings({ ...settings, enableInterim: !settings.enableInterim })}
                  className={`w-10 h-5 rounded-full transition ${
                    settings.enableInterim ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`block w-4 h-4 bg-white rounded-full transform transition ${
                    settings.enableInterim ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                  Silence Timeout: {settings.silenceTimeout}ms
                </label>
                <input
                  type="range"
                  min="500"
                  max="3000"
                  step="100"
                  value={settings.silenceTimeout}
                  onChange={(e) => setSettings({ ...settings, silenceTimeout: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                Connection: {connectionStatus}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedVoiceInput;
