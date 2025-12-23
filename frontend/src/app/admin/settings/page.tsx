'use client';

import { useState, useEffect } from 'react';
import { Settings, ExternalLink, CheckCircle, XCircle, AlertCircle, Mic, Speaker, HardDrive, Database, Brain } from 'lucide-react';
import { adminBackendClient } from '@/lib/api/admin-backend';

export default function SettingsPage() {
  const [labelStudioUrl, setLabelStudioUrl] = useState('');
  const [labelStudioToken, setLabelStudioToken] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // ASR State
  const [asrTestStatus, setAsrTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [asrTestMessage, setAsrTestMessage] = useState('');

  // TTS State
  const [ttsTestStatus, setTtsTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [ttsTestMessage, setTtsTestMessage] = useState('');

  // Minio State
  const [minioTestStatus, setMinioTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [minioTestMessage, setMinioTestMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await adminBackendClient.getSettings();
      
      const lsUrl = settings.find(s => s.key === 'label-studio-url');
      if (lsUrl) setLabelStudioUrl(lsUrl.value);

      const lsToken = settings.find(s => s.key === 'label-studio-api-key');
      if (lsToken) setLabelStudioToken(lsToken.value);

      const sysPrompt = settings.find(s => s.key === 'system-prompt');
      if (sysPrompt) setSystemPrompt(sysPrompt.value);

    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('Testing connection...');
    
    try {
      // Temporarily save settings to test with new values if they changed
      await adminBackendClient.updateSettings([
        { key: 'label-studio-url', value: labelStudioUrl },
        { key: 'label-studio-api-key', value: labelStudioToken }
      ]);

      const result = await adminBackendClient.testLabelStudioConnection();
      if (result.ok) {
        setTestStatus('success');
        setTestMessage(`✅ Connected successfully! Found ${result.projectsCount || 0} projects.`);
      } else {
        setTestStatus('error');
        setTestMessage('❌ Connection failed. Please check your URL and token.');
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTestAsr = async () => {
    setAsrTestStatus('testing');
    setAsrTestMessage('Testing ASR service...');
    try {
      const result = await adminBackendClient.testAsrConnection();
      if (result.ok) {
        setAsrTestStatus('success');
        setAsrTestMessage('✅ ASR Service is healthy and responding.');
      } else {
        setAsrTestStatus('error');
        setAsrTestMessage(`❌ ASR Service check failed: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      setAsrTestStatus('error');
      setAsrTestMessage(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTestTts = async () => {
    setTtsTestStatus('testing');
    setTtsTestMessage('Testing TTS service...');
    try {
      const result = await adminBackendClient.testTtsConnection();
      if (result.ok) {
        setTtsTestStatus('success');
        setTtsTestMessage('✅ TTS Service is healthy and responding.');
      } else {
        setTtsTestStatus('error');
        setTtsTestMessage(`❌ TTS Service check failed: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      setTtsTestStatus('error');
      setTtsTestMessage(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTestMinio = async () => {
    setMinioTestStatus('testing');
    setMinioTestMessage('Testing Minio storage...');
    try {
      const result = await adminBackendClient.testMinioConnection();
      if (result.ok) {
        setMinioTestStatus('success');
        setMinioTestMessage('✅ Minio Storage is healthy and accessible.');
      } else {
        setMinioTestStatus('error');
        setMinioTestMessage(`❌ Minio check failed: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      setMinioTestStatus('error');
      setMinioTestMessage(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminBackendClient.updateSettings([
        { key: 'label-studio-url', value: labelStudioUrl },
        { key: 'label-studio-api-key', value: labelStudioToken },
        { key: 'system-prompt', value: systemPrompt }
      ]);
      alert('Settings saved successfully!');
      setSaving(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#059211] to-[#047a0e] text-white py-12 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Settings size={32} />
            <h1 className="text-4xl font-bold">Settings</h1>
          </div>
          <p className="text-green-100 text-lg">
            Configure external integrations and system preferences
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">
        {/* AI Business Context Configuration */}
        <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-100 rounded-lg">
              <Brain className="text-green-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI Business Context</h2>
              <p className="text-sm text-gray-600">Define the persona, rules, and business knowledge for the AI Agent</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-900">
                This "System Prompt" defines how the AI behaves. You can use placeholders like <code>{`{{userName}}`}</code>, <code>{`{{platform}}`}</code>, <code>{`{{time}}`}</code>, and <code>{`{{isAuthenticated}}`}</code> to inject dynamic context.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                System Prompt / Business Rules
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="You are Mangwale AI..."
                rows={15}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#059211] focus:border-transparent font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Be specific about what the AI should and should not do.
              </p>
            </div>

            {/* Save Button for this section specifically? No, global save is fine. */}
          </div>
        </div>

        {/* Label Studio Configuration */}
        <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Settings className="text-blue-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Label Studio Integration</h2>
              <p className="text-sm text-gray-600">Configure Label Studio for dataset annotation</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-blue-600 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="text-sm text-blue-900 font-medium mb-1">About Label Studio</p>
                  <p className="text-sm text-blue-800">
                    Label Studio is an open-source data labeling tool. Use it to annotate training data 
                    with intents, entities, and other labels, then sync back to Mangwale AI.
                  </p>
                  <a 
                    href="https://labelstud.io" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-2 inline-flex items-center gap-1"
                  >
                    Learn more about Label Studio <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>

            {/* URL Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Label Studio URL
              </label>
              <input
                type="url"
                value={labelStudioUrl}
                onChange={(e) => setLabelStudioUrl(e.target.value)}
                placeholder="http://localhost:8080"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#059211] focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                The base URL of your Label Studio instance (e.g., http://localhost:8080)
              </p>
            </div>

            {/* Token Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Token
              </label>
              <input
                type="password"
                value={labelStudioToken}
                onChange={(e) => setLabelStudioToken(e.target.value)}
                placeholder="Enter your Label Studio API token"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#059211] focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Find your API token in Label Studio: Account & Settings → Access Token
              </p>
            </div>

            {/* Test Connection */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleTestConnection}
                disabled={!labelStudioUrl || !labelStudioToken || testStatus === 'testing'}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors text-sm font-medium"
              >
                {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
              </button>
              
              {testStatus !== 'idle' && (
                <div className={`flex items-center gap-2 text-sm font-medium ${
                  testStatus === 'success' ? 'text-green-600' :
                  testStatus === 'error' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {testStatus === 'success' && <CheckCircle size={18} />}
                  {testStatus === 'error' && <XCircle size={18} />}
                  {testMessage}
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={saving || !labelStudioUrl || !labelStudioToken}
                className="px-6 py-2 bg-gradient-to-r from-[#059211] to-[#047a0e] hover:shadow-lg disabled:opacity-50 text-white rounded-lg transition-all text-sm font-medium"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>

        {/* ASR Service Configuration */}
        <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Mic className="text-purple-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">ASR Service (Speech-to-Text)</h2>
              <p className="text-sm text-gray-600">Configure Automatic Speech Recognition service</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-900">
                The ASR service runs internally on port 7000. It converts spoken audio into text for the NLU engine.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleTestAsr}
                disabled={asrTestStatus === 'testing'}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg transition-colors text-sm font-medium"
              >
                {asrTestStatus === 'testing' ? 'Testing...' : 'Test ASR Connection'}
              </button>
              
              {asrTestStatus !== 'idle' && (
                <div className={`flex items-center gap-2 text-sm font-medium ${
                  asrTestStatus === 'success' ? 'text-green-600' :
                  asrTestStatus === 'error' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {asrTestStatus === 'success' && <CheckCircle size={18} />}
                  {asrTestStatus === 'error' && <XCircle size={18} />}
                  {asrTestMessage}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TTS Service Configuration */}
        <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Speaker className="text-orange-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">TTS Service (Text-to-Speech)</h2>
              <p className="text-sm text-gray-600">Configure Text-to-Speech synthesis service</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-900">
                The TTS service runs internally on port 8010. It converts text responses into spoken audio.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleTestTts}
                disabled={ttsTestStatus === 'testing'}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white rounded-lg transition-colors text-sm font-medium"
              >
                {ttsTestStatus === 'testing' ? 'Testing...' : 'Test TTS Connection'}
              </button>
              
              {ttsTestStatus !== 'idle' && (
                <div className={`flex items-center gap-2 text-sm font-medium ${
                  ttsTestStatus === 'success' ? 'text-green-600' :
                  ttsTestStatus === 'error' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {ttsTestStatus === 'success' && <CheckCircle size={18} />}
                  {ttsTestStatus === 'error' && <XCircle size={18} />}
                  {ttsTestMessage}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Minio Storage Configuration */}
        <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-red-100 rounded-lg">
              <HardDrive className="text-red-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Object Storage (Minio)</h2>
              <p className="text-sm text-gray-600">Configure S3-compatible object storage</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-900">
                Minio provides S3-compatible storage for datasets, models, and audio files. It runs internally on port 9000.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleTestMinio}
                disabled={minioTestStatus === 'testing'}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-lg transition-colors text-sm font-medium"
              >
                {minioTestStatus === 'testing' ? 'Testing...' : 'Test Storage Connection'}
              </button>
              
              {minioTestStatus !== 'idle' && (
                <div className={`flex items-center gap-2 text-sm font-medium ${
                  minioTestStatus === 'success' ? 'text-green-600' :
                  minioTestStatus === 'error' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {minioTestStatus === 'success' && <CheckCircle size={18} />}
                  {minioTestStatus === 'error' && <XCircle size={18} />}
                  {minioTestMessage}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">How to Use Label Studio</h3>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-[#059211] text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Create a Dataset</h4>
                <p className="text-sm text-gray-600">
                  Go to Training → Datasets and create a new dataset with training examples.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-[#059211] text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Push to Label Studio</h4>
                <p className="text-sm text-gray-600">
                  Click &quot;Push to LS&quot; on any dataset to export it to Label Studio for annotation.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-[#059211] text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Annotate in Label Studio</h4>
                <p className="text-sm text-gray-600">
                  Open Label Studio in your browser and annotate the examples with intents, entities, and labels.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-[#059211] text-white rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Pull Annotations</h4>
                <p className="text-sm text-gray-600">
                  Click &quot;Pull from LS&quot; to import annotated data back to Mangwale AI.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-[#059211] text-white rounded-full flex items-center justify-center font-bold">
                5
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Train Your Model</h4>
                <p className="text-sm text-gray-600">
                  Use the enriched dataset to train your AI models with high-quality annotations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
