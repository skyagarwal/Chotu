'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, AlertCircle, CheckCircle, Award, Clock, Zap } from 'lucide-react';
import { mangwaleAIClient } from '@/lib/api/mangwale-ai';

interface GamificationSetting {
  key: string;
  value: string;
  type: 'number' | 'boolean' | 'string' | 'json';
  description: string;
  category: string;
  updatedAt?: string;
  updatedBy?: string;
}

export default function GamificationSettingsPage() {
  const [settings, setSettings] = useState<GamificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await mangwaleAIClient.getGamificationSettings();
      
      if (response.success) {
        const settingsArray: GamificationSetting[] = response.data.all.map(s => ({
          key: s.key,
          value: s.value,
          type: s.type as 'number' | 'boolean' | 'string' | 'json',
          description: s.description,
          category: s.category,
          updatedAt: s.updated_at,
          updatedBy: s.updated_by,
        }));
        setSettings(settingsArray);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: string, value: string) => {
    setEditedSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveStatus('idle');
      
      const settingsToUpdate = Object.entries(editedSettings).map(([key, value]) => ({
        key,
        value,
      }));
      
      const response = await mangwaleAIClient.updateGamificationSettings(settingsToUpdate);
      
      if (response.success && response.data.failed === 0) {
        // Update local state
        setSettings(prev => prev.map(setting => ({
          ...setting,
          value: editedSettings[setting.key] ?? setting.value,
          updatedAt: new Date().toISOString(),
          updatedBy: 'admin',
        })));
        
        setEditedSettings({});
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'rewards': return Award;
      case 'limits': return Clock;
      case 'gameplay': return Zap;
      case 'training': return Settings;
      default: return Settings;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'rewards': return 'green';
      case 'limits': return 'orange';
      case 'gameplay': return 'blue';
      case 'training': return 'purple';
      default: return 'gray';
    }
  };

  const categories = ['rewards', 'limits', 'gameplay', 'training'];
  const hasChanges = Object.keys(editedSettings).length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="animate-spin text-green-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#059211] to-[#047a0e] text-white py-12 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Settings size={32} />
                <h1 className="text-4xl font-bold">Gamification Settings</h1>
              </div>
              <p className="text-green-100 text-lg">
                Configure rewards, limits, and gameplay parameters
              </p>
            </div>
            <div className="flex items-center gap-3">
              {saveStatus === 'success' && (
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
                  <CheckCircle size={18} />
                  <span>Saved successfully</span>
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="flex items-center gap-2 bg-red-500/20 px-4 py-2 rounded-lg">
                  <AlertCircle size={18} />
                  <span>Save failed</span>
                </div>
              )}
              <button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all ${
                  hasChanges
                    ? 'bg-white text-green-600 hover:bg-green-50'
                    : 'bg-white/20 text-white/50 cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <p className="text-sm text-blue-900 font-medium mb-1">Database-Driven Configuration</p>
              <p className="text-sm text-blue-800">
                All settings are stored in the <code className="bg-blue-100 px-1 rounded">gamification_settings</code> table.
                Changes take effect immediately with 5-minute cache refresh.
              </p>
            </div>
          </div>
        </div>

        {/* Settings by Category */}
        {categories.map(category => {
          const categorySettings = settings.filter(s => s.category === category);
          if (categorySettings.length === 0) return null;
          
          const Icon = getCategoryIcon(category);
          const color = getCategoryColor(category);

          return (
            <div key={category} className="bg-white rounded-xl shadow-sm border-2 border-gray-100 p-6 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 bg-${color}-100 rounded-lg`}>
                  <Icon className={`text-${color}-600`} size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 capitalize">{category}</h2>
                  <p className="text-sm text-gray-600">
                    {category === 'rewards' && 'Reward amounts for each game type (in ₹)'}
                    {category === 'limits' && 'Rate limiting and cooldown settings'}
                    {category === 'gameplay' && 'Game behavior and user experience'}
                    {category === 'training' && 'Training data collection settings'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {categorySettings.map(setting => {
                  const currentValue = editedSettings[setting.key] ?? setting.value;
                  const isEdited = editedSettings[setting.key] !== undefined;

                  return (
                    <div
                      key={setting.key}
                      className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-colors ${
                        isEdited ? 'border-green-200 bg-green-50' : 'border-gray-100'
                      }`}
                    >
                      <div className="flex-1">
                        <label htmlFor={setting.key} className="block font-medium text-gray-900 mb-1">
                          {setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          {isEdited && (
                            <span className="ml-2 text-xs text-green-600 font-semibold">• Modified</span>
                          )}
                        </label>
                        <p className="text-sm text-gray-600 mb-3">{setting.description}</p>
                        
                        {setting.type === 'boolean' ? (
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={setting.key}
                                value="true"
                                checked={currentValue === 'true'}
                                onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                                className="w-4 h-4 text-green-600"
                              />
                              <span className="text-sm">Enabled</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={setting.key}
                                value="false"
                                checked={currentValue === 'false'}
                                onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                                className="w-4 h-4 text-green-600"
                              />
                              <span className="text-sm">Disabled</span>
                            </label>
                          </div>
                        ) : (
                          <input
                            id={setting.key}
                            type={setting.type === 'number' ? 'number' : 'text'}
                            value={currentValue}
                            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                            step={setting.key.includes('ratio') || setting.key.includes('confidence') ? '0.01' : '1'}
                            min={setting.type === 'number' ? '0' : undefined}
                            max={setting.key.includes('ratio') || setting.key.includes('confidence') ? '1' : undefined}
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Action Bar */}
        {hasChanges && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-lg">
            <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-orange-600">
                <AlertCircle size={20} />
                <span className="font-medium">
                  {Object.keys(editedSettings).length} unsaved change{Object.keys(editedSettings).length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditedSettings({})}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
                >
                  Discard Changes
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save All Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
