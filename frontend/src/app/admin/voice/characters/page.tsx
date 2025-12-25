'use client';

import { useState, useEffect, useRef } from 'react';
import {
  User, Plus, Edit, Trash2, Save, X, Play, Volume2, Mic,
  Settings, Globe, Heart, Palette, BarChart3, RefreshCw,
  ChevronDown, ChevronUp, CheckCircle, AlertCircle, Loader2
} from 'lucide-react';

interface VoiceCharacter {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  avatar?: string;
  personality?: Record<string, any>;
  traits: string[];
  defaultLanguage: string;
  defaultExaggeration: number;
  defaultCfgWeight: number;
  defaultSpeed: number;
  defaultPitch: number;
  ttsEngine: string;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  languageSettings: LanguageSetting[];
  emotionPresets: EmotionPreset[];
  stylePresets: StylePreset[];
}

interface LanguageSetting {
  id: string;
  languageCode: string;
  languageName: string;
  exaggeration: number;
  cfgWeight: number;
  speed: number;
  pitch: number;
  isEnabled: boolean;
}

interface EmotionPreset {
  id: string;
  name: string;
  displayName: string;
  category?: string;
  exaggeration: number;
  cfgWeight: number;
  speedMultiplier: number;
  isActive: boolean;
  sortOrder: number;
}

interface StylePreset {
  id: string;
  name: string;
  displayName: string;
  exaggeration: number;
  cfgWeight: number;
  speed: number;
  sampleText?: string;
  isActive: boolean;
  sortOrder: number;
}

const API_BASE = "/api";

