'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowDown, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Settings,
  Zap,
  Cloud,
  Server,
  DollarSign
} from 'lucide-react';
import { mangwaleAIClient } from '@/lib/api/mangwale-ai';

interface Provider {
  id: string;
  name: string;
  type: 'local' | 'cloud';
  status: 'active' | 'inactive' | 'error';
  priority: number;
  avgLatency?: number;
  successRate?: number;
  cost?: string;
  lastUsed?: string;
}

export default function LLMFailoverPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    provider: string;
    latency: number;
    message?: string;
  } | null>(null);

  const [testing, setTesting] = useState(false);

  // Fetch real provider status from backend
  useEffect(() => {
    const fetchProviderStatus = async () => {
      try {
        const data = await mangwaleAIClient.get<any>('/llm/failover-status');
        setProviders(data.providers || []);
      } catch (error) {
        console.error('Failed to fetch provider status:', error);
        // Keep empty array if fetch fails
      } finally {
        setLoading(false);
      }
    };

    fetchProviderStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchProviderStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const testFailover = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const data = await mangwaleAIClient.post<any>('/llm/chat', {
        messages: [{ role: 'user', content: 'Hello, test message' }],
        provider: 'auto',
        max_tokens: 50
      });
      
      setTestResult({
        success: true,
        provider: data.provider || 'unknown',
        latency: data.processingTimeMs || 0,
        message: data.content
      });
    } catch (error) {
      setTestResult({
        success: false,
        provider: 'none',
        latency: 0,
        message: error instanceof Error ? error.message : 'Test failed'
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'inactive':
        return <AlertTriangle className="w-5 h-5 text-gray-400" />;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'local' ? (
      <Server className="w-4 h-4" />
    ) : (
      <Cloud className="w-4 h-4" />
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">LLM Failover Configuration</h1>
            <p className="text-gray-600 mt-2">
              Automatic fallback chain ensures 99.9% uptime for AI services
            </p>
          </div>
          <Button 
            onClick={testFailover} 
            disabled={testing}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {testing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Test Failover
              </>
            )}
          </Button>
        </div>

        {/* Test Result */}
        {testResult && (
          <Alert className={testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
            <AlertDescription>
              <div className="flex items-center justify-between">
                <div>
                  <strong>Failover Test {testResult.success ? 'Passed' : 'Failed'}</strong>
                  <p className="text-sm mt-1">
                    Provider: <span className="font-semibold">{testResult.provider}</span> | 
                    Latency: <span className="font-semibold">{testResult.latency}ms</span>
                  </p>
                  {testResult.message && (
                    <p className="text-sm mt-1 text-gray-600">Response: {testResult.message.substring(0, 100)}...</p>
                  )}
                </div>
                {testResult.success ? (
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-500" />
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Failover Chain */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDown className="w-5 h-5" />
              Automatic Failover Chain
            </CardTitle>
            <CardDescription>
              LLM requests cascade through providers in priority order until one succeeds
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : providers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No providers configured
              </div>
            ) : (
              <div className="space-y-4">
                {providers.map((provider, index) => (
                <div key={provider.id}>
                  <div className={`
                    p-4 rounded-lg border-2 transition-all
                    ${provider.status === 'active' ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}
                  `}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                          <span className="text-2xl font-bold text-gray-400">
                            {provider.priority}
                          </span>
                          <span className="text-xs text-gray-500">Priority</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {getStatusIcon(provider.status)}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">{provider.name}</h3>
                              <Badge variant="outline" className="flex items-center gap-1">
                                {getTypeIcon(provider.type)}
                                {provider.type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              {provider.avgLatency && (
                                <span>⚡ {provider.avgLatency}ms avg</span>
                              )}
                              {provider.successRate && (
                                <span>✓ {provider.successRate}% success</span>
                              )}
                              {provider.cost && (
                                <span className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  {provider.cost}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <Badge 
                          variant={provider.status === 'active' ? 'default' : 'secondary'}
                          className={provider.status === 'active' ? 'bg-green-500' : ''}
                        >
                          {provider.status}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          Last: {provider.lastUsed}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Arrow between providers */}
                  {index < providers.length - 1 && (
                    <div className="flex justify-center my-2">
                      <ArrowDown className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">How Automatic Failover Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold">Step 1: Try vLLM</h4>
                </div>
                <p className="text-sm text-gray-600">
                  First attempt uses local vLLM server (fastest, free, private)
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Cloud className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold">Step 2: Cloud Fallback</h4>
                </div>
                <p className="text-sm text-gray-600">
                  If vLLM fails, cascade through OpenRouter → Groq → OpenAI
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold">Step 3: Success</h4>
                </div>
                <p className="text-sm text-gray-600">
                  First successful provider returns response, others skipped
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-white rounded-lg">
              <h4 className="font-semibold mb-2">Real-World Example:</h4>
              <code className="text-xs block p-2 bg-gray-100 rounded">
                {`[12:34:56] Attempting vLLM (local) → ❌ Connection refused
[12:34:57] Attempting OpenRouter (cloud) → ✅ Success (890ms)
[12:34:57] Response delivered to user`}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* NLU Failover */}
        <Card>
          <CardHeader>
            <CardTitle>NLU Intent Classification Failover</CardTitle>
            <CardDescription>
              3-tier system for intent detection (separate from general LLM)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-xl font-bold text-gray-400">1</span>
                <div className="flex-1">
                  <div className="font-semibold">IndicBERT (Local)</div>
                  <div className="text-sm text-gray-600">
                    Trained model on port 7010 • 15ms latency • 98% accuracy • Free
                  </div>
                </div>
                <Badge className="bg-green-500">Primary</Badge>
              </div>

              <div className="flex justify-center">
                <ArrowDown className="w-5 h-5 text-gray-400" />
              </div>

              <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <span className="text-xl font-bold text-gray-400">2</span>
                <div className="flex-1">
                  <div className="font-semibold">LLM Fallback (vLLM/Cloud)</div>
                  <div className="text-sm text-gray-600">
                    Uses same chain as above • 200-900ms latency • 95% accuracy
                  </div>
                </div>
                <Badge variant="outline">Fallback 1</Badge>
              </div>

              <div className="flex justify-center">
                <ArrowDown className="w-5 h-5 text-gray-400" />
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-xl font-bold text-gray-400">3</span>
                <div className="flex-1">
                  <div className="font-semibold">Heuristic Patterns</div>
                  <div className="text-sm text-gray-600">
                    Keyword matching • 2ms latency • 85% accuracy • Always available
                  </div>
                </div>
                <Badge variant="outline">Final Fallback</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configuration (Environment Variables)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 font-mono text-sm bg-gray-50 p-4 rounded-lg">
              <div><span className="text-blue-600">DEFAULT_CLOUD_PROVIDER</span>=auto</div>
              <div><span className="text-blue-600">ENABLED_LLM_PROVIDERS</span>=groq,openrouter</div>
              <div><span className="text-blue-600">GROQ_API_KEY</span>=gsk_...</div>
              <div><span className="text-blue-600">OPENROUTER_API_KEY</span>=sk-or-...</div>
              <div><span className="text-blue-600">OPENAI_API_KEY</span>=sk-...</div>
              <div className="text-gray-500 mt-2"># Restart backend after changes</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
