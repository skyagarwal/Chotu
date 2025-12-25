import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../../llm/services/llm.service';
import { ActionExecutor, ActionExecutionResult, FlowContext } from '../types/flow.types';
import * as Handlebars from 'handlebars';

/**
 * LLM Executor
 * 
 * Generates AI responses using LLM (vLLM, OpenRouter, Groq, etc.)
 * 
 * ✨ NEW: Includes context injection for:
 * - Weather awareness (temperature, conditions)
 * - Meal time suggestions (breakfast, lunch, dinner)
 * - Festival greetings and special food
 * - Local knowledge (Nashik dishes, slang)
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

  private detectPreferredResponseLanguage(userMessage: string): 'en' | 'hi' | 'mr' | 'hinglish' {
    const msg = (userMessage || '').trim();
    const lower = msg.toLowerCase();

    // Explicit user constraints/preferences should always win.
    if (
      /(i\s*don't\s*know\s*hindi|i\s*do\s*not\s*know\s*hindi|dont\s*know\s*hindi|no\s*hindi|hindi\s+nahi\s+aati|hindi\s+nahi\s+ata|please\s*speak\s*english|speak\s*english|english\s*please|in\s*english)/i.test(
        msg,
      )
    ) {
      return 'en';
    }

    if (/(in\s*hindi|hindi\s*me|hindi\s*mein|हिंदी)/i.test(msg)) return 'hi';
    if (/(in\s*marathi|मराठी)/i.test(msg)) return 'mr';
    if (/(hinglish)/i.test(msg)) return 'hinglish';

    // If the user is writing in Devanagari, assume Hindi/Marathi.
    if (/\p{Script=Devanagari}/u.test(msg)) return 'hi';

    // Safe default.
    return 'en';
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

      // Get user message early (needed for language selection)
      const userMessage = context.data._user_message || '';

      // 🌤️ CONTEXT INJECTION - Weather, Time, Festivals, Local Knowledge
      // If enhanced context exists in flow data, inject it
      if (context.data.enhancedContext) {
        const ctx = context.data.enhancedContext as any;
        const contextBlock = `
== CURRENT CONTEXT (Nashik, ${new Date().toLocaleDateString('en-IN')}) ==
    Weather: ${ctx.weather?.temperature}°C, ${ctx.weather?.condition}
    Time: ${ctx.time?.timeOfDay} (${ctx.time?.mealTime})
    ${ctx.festival?.isToday ? `🎉 TODAY IS ${ctx.festival?.name || ctx.festival?.nameHindi}! Wish user and suggest: ${ctx.festival?.foods?.join(', ')}` : ''}
    ${ctx.festival?.daysAway && ctx.festival?.daysAway <= 3 ? `📅 ${ctx.festival?.name || ctx.festival?.nameHindi} in ${ctx.festival?.daysAway} days` : ''}
${ctx.weather?.isHot ? '🔥 Hot weather - suggest cold drinks: Lassi, Cold Coffee, Nimbu Pani' : ''}
${ctx.weather?.isCold ? '❄️ Cold weather - suggest hot items: Chai, Coffee, Soup, Pakode' : ''}
${ctx.weather?.isRainy ? '🌧️ Rainy - suggest: Pakode, Bhajiya, Maggi, Chai' : ''}

Suggested foods for ${ctx.time?.mealTime}: ${ctx.suggestions?.timeBased?.join(', ') || 'local favorites'}
`;
        if (systemPrompt) {
          systemPrompt += `\n${contextBlock}`;
        } else {
          systemPrompt = `You are a helpful AI assistant.\n${contextBlock}`;
        }
        this.logger.debug(`🌤️ Injected enhanced context (weather: ${ctx.weather?.temperature}°C, meal: ${ctx.time?.mealTime})`);
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

      // 🌍 LANGUAGE SELECTION
      // Default to English to avoid surprising users with Hindi.
      const preferred = this.detectPreferredResponseLanguage(userMessage);
      const langInstruction =
        `\n\nLANGUAGE RULES:` +
        `\n- Default to English.` +
        `\n- If the user writes in Hindi/Marathi (Devanagari), reply in that language.` +
        `\n- If the user explicitly asks for a language, comply.` +
        `\n- If the user says they don't know Hindi (e.g., "hindi nahi aati"), reply in English.` +
        `\n\nRespond in: ${preferred.toUpperCase()}.`;
      if (systemPrompt) {
        systemPrompt += langInstruction;
      } else {
        systemPrompt = `You are a helpful AI assistant.${langInstruction}`;
      }

      this.logger.debug(`Generating LLM response with prompt: ${prompt.substring(0, 100)}...`);

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
