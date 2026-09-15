/**
 * AnythingLLM Service
 * Handles workspace creation, document management, and RAG retrieval
 */

import { buildAstrologerPrompt } from '@/lib/prompts/astrologer-persona'
import { getPromptText, PROMPT_NAMES } from '@/lib/services/prompts'

import FormDataNode from 'form-data'
import axios from 'axios'

interface AnythingLLMConfig {
  apiUrl: string
  apiKey?: string
}

interface Workspace {
  workspace_id?: string
  id?: string | number
  slug?: string
  name?: string
  created_at?: string
  workspace?: {
    id?: string | number
    slug?: string
    name?: string
  }
}

interface Document {
  doc_id: string
  name: string
  type: string
  content: string
  metadata?: Record<string, any>
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

class AnythingLLMService {
  private config: AnythingLLMConfig

  constructor() {
    // Get AnythingLLM API URL from environment variables
    // Ensure base URL doesn't include /api/v1 (we'll add it per endpoint)
    // Default to localhost if not set (for Docker deployment)
    let baseUrl = process.env.ANYTHINGLLM_API_URL || 'http://localhost:3001'
    
    this.config = {
      apiUrl: baseUrl, // Base URL without /api/v1
      apiKey: process.env.ANYTHINGLLM_API_KEY,
    }
    
    if (!this.config.apiKey) {
      console.warn('ANYTHINGLLM_API_KEY not found in environment variables')
    }
  }

  /**
   * Create a new workspace for a user
   */
  async createWorkspace(userId: string, userName: string): Promise<string> {
    const workspaceName = `User-${userId.substring(0, 8)}-${userName || 'Profile'}`

    try {
      // Try with X-AnythingLLM-API-Key header instead of Authorization
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
      
      if (this.config.apiKey) {
      

        // Also include Authorization as fallback
        headers['Authorization'] = `Bearer ${this.config.apiKey}`
      }
      
      // Use correct endpoint: POST /api/v1/workspace/new (singular, not plural)
      const response = await fetch(`${this.config.apiUrl}/api/v1/workspace/new`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          name: workspaceName,
          // Optional: Configure embedding model, vector DB, etc.
        }),
      })

