export class ChatCompletionResultDto {
  id: string;
  model: string;
  provider: 'vllm' | 'openai' | 'groq' | 'openrouter' | 'huggingface' | 'together' | 'deepseek' | 'fallback';
  content: string;
  finishReason: 'stop' | 'length' | 'function_call' | 'error';
  
  // Usage statistics
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  // Performance
  processingTimeMs: number;
  
  // Function calling (if applicable)
  functionCall?: {
    name: string;
    arguments: string | Record<string, any>; // Can be JSON string or parsed object
  };

  // Logprobs (if requested)
  logprobs?: any; // vLLM logprobs structure

  // Cost tracking
  estimatedCost?: number; // In USD
}
