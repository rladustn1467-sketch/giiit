import type { ChatClient, ChatMessage, ChatTone } from "../types";

// 톤 3가지: 기본 / 친구처럼 편하게 / 평론가 스타일
const TONE_SYSTEM_PROMPTS: Record<ChatTone, string> = {
  normal: "당신은 사용자가 감상한 영화에 대해 담백하고 정중하게 대화하는 AI입니다.",
  friendly: "당신은 사용자의 친한 친구처럼 반말로 편하게 영화 이야기를 나누는 AI입니다.",
  critic:
    "당신은 영화 평론가처럼 통찰력 있고 비유적인 문체로 영화를 이야기하는 AI입니다. 장면 너머의 의미를 짚어주는 평론가 특유의 어투를 사용하세요.",
};

type OllamaChatResponse = {
  message: { role: string; content: string };
};

export class OllamaChatClient implements ChatClient {
  constructor(
    private baseUrl: string = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
    private model: string = process.env.OLLAMA_MODEL ?? "qwen3:8b"
  ) {}

  async sendMessage(
    messages: ChatMessage[],
    options?: { tone?: ChatTone; context?: string; temperature?: number }
  ): Promise<string> {
    const tone = options?.tone ?? "normal";
    const systemContent = options?.context
      ? `${TONE_SYSTEM_PROMPTS[tone]}\n\n${options.context}`
      : TONE_SYSTEM_PROMPTS[tone];
    const systemMessage: ChatMessage = { role: "system", content: systemContent };

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: [systemMessage, ...messages],
        stream: false,
        think: false,
        ...(options?.temperature != null
          ? { options: { temperature: options.temperature } }
          : {}),
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama request failed: ${res.status} ${await res.text()}`);
    }

    const data: OllamaChatResponse = await res.json();
    return data.message.content;
  }
}
