import type { ChatClient, ChatMessage, ChatTone } from "./types";
import { OllamaChatClient } from "./providers/ollama";
import { GroqChatClient } from "./providers/groq";

export type { ChatClient, ChatMessage, ChatTone };

// GROQ_API_KEY가 있으면 Groq(배포 환경), 없으면 로컬 Ollama를 사용한다.
export function getChatClient(): ChatClient {
  if (process.env.GROQ_API_KEY) {
    return new GroqChatClient();
  }
  return new OllamaChatClient();
}
