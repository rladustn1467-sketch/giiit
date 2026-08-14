"use client";

import { useEffect, useRef, useState } from "react";

type ChatTone = "normal" | "friendly" | "critic";

type Message = {
  id: number;
  role: string;
  content: string;
};

const TONE_OPTIONS: { value: ChatTone; label: string }[] = [
  { value: "normal", label: "기본" },
  { value: "friendly", label: "친구처럼 편하게" },
  { value: "critic", label: "평론가 스타일" },
];

export default function MovieChat({ movieId }: { movieId: number }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [tone, setTone] = useState<ChatTone>("normal");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initStartedRef = useRef(false);

  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/movies/${movieId}/conversations`);
        const data = await res.json();
        const existing: Message[] = data.conversations ?? [];

        if (existing.length === 0) {
          const startRes = await fetch(`/api/movies/${movieId}/conversations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tone }),
          });
          if (!startRes.ok) throw new Error("대화를 시작하지 못했어요.");
          const startData = await startRes.json();
          setMessages([startData.assistantMessage]);
        } else {
          setMessages(existing);
        }
      } catch {
        setError("대화를 불러오지 못했어요.");
      } finally {
        setLoading(false);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend() {
    const content = input.trim();
    if (!content || sending) return;

    setInput("");
    setSending(true);
    setError(null);

    const optimisticUserMessage: Message = { id: Date.now(), role: "user", content };
    setMessages((prev) => [...prev, optimisticUserMessage]);

    try {
      const res = await fetch(`/api/movies/${movieId}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, tone }),
      });
      if (!res.ok) throw new Error("응답을 받지 못했어요.");
      const data = await res.json();
      setMessages((prev) => [...prev, data.assistantMessage]);
    } catch {
      setError("메시지를 보내지 못했어요. 다시 시도해 주세요.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-1.5 self-end text-sm text-neutral-500">
        대화 스타일
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value as ChatTone)}
          className="bg-neutral-900 border border-neutral-700 rounded-md text-sm px-2 py-1 text-neutral-100"
        >
          {TONE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-2 min-h-[120px]">
        {loading && (
          <p className="text-sm text-neutral-500">AI가 대화를 준비하고 있어요...</p>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
              message.role === "assistant"
                ? "self-start bg-neutral-800 text-neutral-100"
                : "self-end bg-neutral-100 text-neutral-900"
            }`}
          >
            {message.content}
          </div>
        ))}

        {sending && (
          <p className="self-start text-sm text-neutral-500">AI가 답변을 준비 중이에요...</p>
        )}

        <div ref={bottomRef} />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          disabled={loading || sending}
          placeholder="메시지를 입력하세요"
          className="flex-1 bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={loading || sending || !input.trim()}
          className="bg-neutral-100 text-neutral-900 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          보내기
        </button>
      </div>
    </div>
  );
}
