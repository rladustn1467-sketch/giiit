export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

// 톤 3가지: 기본 / 친구처럼 편하게 / 평론가 스타일
export type ChatTone = "normal" | "friendly" | "critic";

export interface ChatClient {
  sendMessage(
    messages: ChatMessage[],
    options?: { tone?: ChatTone; context?: string; temperature?: number }
  ): Promise<string>;
}
