import { Injectable, Logger } from '@nestjs/common';
import { AgentContext, FunctionCall, FunctionDefinition, LLMMessage, AgentResult, AgentConfig } from '../types/agent.types';
import { FunctionExecutorService } from './function-executor.service';
import { LlmService } from '../../llm/services/llm.service';

/**
 * Base Agent Class
 * 
 * All specialized agents extend this class.
 * Provides core functionality for LLM-based function calling.
 */
@Injectable()
export abstract class BaseAgent {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly llmService: LlmService,
    protected readonly functionExecutor: FunctionExecutorService,
  ) {}

  /**
   * Get agent configuration
   */
  abstract getConfig(): AgentConfig;

  /**
   * Get system prompt for this agent
   */
  abstract getSystemPrompt(context: AgentContext): string;

  /**
   * Get available functions for this agent
   */
  abstract getFunctions(): FunctionDefinition[];

  /**
   * Execute agent with user message
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const functionsCalled: string[] = [];

    try {
      // Build conversation history
      let systemPrompt = this.getSystemPrompt(context);
      
      // 🧠 NEW: Inject user preference context if available
      if (context.session?.data?.userPreferenceContext) {
        systemPrompt += `\n\n${context.session.data.userPreferenceContext}`;
      }

      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: systemPrompt,
        },
        // Add session history
        ...(context.session?.history || []),
        // Add current message
        {
          role: 'user',
          content: context.message,
        },
      ];

      // Call LLM with function definitions
      const config = this.getConfig();
      let response = await this.llmService.chat({
        model: 'Qwen/Qwen2.5-7B-Instruct-AWQ', // Local vLLM model
        messages,
        functions: this.getFunctions(),
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });

      // Handle function calls (loop for multi-step)
      let iterations = 0;
      const maxIterations = 5;

      while (response.functionCall && iterations < maxIterations) {
        iterations++;

        // Execute function
        const functionName = response.functionCall.name;
        const functionArgs = typeof response.functionCall.arguments === 'string' 
          ? JSON.parse(response.functionCall.arguments)
          : response.functionCall.arguments;

        this.logger.log(
          `Agent ${config.id} calling function: ${functionName}`,
          functionArgs,
        );

        functionsCalled.push(functionName);

        const functionResult = await this.functionExecutor.execute(
          functionName,
          functionArgs,
          context,
        );

        // Add function call and result to messages
        messages.push({
          role: 'assistant',
          content: `Function call: ${functionName}`,
        });

        messages.push({
          role: 'function',
          name: functionName,
          content: JSON.stringify(functionResult),
        });

        // Get next response from LLM
        response = await this.llmService.chat({
          model: 'Qwen/Qwen2.5-7B-Instruct-AWQ', // Local vLLM model
          messages,
          functions: this.getFunctions(),
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        });
      }

      const executionTime = Date.now() - startTime;

      return {
        response: response.content || 'I apologize, but I need more information to help you.',
        functionsCalled,
        executionTime,
        tokensUsed: response.usage?.totalTokens,
      };
    } catch (error) {
      this.logger.error(
        `Agent ${this.getConfig().id} execution error:`,
        error,
      );

      return {
        response: 'I apologize, but I encountered an error. Please try again or contact support.',
        functionsCalled,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Validate function arguments
   */
  protected validateFunctionArgs(
    functionDef: FunctionDefinition,
    args: Record<string, any>,
  ): boolean {
    const required = functionDef.parameters.required || [];

    for (const field of required) {
      if (!(field in args)) {
        this.logger.warn(
          `Missing required argument: ${field} in function ${functionDef.name}`,
        );
        return false;
      }
    }

    return true;
  }
}
