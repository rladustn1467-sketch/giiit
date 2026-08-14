import type { ChatClient, ChatMessage, ChatTone } from "./types";
import { OllamaChatClient } from "./providers/ollama";

export type { ChatClient, ChatMessage, ChatTone };

// Swap providers here (Ollama now, Claude/GPT later) — nothing else needs to change.
export function getChatClient(): ChatClient {
  return new OllamaChatClient();
}
