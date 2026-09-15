/**
 * Simple LLM Service (Alternative to AnythingLLM)
 * Uses OpenAI API or Ollama for RAG-like responses
 */

import { buildAstrologerPrompt } from '@/lib/prompts/astrologer-persona'
import { getPromptText, PROMPT_NAMES } from '@/lib/services/prompts'

interface LLMConfig {
  provider: 'openai' | 'ollama'
  apiKey?: string
  apiUrl?: string
  model?: string
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatResponse {
  response: string
  sources?: Array<{
    title: string
    chunk: string
    score: number
  }>
}

class LLMService {
  private config: LLMConfig

  constructor() {
    // Check which provider to use
    const useOllama = process.env.USE_OLLAMA === 'true'

    this.config = {
      provider: useOllama ? 'ollama' : 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      apiUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434',
      model: useOllama
        ? process.env.OLLAMA_MODEL || 'llama3.2'
        : process.env.OPENAI_MODEL || 'gpt-4o-mini',
    }
  }

  /**
   * System prompt for the astrologer persona.
   *
   * The text lives in lib/prompts/astrologer-persona.ts and, when a version is
   * active, in the `prompts` table. Both this service and the AnythingLLM
   * service read the same prompt - they used to define their own, and had
   * drifted apart.
   */
  private async getSystemPrompt(userContext?: string): Promise<string> {
    const { content } = await getPromptText(
      PROMPT_NAMES.ASTROLOGER_PERSONA,
      buildAstrologerPrompt()
    )

    if (!userContext) return content

    return `${content}

========================================
CLIENT PROFILE AND PALM ANALYSIS:
========================================

${userContext}

========================================
INSTRUCTIONS:
========================================

The above profile contains the client's birth details, astrological chart summary, and DETAILED PALM READING with specific lines, mounts, and features.

When answering questions:
1. Use the SPECIFIC palm features provided (heart line, marriage lines, life line, etc.)
2. Reference the actual interpretations given for each line
3. Integrate birth chart information when relevant
4. Give confident, specific guidance based on these details
5. NEVER mention that this is structured data or computer analysis

Respond as if you personally examined this client's palm and birth chart.`
  }

  /**
   * Chat with LLM (OpenAI or Ollama)
   */
  async chat(
    message: string,
    context?: string,
    history?: ChatMessage[]
  ): Promise<ChatResponse> {
    if (this.config.provider === 'ollama') {
      return this.chatWithOllama(message, context, history)
    } else {
      return this.chatWithOpenAI(message, context, history)
    }
  }

  /**
   * Chat with OpenAI
   */
  private async chatWithOpenAI(
    message: string,
    context?: string,
    history?: ChatMessage[]
  ): Promise<ChatResponse> {
    if (!this.config.apiKey) {
      throw new Error('OPENAI_API_KEY is not set')
    }

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: await this.getSystemPrompt(context),
      },
    ]

    // Add history (last 10 messages to avoid token limits)
    if (history && history.length > 0) {
      messages.push(...history.slice(-10))
    }

    // Add current message
    messages.push({
      role: 'user',
      content: message,
    })

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          temperature: 0.7,
          max_tokens: 1000,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`OpenAI API error: ${error}`)
      }

      const data = await response.json()
      const responseText = data.choices[0]?.message?.content || 'No response generated'

      return {
        response: responseText,
        sources: context ? [
          {
            title: 'User Profile',
            chunk: context.substring(0, 200) + '...',
            score: 1.0,
          },
        ] : undefined,
      }
    } catch (error) {
      console.error('Error calling OpenAI:', error)
      throw error
    }
  }

  /**
   * Chat with Ollama (local)
   */
  private async chatWithOllama(
    message: string,
    context?: string,
    history?: ChatMessage[]
  ): Promise<ChatResponse> {
    const systemPrompt = await this.getSystemPrompt(context)

    // Build prompt with context and history
    let prompt = `${systemPrompt}\n\n`

    // Add history
    if (history && history.length > 0) {
      prompt += '## Conversation History:\n'
      for (const msg of history.slice(-5)) {
        prompt += `${msg.role === 'user' ? 'User' : 'Aarav'}: ${msg.content}\n\n`
      }
    }

    // Add current message
    prompt += `User: ${message}\n\nAarav:`

    try {
      const response = await fetch(`${this.config.apiUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          prompt,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 1000,
          },
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Ollama API error: ${error}`)
      }

      const data = await response.json()
      const responseText = data.response || 'No response generated'

      return {
        response: responseText,
        sources: context ? [
          {
            title: 'User Profile',
            chunk: context.substring(0, 200) + '...',
            score: 1.0,
          },
        ] : undefined,
      }
    } catch (error) {
      console.error('Error calling Ollama:', error)
      throw error
    }
  }
}

export const llmService = new LLMService()
export type { ChatMessage, ChatResponse }
