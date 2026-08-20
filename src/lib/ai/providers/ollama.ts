import { Agent, fetch as undiciFetch } from "undici";
import type { ChatClient, ChatMessage, ChatTone } from "../types";

// 로컬 CPU 추론은 몇 분씩 걸릴 수 있어, fetch의 기본 5분 headers 타임아웃보다 넉넉하게 잡아둔다.
// Node 전역 fetch는 자체 내장 undici를 쓰기 때문에 npm undici의 Agent를 dispatcher로 못 받아들여서
// (버전 불일치로 "invalid onRequestStart method" 에러 발생), undici가 제공하는 fetch를 직접 사용한다.
// 프로덕션(Groq)은 훨씬 빨라 이 타임아웃에 걸릴 일이 없다.
const OLLAMA_DISPATCHER = new Agent({ headersTimeout: 15 * 60 * 1000 });

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

    const res = await undiciFetch(`${this.baseUrl}/api/chat`, {
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
      dispatcher: OLLAMA_DISPATCHER,
    });

    if (!res.ok) {
      throw new Error(`Ollama request failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as OllamaChatResponse;
    return data.message.content;
  }
}
