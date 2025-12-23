'use client';

import { useState, useEffect } from 'react';
import { 
  Save, Loader2, MessageSquare, Smile, Frown, Meh, Volume2,
  Globe, Palette, Sliders, Sparkles, RefreshCw, Copy, 
  CheckCircle, Bot, Zap, Languages, Clock
} from 'lucide-react';

interface ToneSettings {
  personality: 'friendly' | 'professional' | 'casual' | 'formal';
  enthusiasm: number; // 0-100
  empathy: number; // 0-100
  humor: number; // 0-100
  formality: number; // 0-100
  verbosity: 'concise' | 'balanced' | 'detailed';
  emoji: boolean;
  greetingStyle: 'warm' | 'professional' | 'casual';
}

interface LanguageSettings {
  defaultLanguage: string;
  supportedLanguages: string[];
  autoDetect: boolean;
  translationEnabled: boolean;
  regionalVariants: boolean;
}

interface ResponseSettings {
  maxLength: number;
  includeEmoji: boolean;
  useMarkdown: boolean;
  suggestFollowUps: boolean;
  acknowledgeFirst: boolean;
  useUserName: boolean;
}

interface VoicePersonality {
  ttsVoice: string;
  speechRate: number;
  pitch: number;
  emphasis: 'low' | 'medium' | 'high';
}

interface AgentGlobalSettings {
  tone: ToneSettings;
  language: LanguageSettings;
  response: ResponseSettings;
  voice: VoicePersonality;
}

const DEFAULT_SETTINGS: AgentGlobalSettings = {
  tone: {
    personality: 'friendly',
    enthusiasm: 70,
    empathy: 80,
    humor: 40,
    formality: 50,
    verbosity: 'balanced',
    emoji: true,
    greetingStyle: 'warm',
  },
  language: {
    defaultLanguage: 'hi',
    supportedLanguages: ['en', 'hi', 'mr'],
    autoDetect: true,
    translationEnabled: true,
    regionalVariants: true,
  },
  response: {
    maxLength: 500,
    includeEmoji: true,
    useMarkdown: false,
    suggestFollowUps: true,
    acknowledgeFirst: true,
    useUserName: true,
  },
  voice: {
    ttsVoice: 'default',
    speechRate: 1.0,
    pitch: 1.0,
    emphasis: 'medium',
  },
};

