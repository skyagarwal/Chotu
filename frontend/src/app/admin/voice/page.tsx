'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Mic, Volume2, Settings, RefreshCw, CheckCircle, XCircle, AlertCircle,
  Play, Square, Upload, Download, Globe, Zap, Activity,
  Languages, Clock, Gauge, Server, Sliders, TestTube, FileAudio,
  Brain, Waves, Radio, Speaker
} from 'lucide-react';

interface VoiceServiceStatus {
  asr: {
    status: 'healthy' | 'unhealthy' | 'offline';
    provider: string;
    model: string;
    latency: number;
    languages: string[];
  };
  tts: {
    status: 'healthy' | 'unhealthy' | 'offline';
    provider: string;
    model: string;
    latency: number;
    languages: string[];
    voices: string[];
  };
}

interface VoiceConfig {
  asr: {
    provider: 'whisper' | 'google' | 'azure';
    model: string;
    language: string;
    enableTimestamps: boolean;
    enableWordConfidence: boolean;
  };
  tts: {
    provider: 'xtts' | 'google' | 'azure';
    model: string;
    language: string;
    voice: string;
    speed: number;
    pitch: number;
  };
}

export default function VoiceSettingsPage() {
  const [status, setStatus] = useState<VoiceServiceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'asr' | 'tts' | 'test'>('asr');
  
  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  // TTS test state
  const [ttsText, setTtsText] = useState('नमस्ते, मैं मंगवाले AI हूँ। आपकी क्या सेवा करूँ?');
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Configuration
  const [config, setConfig] = useState<VoiceConfig>({
    asr: {
      provider: 'whisper',
      model: 'large-v3',
      language: 'auto',
      enableTimestamps: true,
      enableWordConfidence: true,
    },
    tts: {
      provider: 'xtts',
      model: 'xtts_v2',
      language: 'hi',
      voice: 'default',
      speed: 1.0,
      pitch: 1.0,
    },
  });

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      // Check ASR service
      let asrStatus: VoiceServiceStatus['asr'] = {
        status: 'offline',
        provider: 'Whisper',
        model: 'large-v3',
        latency: 0,
        languages: [],
      };
      
      try {
        const asrRes = await fetch('/api/settings/asr/test');
        if (asrRes.ok) {
          const asrData = await asrRes.json();
          asrStatus = {
            status: asrData.success ? 'healthy' : 'unhealthy',
            provider: 'Whisper (Local)',
            model: 'large-v3',
            latency: asrData.latency || 0,
            languages: ['en', 'hi', 'mr', 'auto'],
          };
        }
      } catch {
        // ASR offline
      }
      
      // Check TTS service
      let ttsStatus: VoiceServiceStatus['tts'] = {
        status: 'offline',
        provider: 'XTTS',
        model: 'xtts_v2',
        latency: 0,
        languages: [],
        voices: [],
      };
      
      try {
        const ttsRes = await fetch('/api/settings/tts/test');
        if (ttsRes.ok) {
          const ttsData = await ttsRes.json();
          ttsStatus = {
            status: ttsData.success ? 'healthy' : 'unhealthy',
            provider: 'XTTS v2 (Local)',
            model: 'xtts_v2',
            latency: ttsData.latency || 0,
            languages: ['en', 'hi', 'mr'],
            voices: ['default', 'male', 'female'],
          };
        }
      } catch {
        // TTS offline
      }
      
      setStatus({ asr: asrStatus, tts: ttsStatus });
      setLoading(false);
    } catch (error) {
      console.error('Failed to load voice services status:', error);
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStatus();
    setTimeout(() => setRefreshing(false), 500);
  };

  // Recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Microphone access denied or not available');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async () => {
    if (!audioBlob) return;
    
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', config.asr.language);
      
      const response = await fetch('/api/asr/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        setTranscription(data.text || data.transcription || '');
      } else {
        throw new Error('Transcription failed');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      setTranscription('Error: Failed to transcribe audio');
    } finally {
      setIsTranscribing(false);
    }
  };

  const generateSpeech = async () => {
    if (!ttsText.trim()) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/tts/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: ttsText,
          language: config.tts.language,
          speed: config.tts.speed,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.audio) {
          // Convert base64 to blob
          const byteCharacters = atob(data.audio);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: data.contentType || 'audio/mp3' });
          const url = URL.createObjectURL(blob);
          setTtsAudioUrl(url);
        } else {
          throw new Error(data.error || 'TTS generation failed');
        }
      } else {
        throw new Error('TTS generation failed');
      }
    } catch (error) {
      console.error('TTS error:', error);
      alert('Failed to generate speech');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveConfig = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: [
            { key: 'asr_provider', value: config.asr.provider },
            { key: 'asr_model', value: config.asr.model },
            { key: 'asr_language', value: config.asr.language },
            { key: 'tts_provider', value: config.tts.provider },
            { key: 'tts_model', value: config.tts.model },
            { key: 'tts_language', value: config.tts.language },
            { key: 'tts_speed', value: config.tts.speed.toString() },
          ],
        }),
      });
      
      if (response.ok) {
        alert('Voice configuration saved successfully!');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save configuration');
    }
  };

  const getStatusBadge = (status: 'healthy' | 'unhealthy' | 'offline') => {
    const styles = {
      healthy: 'bg-green-100 text-green-700 border-green-300',
      unhealthy: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      offline: 'bg-red-100 text-red-700 border-red-300',
    };
    const icons = {
      healthy: <CheckCircle size={16} />,
      unhealthy: <AlertCircle size={16} />,
      offline: <XCircle size={16} />,
    };
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-sm font-medium ${styles[status]}`}>
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="animate-spin text-[#059211]" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Radio size={32} />
              <h1 className="text-3xl font-bold">Voice AI Services</h1>
            </div>
            <p className="text-purple-100">
              Configure Speech-to-Text (ASR) and Text-to-Speech (TTS) for voice interactions
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-white text-purple-600 px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
          >
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ASR Status Card */}
        <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Mic size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Speech-to-Text (ASR)</h3>
                <p className="text-sm text-gray-500">Whisper Large v3</p>
              </div>
            </div>
            {status && getStatusBadge(status.asr.status)}
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Provider</div>
              <div className="font-medium text-gray-900">{status?.asr.provider || 'N/A'}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Latency</div>
              <div className="font-medium text-gray-900">{status?.asr.latency || 0}ms</div>
            </div>
            <div className="col-span-2 bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Supported Languages</div>
              <div className="flex flex-wrap gap-1">
                {['en', 'hi', 'mr', 'auto'].map(lang => (
                  <span key={lang} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                    {lang === 'auto' ? '🌐 Auto' : lang === 'en' ? '🇬🇧 English' : lang === 'hi' ? '🇮🇳 Hindi' : '🇮🇳 Marathi'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* TTS Status Card */}
        <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Volume2 size={24} className="text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Text-to-Speech (TTS)</h3>
                <p className="text-sm text-gray-500">XTTS v2 (Coqui)</p>
              </div>
            </div>
            {status && getStatusBadge(status.tts.status)}
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Provider</div>
              <div className="font-medium text-gray-900">{status?.tts.provider || 'N/A'}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Latency</div>
              <div className="font-medium text-gray-900">{status?.tts.latency || 0}ms</div>
            </div>
            <div className="col-span-2 bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Supported Languages</div>
              <div className="flex flex-wrap gap-1">
                {['en', 'hi'].map(lang => (
                  <span key={lang} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                    {lang === 'en' ? '🇬🇧 English' : '🇮🇳 Hindi'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md border-2 border-gray-100">
        <div className="border-b border-gray-200">
          <div className="flex gap-0">
            {[
              { id: 'asr', label: 'ASR Settings', icon: <Mic size={18} /> },
              { id: 'tts', label: 'TTS Settings', icon: <Volume2 size={18} /> },
              { id: 'test', label: 'Live Testing', icon: <TestTube size={18} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-all ${
                  activeTab === tab.id
                    ? 'text-[#059211] border-b-2 border-[#059211] bg-green-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* ASR Settings Tab */}
          {activeTab === 'asr' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ASR Provider
                  </label>
                  <select
                    value={config.asr.provider}
                    onChange={(e) => setConfig({ ...config, asr: { ...config.asr, provider: e.target.value as any } })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none"
                  >
                    <option value="whisper">🎯 Whisper (Local GPU)</option>
                    <option value="google">☁️ Google Cloud Speech</option>
                    <option value="azure">☁️ Azure Speech</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Local Whisper is free and privacy-preserving</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model Size
                  </label>
                  <select
                    value={config.asr.model}
                    onChange={(e) => setConfig({ ...config, asr: { ...config.asr, model: e.target.value } })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none"
                  >
                    <option value="tiny">Tiny (75MB) - Fastest</option>
                    <option value="base">Base (142MB)</option>
                    <option value="small">Small (466MB)</option>
                    <option value="medium">Medium (1.5GB)</option>
                    <option value="large-v3">Large v3 (2.9GB) - Most Accurate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Language
                  </label>
                  <select
                    value={config.asr.language}
                    onChange={(e) => setConfig({ ...config, asr: { ...config.asr, language: e.target.value } })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none"
                  >
                    <option value="auto">🌐 Auto-detect</option>
                    <option value="en">🇬🇧 English</option>
                    <option value="hi">🇮🇳 Hindi</option>
                    <option value="mr">🇮🇳 Marathi</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Features
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.asr.enableTimestamps}
                        onChange={(e) => setConfig({ ...config, asr: { ...config.asr, enableTimestamps: e.target.checked } })}
                        className="w-5 h-5 rounded border-gray-300 text-[#059211] focus:ring-[#059211]"
                      />
                      <span className="text-gray-700">Word-level Timestamps</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.asr.enableWordConfidence}
                        onChange={(e) => setConfig({ ...config, asr: { ...config.asr, enableWordConfidence: e.target.checked } })}
                        className="w-5 h-5 rounded border-gray-300 text-[#059211] focus:ring-[#059211]"
                      />
                      <span className="text-gray-700">Confidence Scores</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TTS Settings Tab */}
          {activeTab === 'tts' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    TTS Provider
                  </label>
                  <select
                    value={config.tts.provider}
                    onChange={(e) => setConfig({ ...config, tts: { ...config.tts, provider: e.target.value as any } })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none"
                  >
                    <option value="xtts">🎯 XTTS v2 (Local GPU)</option>
                    <option value="google">☁️ Google Cloud TTS</option>
                    <option value="azure">☁️ Azure Speech</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">XTTS supports voice cloning with reference audio</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    value={config.tts.language}
                    onChange={(e) => setConfig({ ...config, tts: { ...config.tts, language: e.target.value } })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none"
                  >
                    <option value="en">🇬🇧 English</option>
                    <option value="hi">🇮🇳 Hindi</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Speed</label>
                    <span className="text-lg font-bold text-[#059211]">{config.tts.speed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={config.tts.speed}
                    onChange={(e) => setConfig({ ...config, tts: { ...config.tts, speed: parseFloat(e.target.value) } })}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0.5x Slow</span>
                    <span>1.0x Normal</span>
                    <span>2.0x Fast</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Pitch</label>
                    <span className="text-lg font-bold text-[#059211]">{config.tts.pitch.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.1"
                    value={config.tts.pitch}
                    onChange={(e) => setConfig({ ...config, tts: { ...config.tts, pitch: parseFloat(e.target.value) } })}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Low</span>
                    <span>Normal</span>
                    <span>High</span>
                  </div>
                </div>
              </div>

              {/* Voice Cloning Section */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border-2 border-purple-200">
                <div className="flex items-center gap-3 mb-4">
                  <Speaker size={24} className="text-purple-600" />
                  <h3 className="text-lg font-bold text-gray-900">Voice Cloning</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Upload a reference audio file (3-10 seconds) to clone a voice for TTS output.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border-2 border-dashed border-purple-300">
                    <div className="flex items-center gap-3 mb-2">
                      <FileAudio size={20} className="text-purple-600" />
                      <span className="font-medium text-gray-700">English Voice</span>
                    </div>
                    <div className="text-xs text-gray-500 mb-3">ref_en.wav (loaded)</div>
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors">
                      <Upload size={16} />
                      Upload New
                    </button>
                  </div>
                  <div className="bg-white rounded-lg p-4 border-2 border-dashed border-purple-300">
                    <div className="flex items-center gap-3 mb-2">
                      <FileAudio size={20} className="text-purple-600" />
                      <span className="font-medium text-gray-700">Hindi Voice</span>
                    </div>
                    <div className="text-xs text-gray-500 mb-3">ref_hi.wav (loaded)</div>
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors">
                      <Upload size={16} />
                      Upload New
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live Testing Tab */}
          {activeTab === 'test' && (
            <div className="space-y-8">
              {/* ASR Testing */}
              <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
                <div className="flex items-center gap-3 mb-4">
                  <Mic size={24} className="text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900">Test Speech-to-Text</h3>
                </div>
                
                <div className="flex items-center gap-4 mb-4">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                      isRecording
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {isRecording ? <Square size={20} /> : <Mic size={20} />}
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                  </button>
                  
                  {audioBlob && (
                    <button
                      onClick={transcribeAudio}
                      disabled={isTranscribing}
                      className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-all disabled:opacity-50"
                    >
                      {isTranscribing ? <RefreshCw size={20} className="animate-spin" /> : <Brain size={20} />}
                      {isTranscribing ? 'Transcribing...' : 'Transcribe'}
                    </button>
                  )}
                </div>
                
                {isRecording && (
                  <div className="flex items-center gap-2 text-red-600 mb-4">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="font-medium">Recording...</span>
                  </div>
                )}
                
                {transcription && (
                  <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
                    <div className="text-xs text-gray-500 mb-2">Transcription Result:</div>
                    <p className="text-gray-900 font-medium">{transcription}</p>
                  </div>
                )}
              </div>

              {/* TTS Testing */}
              <div className="bg-purple-50 rounded-xl p-6 border-2 border-purple-200">
                <div className="flex items-center gap-3 mb-4">
                  <Volume2 size={24} className="text-purple-600" />
                  <h3 className="text-lg font-bold text-gray-900">Test Text-to-Speech</h3>
                </div>
                
                <div className="mb-4">
                  <textarea
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                    placeholder="Enter text to convert to speech..."
                    className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none min-h-[100px]"
                  />
                </div>
                
                <div className="flex items-center gap-4 mb-4">
                  <button
                    onClick={generateSpeech}
                    disabled={isGenerating || !ttsText.trim()}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-all disabled:opacity-50"
                  >
                    {isGenerating ? <RefreshCw size={20} className="animate-spin" /> : <Play size={20} />}
                    {isGenerating ? 'Generating...' : 'Generate Speech'}
                  </button>
                  
                  <select
                    value={config.tts.language}
                    onChange={(e) => setConfig({ ...config, tts: { ...config.tts, language: e.target.value } })}
                    className="px-4 py-3 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none"
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                  </select>
                </div>
                
                {ttsAudioUrl && (
                  <div className="bg-white rounded-lg p-4 border-2 border-purple-200">
                    <div className="text-xs text-gray-500 mb-2">Generated Audio:</div>
                    <audio controls className="w-full" src={ttsAudioUrl} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      {activeTab !== 'test' && (
        <div className="flex gap-4">
          <button
            onClick={saveConfig}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-[#059211] to-[#047a0e] text-white rounded-lg hover:shadow-lg transition-all font-medium text-lg"
          >
            Save Configuration
          </button>
          <button
            onClick={() => setConfig({
              asr: { provider: 'whisper', model: 'large-v3', language: 'auto', enableTimestamps: true, enableWordConfidence: true },
              tts: { provider: 'xtts', model: 'xtts_v2', language: 'hi', voice: 'default', speed: 1.0, pitch: 1.0 },
            })}
            className="px-6 py-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
          >
            Reset to Defaults
          </button>
        </div>
      )}
    </div>
  );
}
