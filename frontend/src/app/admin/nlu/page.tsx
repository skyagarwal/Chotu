'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, CheckCircle, XCircle, Loader2, Plus, Globe } from 'lucide-react';

interface NLUProvider {
  id: string;
  name: string;
  endpoint?: string;
  enabled: boolean;
  type?: string;
  languages?: string[];
}

export default function NLUProvidersPage() {
  const [providers, setProviders] = useState<NLUProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const response = await fetch('http://localhost:8080/nlu');
      if (response.ok) {
        const data = await response.json();
        setProviders(data);
      }
    } catch (error) {
      console.error('Failed to load NLU providers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">NLU Providers</h1>
          <p className="text-gray-500 mt-1">
            Natural Language Understanding models for intent classification
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Provider
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{providers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enabled</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {providers.filter((p) => p.enabled).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Multilingual</CardTitle>
            <Globe className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {providers.filter((p) => p.languages && p.languages.length > 1).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Providers List */}
      <Card>
        <CardHeader>
          <CardTitle>NLU Providers</CardTitle>
          <CardDescription>
            Configured NLU models for intent classification and entity extraction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {providers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No NLU providers configured. Add your first provider to get started.
              </div>
            ) : (
              providers.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <Brain className="h-8 w-8 text-purple-500" />
                    <div>
                      <div className="font-semibold">{provider.name}</div>
                      <div className="text-sm text-gray-500">{provider.id}</div>
                      {provider.endpoint && (
                        <div className="text-xs text-gray-400 mt-1">
                          {provider.endpoint}
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        {provider.languages && provider.languages.length > 0 && (
                          <div className="flex gap-1">
                            {provider.languages.map((lang) => (
                              <Badge key={lang} variant="outline" className="text-xs">
                                {lang}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {provider.enabled ? (
                      <Badge className="bg-green-500">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Enabled
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="mr-1 h-3 w-3" />
                        Disabled
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Multilingual Support */}
      <Card>
        <CardHeader>
          <CardTitle>Multilingual Support</CardTitle>
          <CardDescription>
            Language support across NLU providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <Globe className="h-5 w-5 text-blue-500" />
              <div>
                <div className="font-semibold">English (en)</div>
                <div className="text-sm text-gray-500">
                  {providers.filter((p) => p.languages?.includes('en')).length} providers
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <Globe className="h-5 w-5 text-orange-500" />
              <div>
                <div className="font-semibold">Hindi (hi)</div>
                <div className="text-sm text-gray-500">
                  {providers.filter((p) => p.languages?.includes('hi')).length} providers
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <Globe className="h-5 w-5 text-green-500" />
              <div>
                <div className="font-semibold">Marathi (mr)</div>
                <div className="text-sm text-gray-500">
                  {providers.filter((p) => p.languages?.includes('mr')).length} providers
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
