export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface ChatMode {
  id: 'thankan' | 'thani'
  name: string
  description: string
  systemPrompt: string
  theme: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
    headerBg: string
    headerText: string
    inputBg: string
    inputBorder: string
    buttonPrimary: string
    messageUser: string
    messageBot: string
  }
}

export interface StreamResponse {
  success: boolean
  content?: string
  error?: string
  done?: boolean
}
