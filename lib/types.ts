export interface DocumentType {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
  versions?: VersionType[]
}

export interface VersionType {
  id: string
  documentId: string
  content: string
  createdAt: Date
  description?: string
}

export interface TemplateType {
  id: string
  title: string
  content: string
  createdAt: Date
  isBuiltIn?: boolean
}

export interface ChatMessageType {
  id: string
  documentId: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export interface GeminiRequestType {
  prompt: string
  context: {
    currentMarkdown: string
    selection?: string
  }
  taskType?: "GenerateOutline" | "GenerateTheme" | "GenerateMermaid" | string
  fileData?: {
    content: string
    type: string
  }
}

export interface GeminiResponseType {
  success: boolean
  result?: {
    text: string
    markdownCode: string | null
  }
  error?: {
    message: string
    code: string
    details?: string
  }
}

export interface MermaidRenderResult {
  svg: string
  bindFunctions?: (element: Element) => void
}
