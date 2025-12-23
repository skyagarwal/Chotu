import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../../llm/services/llm.service';
import { ActionExecutor, ActionExecutionResult, FlowContext } from '../types/flow.types';
import * as Handlebars from 'handlebars';

/**
 * LLM Executor
 * 
 * Generates AI responses using LLM (vLLM, OpenRouter, Groq, etc.)
 */
@Injectable()
export class LlmExecutor implements ActionExecutor {
  readonly name = 'llm';
  private readonly logger = new Logger(LlmExecutor.name);

  constructor(private readonly llmService: LlmService) {
    Handlebars.registerHelper('json', function(context) {
      return JSON.stringify(context);
    });
  }

  private interpolate(text: string, data: any): string {
    if (!text) return text;
    try {
      const template = Handlebars.compile(text);
      return template(data);
    } catch (e) {
      this.logger.warn(`Template interpolation failed: ${e.message}`);
      return text;
    }
  }

  async execute(
    config: Record<string, any>,
    context: FlowContext
  ): Promise<ActionExecutionResult> {
    try {
      let prompt = config.prompt as string;
      let systemPrompt = config.systemPrompt as string;
      const temperature = config.temperature || 0.7;
      const maxTokens = config.maxTokens || 500;

      if (!prompt) {
        return {
          success: false,
          error: 'Prompt is required',
        };
      }

      // Interpolate variables in prompts
      prompt = this.interpolate(prompt, context.data);
      if (systemPrompt) {
        systemPrompt = this.interpolate(systemPrompt, context.data);
      }

      // 🧠 PERSONALIZATION INJECTION
      // If user preference context exists in session data, append it to system prompt
      if (context.data.userPreferenceContext) {
        const prefContext = context.data.userPreferenceContext as string;
        if (systemPrompt) {
          systemPrompt += `\n\n${prefContext}`;
        } else {
          systemPrompt = `You are a helpful AI assistant.\n\n${prefContext}`;
        }
        this.logger.debug(`🧠 Injected user preference context into system prompt`);
      }

      // 🌍 MULTILINGUAL SUPPORT
      // Append instruction to reply in user's language
      const langInstruction = "\n\nIMPORTANT: Reply in the same language as the user (English, Hindi, Marathi, or Hinglish). If the user speaks Hinglish, reply in Hinglish.";
      if (systemPrompt) {
        systemPrompt += langInstruction;
      } else {
        systemPrompt = `You are a helpful AI assistant.${langInstruction}`;
      }

      this.logger.debug(`Generating LLM response with prompt: ${prompt.substring(0, 100)}...`);

      // Get user message from context
      const userMessage = context.data._user_message || '';

      // Build messages array
      const messages: any[] = [];

      // Add system prompt if provided
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt,
        });
      }

      // Add conversation history if available (skip if config.skipHistory is true)
      // skipHistory is useful for extraction tasks where conversation pollutes context
      if (context.data._conversation_history && !config.skipHistory) {
        messages.push(...context.data._conversation_history);
      }

      // Add current user message (if not already in history)
      if (userMessage) {
        messages.push({
          role: 'user',
          content: userMessage,
        });
      }

      // Add the prompt as a user instruction (NOT as assistant message!)
      // The prompt guides the LLM on what kind of response to generate
      // Example: 'Say "I can help you..."' should generate: "I can help you..."
      messages.push({
        role: 'user',
        content: `INSTRUCTION: ${prompt}\n\nGenerate the appropriate response now. Only output the response text, no explanation.`,
      });

      // Call LLM service (default to vLLM for local execution)
      const result = await this.llmService.chat({
        messages,
        temperature,
        maxTokens, // Fixed: using camelCase
        provider: config.provider || 'vllm', // Use local vLLM by default (fast, free, private)
      });

      const response = result.content;

      // JSON Parsing Logic
      if (config.parseJson) {
        try {
          // Try to extract JSON from code blocks first
          const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                           response.match(/```\s*([\s\S]*?)\s*```/);
          
          const jsonString = jsonMatch ? jsonMatch[1] : response;
          
          // Clean up any potential non-JSON text if no code blocks were found
          // This is a simple heuristic: find the first { and last }
          const firstBrace = jsonString.indexOf('{');
          const lastBrace = jsonString.lastIndexOf('}');
          
          let finalJsonString = jsonString;
          if (firstBrace !== -1 && lastBrace !== -1) {
            finalJsonString = jsonString.substring(firstBrace, lastBrace + 1);
          }

          const parsedOutput = JSON.parse(finalJsonString);
          
          return {
            success: true,
            output: parsedOutput,
            event: 'success',
          };
        } catch (e) {
          this.logger.warn(`Failed to parse JSON from LLM response: ${e.message}`);
          // Fallback to raw response if parsing fails, but mark as error or just return raw?
          // If we return raw, the flow might break if it expects an object.
          // Let's return success: false to trigger error handling in flow
          return {
            success: false,
            error: `Failed to parse JSON: ${e.message}`,
            output: response
          };
        }
      }

      // Store response in context
      context.data._last_response = response;
      context.data._llm_model_used = result.model;

      // Update conversation history
      if (!context.data._conversation_history) {
        context.data._conversation_history = [];
      }
      context.data._conversation_history.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: response }
      );

      this.logger.debug(`LLM response generated: ${response.substring(0, 100)}...`);

      return {
        success: true,
        output: response,
        // event: 'user_message', // REMOVED: Do not trigger user_message event automatically. Let the flow wait for actual user input.
      };
    } catch (error) {
      this.logger.error(`LLM execution failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  validate(config: Record<string, any>): boolean {
    return !!config.prompt;
  }
}
