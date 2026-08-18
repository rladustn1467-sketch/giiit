"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Components } from "react-markdown";

// AI 응답에 섞여 나오는 <u>, <br> 같은 원시 HTML 태그도 렌더링하되,
// rehype-raw가 통과시키는 태그는 rehype-sanitize로 안전한 서식용 태그만 허용한다.
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "u"],
};

type ChatTone = "normal" | "friendly" | "critic";

type Message = {
  id: number;
  role: string;
  content: string;
};

const MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-neutral-50">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  u: ({ children }) => <u className="underline">{children}</u>,
  h1: ({ children }) => <h1 className="text-base font-semibold mt-3 mb-1.5 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-1.5 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold mt-2.5 mb-1 first:mt-0">{children}</h3>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="underline text-neutral-300 hover:text-neutral-100">
      {children}
    </a>
  ),
  hr: () => <hr className="border-neutral-700 my-3" />,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-neutral-600 pl-2.5 text-neutral-400 my-2">{children}</blockquote>
  ),
  code: ({ children }) => (
    <code className="bg-neutral-900 rounded px-1 py-0.5 text-xs">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="bg-neutral-900 rounded-md p-2.5 overflow-x-auto text-xs mb-2">{children}</pre>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-2">
      <table className="border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-neutral-700 px-2 py-1 text-left bg-neutral-900 font-medium">{children}</th>
  ),
  td: ({ children }) => <td className="border border-neutral-700 px-2 py-1 align-top">{children}</td>,
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
  const summarizedRef = useRef(false);

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

  // 채팅 화면을 벗어날 때(언마운트) 한 번만 자동 요약을 요청한다.
  // 대화/감상평 유무에 따른 요약 가능 여부 판단은 서버가 처리한다.
  useEffect(() => {
    return () => {
      if (summarizedRef.current) return;
      summarizedRef.current = true;
      fetch(`/api/movies/${movieId}/auto-summary`, { method: "POST" }).catch(() => {});
    };
  }, [movieId]);

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

        {messages.map((message) =>
          message.role === "assistant" ? (
            <div
              key={message.id}
              className="max-w-[85%] self-start rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-100"
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
                components={MARKDOWN_COMPONENTS}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          ) : (
            <div
              key={message.id}
              className="max-w-[85%] self-end rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-900 whitespace-pre-wrap"
            >
              {message.content}
            </div>
          )
        )}

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