export default function AgentSettingsPage() {
  const [settings, setSettings] = useState<AgentGlobalSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'tone' | 'language' | 'response' | 'voice'>('tone');
  const [previewMessage, setPreviewMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings/agent');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      // Show success
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const generatePreview = () => {
    const { tone } = settings;
    let preview = '';
    
    if (tone.greetingStyle === 'warm') {
      preview = tone.emoji ? '👋 नमस्ते! ' : 'नमस्ते! ';
    } else if (tone.greetingStyle === 'professional') {
      preview = 'नमस्कार, ';
    } else {
      preview = 'हाय! ';
    }

    if (tone.personality === 'friendly') {
      preview += 'मैं आपकी मदद के लिए यहाँ हूँ। ';
    } else if (tone.personality === 'professional') {
      preview += 'मैं आपकी सेवा में हूँ। ';
    }

    if (tone.enthusiasm > 70) {
      preview += tone.emoji ? '✨ ' : '';
      preview += 'आज मैं आपकी क्या सहायता कर सकता हूँ?';
    } else {
      preview += 'कृपया बताएं कि आपको क्या चाहिए।';
    }

    if (settings.response.suggestFollowUps) {
      preview += '\n\nक्या आप खाना ऑर्डर करना चाहते हैं या पार्सल भेजना है?';
    }

    setPreviewMessage(preview);
  };

  useEffect(() => {
    generatePreview();
  }, [settings.tone, settings.response]);

  const tabs = [
    { id: 'tone', name: 'Personality & Tone', icon: Smile },
    { id: 'language', name: 'Languages', icon: Languages },
    { id: 'response', name: 'Response Style', icon: MessageSquare },
    { id: 'voice', name: 'Voice Settings', icon: Volume2 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#059211] mx-auto mb-4" />
          <p className="text-gray-600">Loading agent settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Agent Personality & Settings</h1>
          </div>
          <p className="text-gray-600">
            Configure global tone, language, and response behavior for all AI agents
          </p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#059211] to-[#047a0e] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Saving...
            </>
          ) : (
            <>
              <Save size={20} />
              Save Settings
            </>
          )}
        </button>
      </div>

      {/* Preview Card */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Bot size={20} className="text-purple-500" />
            Live Preview
          </h3>
          <button
            onClick={generatePreview}
            className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800"
          >
            <RefreshCw size={14} />
            Regenerate
          </button>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#059211] to-[#047a0e] rounded-full flex items-center justify-center">
              <Bot size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-gray-900 whitespace-pre-line">{previewMessage}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(previewMessage);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {copied ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} className="text-gray-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium transition-all ${
                  activeTab === tab.id
                    ? 'border-[#059211] text-[#059211]'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Icon size={18} />
                {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tone & Personality Tab */}
      {activeTab === 'tone' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personality Type */}
          <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Palette size={20} className="text-purple-500" />
              Personality Type
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'friendly', label: 'Friendly', emoji: '😊', desc: 'Warm and approachable' },
                { id: 'professional', label: 'Professional', emoji: '💼', desc: 'Formal and business-like' },
                { id: 'casual', label: 'Casual', emoji: '👋', desc: 'Relaxed and informal' },
                { id: 'formal', label: 'Formal', emoji: '🎩', desc: 'Respectful and traditional' },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSettings({
                    ...settings,
                    tone: { ...settings.tone, personality: type.id as ToneSettings['personality'] }
                  })}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    settings.tone.personality === type.id
                      ? 'border-[#059211] bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{type.emoji}</div>
                  <div className="font-medium text-gray-900">{type.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{type.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Tone Sliders */}
          <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Sliders size={20} className="text-blue-500" />
              Tone Adjustments
            </h3>
            <div className="space-y-6">
              {[
                { key: 'enthusiasm', label: 'Enthusiasm', icon: Zap, low: 'Calm', high: 'Excited' },
                { key: 'empathy', label: 'Empathy', icon: Smile, low: 'Neutral', high: 'Very Caring' },
                { key: 'humor', label: 'Humor', icon: Smile, low: 'Serious', high: 'Playful' },
                { key: 'formality', label: 'Formality', icon: MessageSquare, low: 'Casual', high: 'Formal' },
              ].map((slider) => (
                <div key={slider.key}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <slider.icon size={16} className="text-gray-400" />
                      {slider.label}
                    </label>
                    <span className="text-sm font-mono text-gray-500">
                      {settings.tone[slider.key as keyof ToneSettings]}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-16">{slider.low}</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.tone[slider.key as keyof ToneSettings] as number}
                      onChange={(e) => setSettings({
                        ...settings,
                        tone: { ...settings.tone, [slider.key]: parseInt(e.target.value) }
                      })}
                      className="flex-1"
                    />
                    <span className="text-xs text-gray-400 w-16 text-right">{slider.high}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Greeting Style */}
          <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Greeting Style</h3>
            <div className="space-y-3">
              {[
                { id: 'warm', label: 'Warm & Welcoming', example: '👋 नमस्ते! कैसे हैं आप आज?' },
                { id: 'professional', label: 'Professional', example: 'नमस्कार, मैं आपकी सेवा में हूँ।' },
                { id: 'casual', label: 'Casual', example: 'हाय! क्या मदद चाहिए?' },
              ].map((style) => (
                <label
                  key={style.id}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    settings.tone.greetingStyle === style.id
                      ? 'border-[#059211] bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="greetingStyle"
                    checked={settings.tone.greetingStyle === style.id}
                    onChange={() => setSettings({
                      ...settings,
                      tone: { ...settings.tone, greetingStyle: style.id as ToneSettings['greetingStyle'] }
                    })}
                    className="text-[#059211]"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{style.label}</div>
                    <div className="text-sm text-gray-500 mt-1">{style.example}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Verbosity */}
          <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Response Length</h3>
            <div className="flex gap-3">
              {[
                { id: 'concise', label: 'Concise', desc: 'Short, to the point' },
                { id: 'balanced', label: 'Balanced', desc: 'Medium length' },
                { id: 'detailed', label: 'Detailed', desc: 'Thorough explanations' },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSettings({
                    ...settings,
                    tone: { ...settings.tone, verbosity: option.id as ToneSettings['verbosity'] }
                  })}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all text-center ${
                    settings.tone.verbosity === option.id
                      ? 'border-[#059211] bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{option.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">Use Emoji</div>
                <div className="text-sm text-gray-500">Include emoji in responses</div>
              </div>
              <button
                onClick={() => setSettings({
                  ...settings,
                  tone: { ...settings.tone, emoji: !settings.tone.emoji }
                })}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  settings.tone.emoji ? 'bg-[#059211]' : 'bg-gray-300'
                }`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  settings.tone.emoji ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Language Tab */}
      {activeTab === 'language' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Globe size={20} className="text-blue-500" />
              Default Language
            </h3>
            <select
              value={settings.language.defaultLanguage}
              onChange={(e) => setSettings({
                ...settings,
                language: { ...settings.language, defaultLanguage: e.target.value }
              })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none"
            >
              <option value="en">English</option>
              <option value="hi">Hindi (हिंदी)</option>
              <option value="mr">Marathi (मराठी)</option>
              <option value="ta">Tamil (தமிழ்)</option>
              <option value="te">Telugu (తెలుగు)</option>
              <option value="bn">Bengali (বাংলা)</option>
            </select>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Supported Languages</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { code: 'en', name: 'English' },
                { code: 'hi', name: 'Hindi' },
                { code: 'mr', name: 'Marathi' },
                { code: 'ta', name: 'Tamil' },
                { code: 'te', name: 'Telugu' },
                { code: 'bn', name: 'Bengali' },
                { code: 'gu', name: 'Gujarati' },
                { code: 'kn', name: 'Kannada' },
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    const langs = settings.language.supportedLanguages;
                    const newLangs = langs.includes(lang.code)
                      ? langs.filter(l => l !== lang.code)
                      : [...langs, lang.code];
                    setSettings({
                      ...settings,
                      language: { ...settings.language, supportedLanguages: newLangs }
                    });
                  }}
                  className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    settings.language.supportedLanguages.includes(lang.code)
                      ? 'border-[#059211] bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100 lg:col-span-2">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Language Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: 'autoDetect', label: 'Auto-detect Language', desc: 'Automatically detect user language' },
                { key: 'translationEnabled', label: 'Translation', desc: 'Translate responses when needed' },
                { key: 'regionalVariants', label: 'Regional Variants', desc: 'Support regional language variations' },
              ].map((feature) => (
                <div
                  key={feature.key}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">{feature.label}</div>
                    <div className="text-sm text-gray-500">{feature.desc}</div>
                  </div>
                  <button
                    onClick={() => setSettings({
                      ...settings,
                      language: { 
                        ...settings.language, 
                        [feature.key]: !settings.language[feature.key as keyof LanguageSettings] 
                      }
                    })}
                    className={`relative w-14 h-8 rounded-full transition-colors ${
                      settings.language[feature.key as keyof LanguageSettings] ? 'bg-[#059211]' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                      settings.language[feature.key as keyof LanguageSettings] ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Response Style Tab */}
      {activeTab === 'response' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Response Length</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Max Characters</label>
                  <span className="text-sm font-mono text-gray-500">{settings.response.maxLength}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="1000"
                  step="50"
                  value={settings.response.maxLength}
                  onChange={(e) => setSettings({
                    ...settings,
                    response: { ...settings.response, maxLength: parseInt(e.target.value) }
                  })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Brief (100)</span>
                  <span>Detailed (1000)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Response Features</h3>
            <div className="space-y-4">
              {[
                { key: 'includeEmoji', label: 'Include Emoji', desc: 'Add emoji to make responses friendlier' },
                { key: 'useMarkdown', label: 'Markdown Formatting', desc: 'Use bold, lists, etc.' },
                { key: 'suggestFollowUps', label: 'Suggest Follow-ups', desc: 'Add related suggestions' },
                { key: 'acknowledgeFirst', label: 'Acknowledge First', desc: 'Confirm understanding before answering' },
                { key: 'useUserName', label: 'Use User Name', desc: 'Personalize with user\'s name' },
              ].map((feature) => (
                <div
                  key={feature.key}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{feature.label}</div>
                    <div className="text-xs text-gray-500">{feature.desc}</div>
                  </div>
                  <button
                    onClick={() => setSettings({
                      ...settings,
                      response: { 
                        ...settings.response, 
                        [feature.key]: !settings.response[feature.key as keyof ResponseSettings] 
                      }
                    })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.response[feature.key as keyof ResponseSettings] ? 'bg-[#059211]' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      settings.response[feature.key as keyof ResponseSettings] ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Voice Tab */}
      {activeTab === 'voice' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Volume2 size={20} className="text-orange-500" />
              Voice Selection
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">TTS Voice</label>
                <select
                  value={settings.voice.ttsVoice}
                  onChange={(e) => setSettings({
                    ...settings,
                    voice: { ...settings.voice, ttsVoice: e.target.value }
                  })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none"
                >
                  <option value="default">Default Female (Hindi)</option>
                  <option value="male_hi">Male (Hindi)</option>
                  <option value="female_en">Female (English)</option>
                  <option value="male_en">Male (English)</option>
                  <option value="female_mr">Female (Marathi)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Speech Rate</label>
                  <span className="text-sm font-mono text-gray-500">{settings.voice.speechRate.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={settings.voice.speechRate}
                  onChange={(e) => setSettings({
                    ...settings,
                    voice: { ...settings.voice, speechRate: parseFloat(e.target.value) }
                  })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Slow (0.5x)</span>
                  <span>Fast (2x)</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Pitch</label>
                  <span className="text-sm font-mono text-gray-500">{settings.voice.pitch.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={settings.voice.pitch}
                  onChange={(e) => setSettings({
                    ...settings,
                    voice: { ...settings.voice, pitch: parseFloat(e.target.value) }
                  })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Lower</span>
                  <span>Higher</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Voice Emphasis</h3>
            <div className="space-y-3">
              {[
                { id: 'low', label: 'Low Emphasis', desc: 'Calm and steady tone' },
                { id: 'medium', label: 'Medium Emphasis', desc: 'Natural variations' },
                { id: 'high', label: 'High Emphasis', desc: 'Expressive and dynamic' },
              ].map((option) => (
                <label
                  key={option.id}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    settings.voice.emphasis === option.id
                      ? 'border-[#059211] bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="emphasis"
                    checked={settings.voice.emphasis === option.id}
                    onChange={() => setSettings({
                      ...settings,
                      voice: { ...settings.voice, emphasis: option.id as VoicePersonality['emphasis'] }
                    })}
                    className="text-[#059211]"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-500">{option.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