export default function VoiceCharactersPage() {
  const [characters, setCharacters] = useState<VoiceCharacter[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<VoiceCharacter | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'emotions' | 'styles' | 'languages' | 'test'>('settings');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('basic');
  
  // Test state
  const [testText, setTestText] = useState('नमस्ते, मैं आपकी सेवा में हाज़िर हूं।');
  const [testLanguage, setTestLanguage] = useState('hi');
  const [testEmotion, setTestEmotion] = useState('');
  const [testStyle, setTestStyle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Active chatbot persona selector
  const [activePersona, setActivePersona] = useState<string>('chotu');
  const [savingPersona, setSavingPersona] = useState(false);


  // New character form
  const [newCharacter, setNewCharacter] = useState({
    name: '',
    displayName: '',
    description: '',
    defaultLanguage: 'hi',
    defaultExaggeration: 0.5,
    defaultCfgWeight: 0.5,
    defaultSpeed: 1.0,
    ttsEngine: 'chatterbox',
    traits: [] as string[],
  });

  useEffect(() => {
    loadCharacters();
    loadActivePersona();
  }, []);

  
  // Load active persona setting
  const loadActivePersona = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/active-chatbot-persona`);
      if (res.ok) {
        const data = await res.json();
        setActivePersona(data.value || 'chotu');
      }
    } catch (err) {
      console.error('Failed to load active persona:', err);
    }
  };

  // Save active persona setting
  const saveActivePersona = async (persona: string) => {
    setSavingPersona(true);
    try {
      const res = await fetch(`${API_BASE}/settings/active-chatbot-persona`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: persona }),
      });
      if (res.ok) {
        setActivePersona(persona);
      }
    } catch (err) {
      setError('Failed to save persona setting');
    } finally {
      setSavingPersona(false);
    }
  };

  const loadCharacters = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/voice-characters?includeInactive=true`);
      if (!res.ok) throw new Error('Failed to load characters');
      const data = await res.json();
      setCharacters(data);
      if (data.length > 0 && !selectedCharacter) {
        setSelectedCharacter(data.find((c: VoiceCharacter) => c.isDefault) || data[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createCharacter = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/voice-characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCharacter),
      });
      if (!res.ok) throw new Error('Failed to create character');
      const data = await res.json();
      setCharacters([...characters, data]);
      setSelectedCharacter(data);
      setShowCreateModal(false);
      setNewCharacter({
        name: '',
        displayName: '',
        description: '',
        defaultLanguage: 'hi',
        defaultExaggeration: 0.5,
        defaultCfgWeight: 0.5,
        defaultSpeed: 1.0,
        ttsEngine: 'chatterbox',
        traits: [],
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateCharacter = async (updates: Partial<VoiceCharacter>) => {
    if (!selectedCharacter) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/voice-characters/${selectedCharacter.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update character');
      const data = await res.json();
      setCharacters(characters.map(c => c.id === data.id ? data : c));
      setSelectedCharacter(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteCharacter = async (id: string) => {
    if (!confirm('Are you sure you want to delete this character?')) return;
    try {
      const res = await fetch(`${API_BASE}/voice-characters/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete character');
      setCharacters(characters.filter(c => c.id !== id));
      if (selectedCharacter?.id === id) {
        setSelectedCharacter(characters[0] || null);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const addEmotionPreset = async () => {
    if (!selectedCharacter) return;
    const name = prompt('Emotion name (e.g., happy, sad):');
    if (!name) return;
    const displayName = prompt('Display name:', name);
    
    try {
      const res = await fetch(`${API_BASE}/voice-characters/${selectedCharacter.id}/emotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          displayName: displayName || name,
          exaggeration: 0.5,
          cfgWeight: 0.5,
          speedMultiplier: 1.0,
        }),
      });
      if (!res.ok) throw new Error('Failed to add emotion');
      await loadCharacters();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const updateEmotionPreset = async (emotionId: string, updates: Partial<EmotionPreset>) => {
    try {
      const res = await fetch(`${API_BASE}/voice-characters/emotions/${emotionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update emotion');
      await loadCharacters();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteEmotionPreset = async (emotionId: string) => {
    if (!confirm('Delete this emotion preset?')) return;
    try {
      await fetch(`${API_BASE}/voice-characters/emotions/${emotionId}`, { method: 'DELETE' });
      await loadCharacters();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const addStylePreset = async () => {
    if (!selectedCharacter) return;
    const name = prompt('Style name (e.g., greeting, farewell):');
    if (!name) return;
    const displayName = prompt('Display name:', name);
    
    try {
      const res = await fetch(`${API_BASE}/voice-characters/${selectedCharacter.id}/styles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          displayName: displayName || name,
          exaggeration: 0.5,
          cfgWeight: 0.5,
          speed: 1.0,
        }),
      });
      if (!res.ok) throw new Error('Failed to add style');
      await loadCharacters();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const updateStylePreset = async (styleId: string, updates: Partial<StylePreset>) => {
    try {
      const res = await fetch(`${API_BASE}/voice-characters/styles/${styleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update style');
      await loadCharacters();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteStylePreset = async (styleId: string) => {
    if (!confirm('Delete this style preset?')) return;
    try {
      await fetch(`${API_BASE}/voice-characters/styles/${styleId}`, { method: 'DELETE' });
      await loadCharacters();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const testVoice = async () => {
    if (!selectedCharacter) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/voice-characters/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testText,
          character: selectedCharacter.name,
          language: testLanguage,
          emotion: testEmotion || undefined,
          style: testStyle || undefined,
        }),
      });
      if (!res.ok) throw new Error('TTS failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2">Loading voice characters...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="w-7 h-7 text-purple-500" />
            Voice Characters
          </h1>
          <p className="text-gray-500 mt-1">Manage TTS voice characters, emotions, and styles</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadCharacters}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Character
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}


      {/* Active Chatbot Persona Selector */}
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="/chotu-mascot.png" 
              alt="Chotu Mascot" 
              className="w-16 h-16 rounded-full border-2 border-purple-300 shadow-lg"
            />
            <div>
              <h3 className="font-semibold text-purple-800">Active Chatbot Persona</h3>
              <p className="text-sm text-purple-600">This character's personality will be used for all chatbot responses</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={activePersona}
              onChange={(e) => saveActivePersona(e.target.value)}
              disabled={savingPersona}
              className="px-4 py-2 border border-purple-300 rounded-lg bg-white text-purple-800 font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              {characters.map(char => (
                <option key={char.name} value={char.name}>
                  {char.displayName}
                </option>
              ))}
              <option value="none">None (Generic AI)</option>
            </select>
            {savingPersona && <Loader2 className="w-5 h-5 animate-spin text-purple-500" />}
            {!savingPersona && activePersona !== 'none' && (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Character List */}
        <div className="col-span-3 bg-white rounded-xl shadow-sm border p-4">
          <h2 className="font-semibold mb-4 text-gray-700">Characters</h2>
          <div className="space-y-2">
            {characters.map(char => (
              <div
                key={char.id}
                onClick={() => setSelectedCharacter(char)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedCharacter?.id === char.id
                    ? 'bg-purple-100 border-2 border-purple-500'
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      char.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{char.displayName}</div>
                      <div className="text-xs text-gray-500">@{char.name}</div>
                    </div>
                  </div>
                  {char.isDefault && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-600 text-xs rounded-full">
                      Default
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Character Details */}
        <div className="col-span-9">
          {selectedCharacter ? (
            <div className="bg-white rounded-xl shadow-sm border">
              {/* Tabs */}
              <div className="border-b px-4">
                <div className="flex gap-1">
                  {[
                    { id: 'settings', label: 'Settings', icon: Settings },
                    { id: 'emotions', label: 'Emotions', icon: Heart },
                    { id: 'styles', label: 'Styles', icon: Palette },
                    { id: 'languages', label: 'Languages', icon: Globe },
                    { id: 'test', label: 'Test Voice', icon: Volume2 },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-4 py-3 flex items-center gap-2 border-b-2 transition-all ${
                        activeTab === tab.id
                          ? 'border-purple-500 text-purple-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {/* Settings Tab */}
                {activeTab === 'settings' && (
                  <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name (slug)</label>
                        <input
                          type="text"
                          value={selectedCharacter.name}
                          disabled
                          className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                        <input
                          type="text"
                          value={selectedCharacter.displayName}
                          onChange={(e) => updateCharacter({ displayName: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={selectedCharacter.description || ''}
                        onChange={(e) => updateCharacter({ description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    {/* TTS Parameters */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium mb-4">Default TTS Parameters</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">
                            Exaggeration: {selectedCharacter.defaultExaggeration.toFixed(2)}
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={selectedCharacter.defaultExaggeration}
                            onChange={(e) => updateCharacter({ defaultExaggeration: parseFloat(e.target.value) })}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">
                            CFG Weight: {selectedCharacter.defaultCfgWeight.toFixed(2)}
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={selectedCharacter.defaultCfgWeight}
                            onChange={(e) => updateCharacter({ defaultCfgWeight: parseFloat(e.target.value) })}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">
                            Speed: {selectedCharacter.defaultSpeed.toFixed(2)}x
                          </label>
                          <input
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.1"
                            value={selectedCharacter.defaultSpeed}
                            onChange={(e) => updateCharacter({ defaultSpeed: parseFloat(e.target.value) })}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">TTS Engine</label>
                          <select
                            value={selectedCharacter.ttsEngine}
                            onChange={(e) => updateCharacter({ ttsEngine: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg"
                          >
                            <option value="chatterbox">ChatterBox</option>
                            <option value="kokoro">Kokoro</option>
                            <option value="xtts">XTTS v2</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCharacter.isActive}
                          onChange={(e) => updateCharacter({ isActive: e.target.checked })}
                          className="w-4 h-4 rounded text-purple-600"
                        />
                        <span className="text-sm">Active</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCharacter.isDefault}
                          onChange={(e) => updateCharacter({ isDefault: e.target.checked })}
                          className="w-4 h-4 rounded text-purple-600"
                        />
                        <span className="text-sm">Default Character</span>
                      </label>
                    </div>

                    {/* Delete Button */}
                    <div className="pt-4 border-t">
                      <button
                        onClick={() => deleteCharacter(selectedCharacter.id)}
                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Character
                      </button>
                    </div>
                  </div>
                )}

                {/* Emotions Tab */}
                {activeTab === 'emotions' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium">Emotion Presets</h3>
                      <button
                        onClick={addEmotionPreset}
                        className="px-3 py-1.5 bg-purple-100 text-purple-600 hover:bg-purple-200 rounded-lg flex items-center gap-1 text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Add Emotion
                      </button>
                    </div>
                    <div className="space-y-3">
                      {selectedCharacter.emotionPresets?.map(emotion => (
                        <div key={emotion.id} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <span className="font-medium">{emotion.displayName}</span>
                              <span className="ml-2 text-xs text-gray-500">@{emotion.name}</span>
                              {emotion.category && (
                                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                                  {emotion.category}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => deleteEmotionPreset(emotion.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <label className="text-gray-500">Exaggeration: {emotion.exaggeration.toFixed(2)}</label>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={emotion.exaggeration}
                                onChange={(e) => updateEmotionPreset(emotion.id, { exaggeration: parseFloat(e.target.value) })}
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="text-gray-500">CFG Weight: {emotion.cfgWeight.toFixed(2)}</label>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={emotion.cfgWeight}
                                onChange={(e) => updateEmotionPreset(emotion.id, { cfgWeight: parseFloat(e.target.value) })}
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="text-gray-500">Speed: {emotion.speedMultiplier.toFixed(2)}x</label>
                              <input
                                type="range"
                                min="0.5"
                                max="1.5"
                                step="0.05"
                                value={emotion.speedMultiplier}
                                onChange={(e) => updateEmotionPreset(emotion.id, { speedMultiplier: parseFloat(e.target.value) })}
                                className="w-full"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {!selectedCharacter.emotionPresets?.length && (
                        <p className="text-gray-500 text-center py-8">No emotion presets. Click "Add Emotion" to create one.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Styles Tab */}
                {activeTab === 'styles' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium">Style Presets</h3>
                      <button
                        onClick={addStylePreset}
                        className="px-3 py-1.5 bg-purple-100 text-purple-600 hover:bg-purple-200 rounded-lg flex items-center gap-1 text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Add Style
                      </button>
                    </div>
                    <div className="space-y-3">
                      {selectedCharacter.stylePresets?.map(style => (
                        <div key={style.id} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <span className="font-medium">{style.displayName}</span>
                              <span className="ml-2 text-xs text-gray-500">@{style.name}</span>
                            </div>
                            <button
                              onClick={() => deleteStylePreset(style.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                            <div>
                              <label className="text-gray-500">Exaggeration: {style.exaggeration.toFixed(2)}</label>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={style.exaggeration}
                                onChange={(e) => updateStylePreset(style.id, { exaggeration: parseFloat(e.target.value) })}
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="text-gray-500">CFG Weight: {style.cfgWeight.toFixed(2)}</label>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={style.cfgWeight}
                                onChange={(e) => updateStylePreset(style.id, { cfgWeight: parseFloat(e.target.value) })}
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="text-gray-500">Speed: {style.speed.toFixed(2)}x</label>
                              <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={style.speed}
                                onChange={(e) => updateStylePreset(style.id, { speed: parseFloat(e.target.value) })}
                                className="w-full"
                              />
                            </div>
                          </div>
                          {style.sampleText && (
                            <p className="text-sm text-gray-600 italic">"{style.sampleText}"</p>
                          )}
                        </div>
                      ))}
                      {!selectedCharacter.stylePresets?.length && (
                        <p className="text-gray-500 text-center py-8">No style presets. Click "Add Style" to create one.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Languages Tab */}
                {activeTab === 'languages' && (
                  <div>
                    <h3 className="font-medium mb-4">Language Settings</h3>
                    <div className="space-y-3">
                      {selectedCharacter.languageSettings?.map(lang => (
                        <div key={lang.id} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-gray-500" />
                              <span className="font-medium">{lang.languageName}</span>
                              <span className="text-xs text-gray-500">({lang.languageCode})</span>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={lang.isEnabled}
                                onChange={(e) => {
                                  // Update language setting
                                }}
                                className="w-4 h-4 rounded text-purple-600"
                              />
                              <span className="text-sm">Enabled</span>
                            </label>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <label className="text-gray-500">Exaggeration: {lang.exaggeration.toFixed(2)}</label>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={lang.exaggeration}
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="text-gray-500">CFG Weight: {lang.cfgWeight.toFixed(2)}</label>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={lang.cfgWeight}
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="text-gray-500">Speed: {lang.speed.toFixed(2)}x</label>
                              <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={lang.speed}
                                className="w-full"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Test Tab */}
                {activeTab === 'test' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Test Text</label>
                      <textarea
                        value={testText}
                        onChange={(e) => setTestText(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter text to synthesize..."
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                        <select
                          value={testLanguage}
                          onChange={(e) => setTestLanguage(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          {selectedCharacter.languageSettings?.map(lang => (
                            <option key={lang.languageCode} value={lang.languageCode}>
                              {lang.languageName}
                            </option>
                          ))}
                          <option value="hi">Hindi</option>
                          <option value="en">English</option>
                          <option value="mr">Marathi</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Emotion</label>
                        <select
                          value={testEmotion}
                          onChange={(e) => setTestEmotion(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="">Default</option>
                          {selectedCharacter.emotionPresets?.map(emotion => (
                            <option key={emotion.name} value={emotion.name}>
                              {emotion.displayName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Style</label>
                        <select
                          value={testStyle}
                          onChange={(e) => setTestStyle(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="">Default</option>
                          {selectedCharacter.stylePresets?.map(style => (
                            <option key={style.name} value={style.name}>
                              {style.displayName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={testVoice}
                        disabled={isGenerating || !testText.trim()}
                        className="px-6 py-2 bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-300 rounded-lg flex items-center gap-2"
                      >
                        {isGenerating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        Generate
                      </button>
                      {audioUrl && (
                        <audio ref={audioRef} controls className="flex-1">
                          <source src={audioUrl} type="audio/wav" />
                        </audio>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
              <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Select a character or create a new one</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Character Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create Voice Character</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name (slug)</label>
                <input
                  type="text"
                  value={newCharacter.name}
                  onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., chotu, meena"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input
                  type="text"
                  value={newCharacter.displayName}
                  onChange={(e) => setNewCharacter({ ...newCharacter, displayName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Chotu - The Helpful Assistant"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newCharacter.description}
                  onChange={(e) => setNewCharacter({ ...newCharacter, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exaggeration</label>
                  <input
                    type="number"
                    value={newCharacter.defaultExaggeration}
                    onChange={(e) => setNewCharacter({ ...newCharacter, defaultExaggeration: parseFloat(e.target.value) })}
                    min="0"
                    max="1"
                    step="0.1"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CFG Weight</label>
                  <input
                    type="number"
                    value={newCharacter.defaultCfgWeight}
                    onChange={(e) => setNewCharacter({ ...newCharacter, defaultCfgWeight: parseFloat(e.target.value) })}
                    min="0"
                    max="1"
                    step="0.1"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={createCharacter}
                disabled={saving || !newCharacter.name || !newCharacter.displayName}
                className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-300 rounded-lg flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