      // Check if response is HTML
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('text/html')) {
        const text = await response.text()
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          throw new Error(
            `Workspace creation endpoint returned HTML. This means the endpoint is being intercepted by UI middleware. ` +
            `Please verify: 1) API URL is correct (${this.config.apiUrl}), ` +
            `2) API key is valid, ` +
            `3) AnythingLLM version supports this endpoint.`
          )
        }
      }

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `Failed to create workspace: ${errorText}`
        
        // Check if it's an API key error
        if (errorText.includes('api key') || errorText.includes('No valid api key')) {
          errorMessage = `AnythingLLM API key required. Please set ANYTHINGLLM_API_KEY in .env.local or disable API key authentication in AnythingLLM settings.`
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      const workspaceSlug = data.workspace?.slug || data.slug
      const workspaceNumericId = data.workspace?.id || data.id
      const numericId = String(workspaceNumericId || '')
      
      if (!numericId || numericId === 'null' || numericId === 'undefined' || numericId === '') {
        throw new Error(`Workspace numeric ID not found in response`)
      }
      
      // Return both ID and slug in format: "id:slug" or just "id" if slug not available
      // This allows chat to use slug if available
      if (workspaceSlug) {
        return `${numericId}:${workspaceSlug}`
      }
      
      return numericId
    } catch (error) {
      console.error('Error creating AnythingLLM workspace:', error)
      throw error
    }
  }

  /**
   * Get workspace by ID (numeric ID only - slugs return HTML)
   */
  async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    try {
      // Only use numeric ID - slugs return HTML from AnythingLLM
      // If workspaceId is a slug, we need to list all workspaces and find it
      if (!/^\d+$/.test(workspaceId)) {
        // It's a slug, list all workspaces and find by slug
        const listResponse = await fetch(`${this.config.apiUrl}/api/v1/workspaces`, {
          headers: {
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
          },
        })
        
        if (listResponse.ok) {
          const contentType = listResponse.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const workspaces = await listResponse.json()
            const found = workspaces.workspaces?.find((w: any) => 
              w.slug === workspaceId || String(w.slug) === workspaceId
            )
            if (found) {
              return found
            }
          }
        }
        return null
      }

      // Use numeric ID directly
      const response = await fetch(`${this.config.apiUrl}/api/v1/workspaces/${workspaceId}`, {
        headers: {
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        const errorText = await response.text()
        // Check if HTML response
        if (errorText.trim().startsWith('<!DOCTYPE') || errorText.trim().startsWith('<html')) {
          console.warn('AnythingLLM returned HTML for workspace request. Trying list all workspaces.')
          return null
        }
        throw new Error(`Failed to get workspace: ${response.statusText}`)
      }

      // Check content type
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          return null
        }
        throw new Error(`Unexpected content type: ${contentType}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting workspace:', error)
      // Don't throw, return null so calling code can handle it
      return null
    }
  }

  /**
   * Get numeric ID from workspace slug or ID
   */
  private async getWorkspaceNumericId(workspaceId: string): Promise<string> {
    // If it's already numeric, return as is
    if (/^\d+$/.test(workspaceId)) {
      return workspaceId
    }

    // If it's a slug, list all workspaces and find numeric ID
    try {
      const listResponse = await fetch(`${this.config.apiUrl}/api/v1/workspaces`, {
        headers: {
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
      })
      
      if (listResponse.ok) {
        const contentType = listResponse.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const workspaces = await listResponse.json()
          const found = workspaces.workspaces?.find((w: any) => 
            w.slug === workspaceId || String(w.slug) === workspaceId
          )
          if (found && found.id) {
            return String(found.id)
          }
        }
      }
    } catch (error) {
      // Ignore
    }

    // If we can't find it, throw error (don't use slug for document API)
    throw new Error(`Could not resolve numeric ID for workspace slug: ${workspaceId}. Please ensure workspace exists.`)
  }

  /**
   * Validate AnythingLLM API is accessible and returns JSON
   */
  private async validateApiAccess(): Promise<boolean> {
    try {
      const testUrl = `${this.config.apiUrl}/api/v1/workspaces`
      const headers: HeadersInit = {}
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`
      }

      const response = await fetch(testUrl, { headers })
      const contentType = response.headers.get('content-type')
      
      if (contentType && contentType.includes('application/json')) {
        return true
      }
      
      const text = await response.text()
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        return false
      }
      
      return response.ok
    } catch (error) {
      return false
    }
  }

  /**
   * Upload a document to a workspace
   * Based on AnythingLLM API documentation: https://docs.useanything.com/features/api
   */
  async uploadDocument(
    workspaceId: string,
    documentName: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    try {
      // Allow empty workspaceId for global storage uploads (will be added to workspace later)
      // Only reject if it's explicitly 'null' or 'undefined' as strings
      if (workspaceId === 'null' || workspaceId === 'undefined') {
        throw new Error('Workspace ID cannot be "null" or "undefined"')
      }

      if (!this.config.apiKey) {
        throw new Error('API key is required for document upload')
      }

      const baseUrl = this.config.apiUrl.replace(/\/$/, '')
      const apiUrl = `${baseUrl}/api/v1/document/upload`
      
      const formData = new FormDataNode()
      formData.append('file', Buffer.from(content, 'utf-8'), {
        filename: documentName,
        contentType: 'text/plain',
      })
      
      // If workspaceId is provided, resolve it and add to formData
      // If empty, upload to global storage (will be added to workspace later)
      if (workspaceId && workspaceId.trim() !== '') {
        const numericWorkspaceId = await this.getWorkspaceNumericId(workspaceId)
        if (!numericWorkspaceId || numericWorkspaceId.trim() === '') {
          throw new Error('Invalid workspace ID: could not resolve numeric ID')
        }
        formData.append('workspace_id', numericWorkspaceId)
      }
      // If workspaceId is empty, don't add it - upload to global storage
      
      if (metadata) {
        formData.append('metadata', JSON.stringify(metadata))
      }
      
      const formDataHeaders = formData.getHeaders()
      const headers: Record<string, string> = {
        ...formDataHeaders,
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      }

      const response = await axios.post(apiUrl, formData, {
        headers: headers,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        validateStatus: () => true,
        responseType: 'text',
        transformResponse: [(data) => data],
      })

      const contentType = response.headers['content-type'] || response.headers['Content-Type'] || ''
      const responseText = typeof response.data === 'string' ? response.data : String(response.data)

      if (contentType && contentType.includes('text/html')) {
        if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
          throw new Error(
            `AnythingLLM API returned HTML instead of JSON. ` +
            `This usually means the endpoint doesn't exist or authentication failed. ` +
            `URL: ${apiUrl}`
          )
        }
      }

      if (response.status >= 400) {
        const errorText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
        throw new Error(`Failed to upload document (${response.status}): ${errorText.substring(0, 200)}`)
      }

      if (response.status === 204) {
        return `uploaded-${Date.now()}`
      }

      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Unexpected content type: ${contentType}`)
      }

      let data: any
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        throw new Error(`Failed to parse JSON response`)
      }
      
      const docId = data?.doc_id || data?.document?.doc_id || data?.id || data?.documentId
      
      if (!docId) {
        return `uploaded-${Date.now()}`
      }

      return String(docId)
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Unknown error during document upload')
    }
  }

  /**
   * Update or replace a document in a workspace
   */
  async updateDocument(
    workspaceId: string,
    documentId: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Delete old document and create new one
      await this.deleteDocument(workspaceId, documentId)
      await this.uploadDocument(
        workspaceId,
        `user-context-${Date.now()}`,
        content,
        metadata
      )
    } catch (error) {
      throw error
    }
  }

  /**
   * Delete a document from a workspace
   */
  async deleteDocument(workspaceId: string, documentId: string): Promise<void> {
    try {
      // Try to get numeric ID (document API might need numeric ID)
      const numericWorkspaceId = await this.getWorkspaceNumericId(workspaceId)
      
      const response = await fetch(
        `${this.config.apiUrl}/api/v1/workspaces/${numericWorkspaceId}/document/${documentId}`,
        {
          method: 'DELETE',
          headers: {
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
          },
        }
      )

      if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete document: ${response.statusText}`)
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * List all documents in a workspace
   */
  async listDocuments(workspaceId: string): Promise<Document[]> {
    try {
      // Get workspace slug instead of numeric ID (workspace-scoped endpoints might need slug)
      // First, get the workspace to find its slug
      const workspace = await this.getWorkspace(workspaceId)
      if (!workspace) {
        return []
      }
      
      // Try using slug first, fallback to numeric ID
      const workspaceIdentifier = workspace.slug || workspace.workspace?.slug || workspace.id || workspaceId
      
      const headers: HeadersInit = {
        'Accept': 'application/json',
      }
      
      if (this.config.apiKey) {
        // Try both headers
      
        headers['Authorization'] = `Bearer ${this.config.apiKey}`
      }
      
      const response = await fetch(
        `${this.config.apiUrl}/api/v1/workspaces/${workspaceIdentifier}/documents`,
        {
          headers: headers,
        }
      )

      if (!response.ok) {
        // If 404, workspace might not have documents yet - return empty array
        if (response.status === 404) {
          return []
        }
        const errorText = await response.text()
        if (errorText.trim().startsWith('<!DOCTYPE') || errorText.trim().startsWith('<html')) {
          return []
        }
        throw new Error(`Failed to list documents: ${response.statusText}`)
      }

      // Check content type before parsing
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          return []
        }
        throw new Error(`Unexpected content type: ${contentType}`)
      }

      const data = await response.json()
      return data.documents || []
    } catch (error) {
      if (error instanceof SyntaxError) {
        return []
      }
      return []
    }
  }

  /**
   * Chat with the workspace (RAG retrieval)
   */
  async chat(
    workspaceId: string,
    message: string,
    systemPrompt?: string,
    history?: ChatMessage[]
  ): Promise<ChatResponse> {
    // Validate workspace ID format
    if (!workspaceId || workspaceId === 'null' || workspaceId === 'undefined') {
      throw new Error(`Invalid workspace ID: ${workspaceId}. Workspace needs to be recreated.`)
    }

    // Resolved once so the retry path below sends the same prompt.
    const resolvedSystemPrompt = systemPrompt || (await this.getDefaultSystemPrompt())

    // Parse workspace ID - might be in format "id:slug" or just "id"
    let numericId = workspaceId
    let workspaceSlug: string | null = null
    
    if (workspaceId.includes(':')) {
      const parts = workspaceId.split(':')
      numericId = parts[0]
      workspaceSlug = parts[1] || null
    }

    // Only verify workspace if we have a numeric ID
    let workspace = null
    if (/^\d+$/.test(numericId)) {
      workspace = await this.getWorkspace(numericId)
    }
    
    // Determine which identifier to use for chat endpoint
    // Prefer slug if available, otherwise use numeric ID
    let chatIdentifier = numericId // Default to numeric ID
    
    if (workspace) {
      // Workspace found, prefer slug if available
      chatIdentifier = workspace.slug || workspace.workspace?.slug || numericId
      console.log(`Using workspace slug: ${chatIdentifier} (numeric ID: ${numericId})`)
    } else if (workspaceSlug) {
      // Use stored slug if available
      chatIdentifier = workspaceSlug
      console.log(`Using stored workspace slug: ${chatIdentifier} (numeric ID: ${numericId})`)
    } else {
      // Workspace not found and no slug - try numeric ID directly
      console.warn(`Workspace ${numericId} not found in AnythingLLM, attempting to use numeric ID directly`)
    }
    
    // Create AbortController for timeout (outside try for catch access)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 seconds timeout
    
    try {
      // Try both endpoint formats: workspace (singular) and workspaces (plural)
      // AnythingLLM might use either format depending on version
      let chatEndpoint = `${this.config.apiUrl}/api/v1/workspace/${chatIdentifier}/chat`
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
      
      if (this.config.apiKey) {
        // Try both headers
        headers['Authorization'] = `Bearer ${this.config.apiKey}`
      }
      
      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          message,
          systemPrompt: resolvedSystemPrompt,
          history: history || [],
          mode: 'chat', // Use chat mode (no RAG) - context is injected via system prompt
        }),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)

      // Check if response is HTML - if so, try alternative endpoint format
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('text/html')) {
        const text = await response.text()
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          // Try alternative endpoint format (workspaces plural instead of workspace singular)
          console.log(`Trying alternative endpoint format for workspace ${chatIdentifier}`)
          const altEndpoint = `${this.config.apiUrl}/api/v1/workspaces/${chatIdentifier}/chat`
          
          const altResponse = await fetch(altEndpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
              message,
              systemPrompt: resolvedSystemPrompt,
              history: history || [],
              mode: 'chat',
            }),
            signal: controller.signal,
          })
          
          if (altResponse.ok) {
            const altContentType = altResponse.headers.get('content-type')
            if (altContentType && altContentType.includes('application/json')) {
              const chatResponse = await altResponse.json()
              if (chatResponse.textResponse) {
                return {
                  response: chatResponse.textResponse,
                  sources: chatResponse.sources || [],
                }
              }
              return chatResponse
            }
          }
          
          // Both endpoints failed - throw error
          throw new Error(
            `Chat endpoint returned HTML for both endpoint formats. ` +
            `Workspace identifier: ${chatIdentifier}. ` +
            `Please verify: 1) AnythingLLM is running at ${this.config.apiUrl}, ` +
            `2) API key is correct in .env.local (ANYTHINGLLM_API_KEY), ` +
            `3) Workspace ${numericId} exists in AnythingLLM UI. ` +
            `Try accessing: ${this.config.apiUrl}/workspace/${chatIdentifier}`
          )
        }
      }

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText }
        }

        // Check for specific errors
        if (errorData.error || response.status === 404) {
          if (errorData.error?.includes('not a valid workspace') || errorData.error?.includes('workspace') || response.status === 404) {
            throw new Error(
              `Workspace ${workspaceId} not found in AnythingLLM. ` +
              `Please ensure: 1) AnythingLLM is running (check http://localhost:3001), ` +
              `2) API key is correct in .env.local (ANYTHINGLLM_API_KEY), ` +
              `3) Workspace exists. The system will attempt to recreate it automatically.`
            )
          }
          if (errorData.error?.includes('fetch failed') || errorData.error?.includes('LLM') || errorData.error?.includes('provider')) {
            throw new Error(`LLM provider not configured in AnythingLLM. Please configure LLM provider in AnythingLLM settings (Settings → LLM Preference).`)
          }
        }

        throw new Error(`Failed to chat: ${errorText}`)
      }

      const chatResponse = await response.json()
      
      // Handle streaming response or regular response
      if (chatResponse.textResponse) {
        return {
          response: chatResponse.textResponse,
          sources: chatResponse.sources || [],
        }
      }
      
      return chatResponse
    } catch (error) {
      // Clear timeout if still active
      if (typeof timeoutId !== 'undefined') {
        clearTimeout(timeoutId)
      }
      
      console.error('Error in chat:', error)
      
      // Handle timeout or network errors
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('fetch failed')) {
          throw new Error('LLM provider not configured or AnythingLLM service unavailable. Please configure LLM provider in AnythingLLM settings.')
        }
      }
      
      throw error
    }
  }

  /**
   * Default system prompt for the Aarav Dev persona.
   *
   * Reads the active version from the `prompts` table, falling back to
   * lib/prompts/astrologer-persona.ts. This used to be an eight-line summary
   * defined here, which meant every reading was generated from a far weaker
   * prompt than the detailed one that existed in lib/services/llm-service.ts.
   */
  private async getDefaultSystemPrompt(): Promise<string> {
    const { content } = await getPromptText(
      PROMPT_NAMES.ASTROLOGER_PERSONA,
      buildAstrologerPrompt()
    )
    return content
  }

  /**
   * Build context document from user profile
   */
  buildContextDocument(userProfile: {
    name?: string
    country?: string
    preferredLanguage?: string
    timezone?: string
    birthSummary?: string
    palmSummary?: string
    keyInsights?: string[]
    dateOfBirth?: string
    placeOfBirth?: string
    timeOfBirth?: string
    birthTimezone?: string
  }): string {
    const sections: string[] = []

    if (userProfile.birthSummary) {
      sections.push(`## Birth Chart Summary\n${userProfile.birthSummary}`)
    }

    if (userProfile.palmSummary) {
      sections.push(`## Palm Reading Summary\n${userProfile.palmSummary}`)
    }

    if (userProfile.keyInsights && userProfile.keyInsights.length > 0) {
      sections.push(
        `## Key Insights\n${userProfile.keyInsights.map((insight) => `- ${insight}`).join('\n')}`
      )
    }

    if (userProfile.dateOfBirth || userProfile.placeOfBirth || userProfile.timeOfBirth) {
      sections.push(
        `## Birth Details\n- Date: ${userProfile.dateOfBirth || 'Not provided'}\n- Time: ${userProfile.timeOfBirth || 'Not provided'}\n- Place: ${userProfile.placeOfBirth || 'Not provided'}`
      )
    }

    return sections.join('\n\n') || 'No profile information available yet.'
  }

  /**
   * Add document to workspace explicitly
   * This is CRITICAL: Documents must be explicitly added to workspace for chunking/embedding to work
   */
  async addDocumentToWorkspace(workspaceId: string, documentName: string): Promise<boolean> {
    try {
      if (!workspaceId || workspaceId === 'null' || workspaceId === 'undefined') {
        throw new Error('Workspace ID is required')
      }

      if (!documentName || documentName.trim() === '') {
        throw new Error('Document name is required')
      }

      const workspace = await this.getWorkspace(workspaceId)
      if (!workspace) {
        throw new Error(`Workspace ${workspaceId} not found`)
      }

      const workspaceSlug = workspace.slug || workspace.workspace?.slug || workspaceId

      console.log(`[addDocumentToWorkspace] Adding document "${documentName}" to workspace "${workspaceSlug}"`)

      // CRITICAL: This endpoint explicitly adds documents to workspace
      // POST /api/v1/workspace/{slug}/update with document name in 'adds' array
      const response = await fetch(
        `${this.config.apiUrl}/api/v1/workspace/${workspaceSlug}/update`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            adds: [documentName], // Document name (not ID) - this triggers processing
            deletes: [],
          })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[addDocumentToWorkspace] Failed to add document to workspace: ${errorText}`)
        return false
      }

      const responseData = await response.json().catch(() => ({}))
      console.log(`[addDocumentToWorkspace] Document added to workspace successfully`)
      return true
    } catch (error) {
      console.error('[addDocumentToWorkspace] Error:', error)
      return false
    }
  }

  /**
   * Update embeddings for a workspace
   * This triggers vector creation in Qdrant
   */
  async updateEmbeddings(workspaceId: string): Promise<boolean> {
    try {
      const workspace = await this.getWorkspace(workspaceId)
      if (!workspace) {
        throw new Error(`Workspace ${workspaceId} not found`)
      }

      const workspaceSlug = workspace.slug || workspace.workspace?.slug || workspaceId

      console.log(`[updateEmbeddings] Updating embeddings for workspace: ${workspaceSlug}`)

      const response = await fetch(
        `${this.config.apiUrl}/api/v1/workspace/${workspaceSlug}/update-embeddings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
          }
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[updateEmbeddings] Failed to update embeddings: ${errorText}`)
        return false
      }

      const responseData = await response.json().catch(() => ({}))
      console.log(`[updateEmbeddings] Embedding update response:`, JSON.stringify(responseData).substring(0, 200))
      console.log(`[updateEmbeddings] Waiting for embeddings to be written to Qdrant...`)
      console.log(`[updateEmbeddings] Embeddings update completed`)
      return true
    } catch (error) {
      console.error('[updateEmbeddings] Error:', error)
      return false
    }
  }
}

export const anythingLLMService = new AnythingLLMService()
export type { Workspace, Document, ChatMessage, ChatResponse }
