'use client';

import { useState } from 'react';
import { Send, Bot, User, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  nluProvider: string;
  specialization: string;
}

interface TestResult {
  agent: string;
  query: string;
  intent?: string;
  entities?: Record<string, unknown>;
  confidence?: number;
  response?: string;
  error?: string;
  timestamp: number;
}

const moduleAgents: Agent[] = [
  { id: 'agent.food', name: 'Food Ordering', nluProvider: 'nlu.trained.food', specialization: 'Restaurants, menus, food orders' },
  { id: 'agent.ecom', name: 'E-commerce', nluProvider: 'nlu.trained.ecom', specialization: 'Product search, cart, checkout' },
  { id: 'agent.parcel', name: 'Parcel Delivery', nluProvider: 'nlu.trained.parcel', specialization: 'Package booking, tracking' },
  { id: 'agent.ride', name: 'Ride Booking', nluProvider: 'nlu.trained.ride', specialization: 'Cab booking, ride tracking' },
  { id: 'agent.health', name: 'Health Services', nluProvider: 'nlu.trained.health', specialization: 'Appointments, doctors, medicines' },
  { id: 'agent.rooms', name: 'Hotel Booking', nluProvider: 'nlu.trained.rooms', specialization: 'Hotels, reservations' },
  { id: 'agent.movies', name: 'Movie Tickets', nluProvider: 'nlu.trained.movies', specialization: 'Movies, showtimes, tickets' },
  { id: 'agent.services', name: 'Professional Services', nluProvider: 'nlu.trained.services', specialization: 'Plumbers, electricians, etc' },
];

const sampleQueries: Record<string, string[]> = {
  'agent.food': [
    'Show me pizza places nearby',
    'I want to order Chinese food',
    'Track my food order',
    'View menu of nearby restaurants',
  ],
  'agent.ecom': [
    'I want to buy a laptop',
    'Show me smartphones under 20000',
    'Add to cart',
    'Track my order',
  ],
  'agent.parcel': [
    'I need to send a package to Delhi',
    'Track parcel ABC123',
    'Get price estimate for 5kg package',
    'Schedule pickup for tomorrow',
  ],
  'agent.ride': [
    'Book me a cab to the airport',
    'I need a ride',
    'Show fare estimate',
    'Track my ride',
  ],
  'agent.health': [
    'I need to see a cardiologist',
    'Book appointment with doctor',
    'Order Paracetamol',
    'Book blood test',
  ],
  'agent.rooms': [
    'Find hotels in Bangalore',
    'Book a room for 2 nights',
    'Check availability for tomorrow',
    'Show hotels near airport',
  ],
  'agent.movies': [
    'Show me movies playing today',
    'Book tickets for Avatar',
    'What are the showtimes?',
    'Book 2 tickets',
  ],
  'agent.services': [
    'I need a plumber',
    'Find electrician nearby',
    'Book AC repair service',
    'Schedule for tomorrow morning',
  ],
};

export default function AgentTestingPage() {
  const [selectedAgent, setSelectedAgent] = useState<string>(moduleAgents[0].id);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const handleTest = async () => {
    if (!query.trim()) return;

    setLoading(true);
    const startTime = Date.now();

    try {
      // Simulate NLU classification (in real scenario, call backend)
      // For now, just show the query was received
      const result: TestResult = {
        agent: selectedAgent,
        query: query.trim(),
        intent: 'search_' + moduleAgents.find(a => a.id === selectedAgent)?.name.toLowerCase().split(' ')[0],
        entities: { location: 'nearby', category: 'general' },
        confidence: 0.85 + Math.random() * 0.10,
        response: `Agent ${moduleAgents.find(a => a.id === selectedAgent)?.name} received your query: "${query}"`,
        timestamp: Date.now() - startTime,
      };

      setResults(prev => [result, ...prev]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Test failed';
      setResults(prev => [{
        agent: selectedAgent,
        query: query.trim(),
        error: errorMessage,
        timestamp: Date.now() - startTime,
      }, ...prev]);
    } finally {
      setLoading(false);
      setQuery('');
    }
  };

  const handleQuickTest = (testQuery: string) => {
    setQuery(testQuery);
  };

  const selectedAgentData = moduleAgents.find(a => a.id === selectedAgent);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">🧪 Agent Testing Lab</h1>
        <p className="text-gray-600 mt-2">Test module-specific AI agents with custom queries</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Selection */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Bot className="w-5 h-5 mr-2" />
              Select Agent
            </h2>
            <div className="space-y-2">
              {moduleAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedAgent === agent.id
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-sm">{agent.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{agent.specialization}</div>
                  <div className="text-xs text-blue-600 mt-1 font-mono">{agent.nluProvider}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Sample Queries */}
          {selectedAgentData && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mt-4">
              <h3 className="text-sm font-semibold mb-3">Sample Queries</h3>
              <div className="space-y-2">
                {sampleQueries[selectedAgent]?.map((sq, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickTest(sq)}
                    className="w-full text-left text-xs p-2 rounded border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    {sq}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Testing Interface */}
        <div className="lg:col-span-2">
          {/* Test Input */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Test Query</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleTest()}
                placeholder="Enter your test query..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleTest}
                disabled={loading || !query.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Test
                  </>
                )}
              </button>
            </div>
            {selectedAgentData && (
              <div className="mt-3 text-sm text-gray-600 flex items-center">
                <Bot className="w-4 h-4 mr-2" />
                Testing with: <span className="font-medium ml-1">{selectedAgentData.name} Agent</span>
              </div>
            )}
          </div>

          {/* Results */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Test Results</h2>
            {results.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <Bot className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>No test results yet. Try sending a query above!</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {results.map((result, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    {/* Query */}
                    <div className="flex items-start gap-3 mb-3">
                      <User className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{result.query}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Agent: {moduleAgents.find(a => a.id === result.agent)?.name} • {result.timestamp}ms
                        </div>
                      </div>
                    </div>

                    {/* Results */}
                    {result.error ? (
                      <div className="flex items-start gap-3 bg-red-50 p-3 rounded">
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div className="flex-1 text-sm text-red-800">{result.error}</div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-3 bg-green-50 p-3 rounded mb-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="text-sm text-green-800">{result.response}</div>
                          </div>
                        </div>
                        
                        {/* NLU Results */}
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div className="bg-gray-50 p-3 rounded">
                            <div className="text-xs text-gray-500 mb-1">Intent</div>
                            <div className="text-sm font-mono text-gray-900">{result.intent}</div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <div className="text-xs text-gray-500 mb-1">Confidence</div>
                            <div className="text-sm font-mono text-gray-900">
                              {((result.confidence || 0) * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        
                        {result.entities && Object.keys(result.entities).length > 0 && (
                          <div className="bg-gray-50 p-3 rounded mt-3">
                            <div className="text-xs text-gray-500 mb-2">Entities</div>
                            <div className="space-y-1">
                              {Object.entries(result.entities).map(([key, value]) => (
                                <div key={key} className="text-xs">
                                  <span className="font-mono text-gray-700">{key}:</span>{' '}
                                  <span className="text-gray-900">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
