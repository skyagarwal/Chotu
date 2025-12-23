'use client';

import { useState } from 'react';
import { Send, Loader2, Bot, User } from 'lucide-react';
import { mangwaleAIClient } from '@/lib/api/mangwale-ai';

interface Agent {
  id: string;
  name: string;
  module: string;
}

interface TestAgentTabProps {
  agent: Agent;
}

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  intent?: string;
  confidence?: number;
  timestamp: Date;
}

export function TestAgentTab({ agent }: TestAgentTabProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await mangwaleAIClient.testAgent(agent.id, input);
      
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: response.message,
        intent: response.intent,
        confidence: response.confidence,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, agentMessage]);
    } catch (err) {
      console.error('Failed to test agent:', err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setInput('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Test Agent: {agent.name}</h2>
        <p className="text-blue-100">
          Send messages to test how the agent responds. The agent will use its trained NLU model
          to understand intent and generate responses using the configured LLM.
        </p>
      </div>

      {/* Info Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-md border-2 border-gray-100">
          <div className="text-sm text-gray-600 mb-1">Module</div>
          <div className="font-bold text-gray-900">{agent.module}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md border-2 border-gray-100">
          <div className="text-sm text-gray-600 mb-1">Messages Sent</div>
          <div className="font-bold text-gray-900">
            {messages.filter((m) => m.role === 'user').length}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md border-2 border-gray-100">
          <div className="text-sm text-gray-600 mb-1">Responses Received</div>
          <div className="font-bold text-gray-900">
            {messages.filter((m) => m.role === 'agent').length}
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 flex flex-col" style={{ height: '600px' }}>
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-12">
              <Bot size={64} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No messages yet</p>
              <p className="text-sm">Send a message to start testing the agent</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'agent' && (
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-[#059211] to-[#047a0e] rounded-full flex items-center justify-center">
                    <Bot size={20} className="text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] rounded-xl p-4 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.intent && (
                    <div className="mt-3 pt-3 border-t border-gray-300 flex items-center gap-2">
                      <span className="text-xs bg-white/20 px-2 py-1 rounded">
                        Intent: {message.intent}
                      </span>
                      <span className="text-xs bg-white/20 px-2 py-1 rounded">
                        {(message.confidence! * 100).toFixed(0)}% confident
                      </span>
                    </div>
                  )}
                  <div className="text-xs opacity-70 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <User size={20} className="text-white" />
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-[#059211] to-[#047a0e] rounded-full flex items-center justify-center">
                <Bot size={20} className="text-white" />
              </div>
              <div className="bg-gray-100 rounded-xl p-4">
                <Loader2 className="animate-spin text-gray-600" size={20} />
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none resize-none"
              rows={2}
              disabled={loading}
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="px-6 py-3 bg-gradient-to-r from-[#059211] to-[#047a0e] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send size={18} />
                Send
              </button>
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  disabled={loading}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm disabled:opacity-50"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Test Suggestions */}
      {messages.length === 0 && (
        <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-100">
          <h3 className="font-bold text-blue-900 mb-3">Try these test messages:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              'I want to order pizza',
              'Show me restaurants near me',
              'Track my order',
              'Cancel my order',
              'What are your hours?',
              'I need help with my account',
            ].map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => setInput(suggestion)}
                className="text-left px-4 py-2 bg-white hover:bg-blue-100 border border-blue-200 rounded-lg text-sm text-blue-900 transition-colors"
              >
                "{suggestion}"
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
