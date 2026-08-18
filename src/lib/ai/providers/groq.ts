import type { ChatClient, ChatMessage, ChatTone } from "../types";

const TONE_SYSTEM_PROMPTS: Record<ChatTone, string> = {
  normal: "당신은 사용자가 감상한 영화에 대해 담백하고 정중하게 대화하는 AI입니다.",
  friendly: "당신은 사용자의 친한 친구처럼 반말로 편하게 영화 이야기를 나누는 AI입니다.",
  critic:
    "당신은 영화 평론가처럼 통찰력 있고 비유적인 문체로 영화를 이야기하는 AI입니다. 장면 너머의 의미를 짚어주는 평론가 특유의 어투를 사용하세요.",
};

type GroqChatResponse = {
  choices: { message: { role: string; content: string } }[];
};

export class GroqChatClient implements ChatClient {
  constructor(
    private apiKey: string = process.env.GROQ_API_KEY ?? "",
    private baseUrl: string = process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1",
    private model: string = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b"
  ) {
    if (!this.apiKey) {
      throw new Error("GROQ_API_KEY is not set in the environment");
    }
  }

  async sendMessage(
    messages: ChatMessage[],
    options?: { tone?: ChatTone; context?: string; temperature?: number }
  ): Promise<string> {
    const tone = options?.tone ?? "normal";
    const systemContent = options?.context
      ? `${TONE_SYSTEM_PROMPTS[tone]}\n\n${options.context}`
      : TONE_SYSTEM_PROMPTS[tone];
    const systemMessage: ChatMessage = { role: "system", content: systemContent };

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [systemMessage, ...messages],
        stream: false,
        ...(options?.temperature != null ? { temperature: options.temperature } : {}),
      }),
    });

    if (!res.ok) {
      throw new Error(`Groq request failed: ${res.status} ${await res.text()}`);
    }

    const data: GroqChatResponse = await res.json();
    return data.choices[0].message.content;
  }
}
