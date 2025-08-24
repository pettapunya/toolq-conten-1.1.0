import React, { useMemo, useRef, useState, useEffect, DragEvent, FC } from "react";
import OpenAI from "openai";
import { marked } from "marked";
import { useTranslations } from "../contexts/LanguageContext.tsx";

// --- TYPES ---
type Role = "user" | "assistant" | "system";

type VisionPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type ChatMsg =
  | { role: "user"; content: VisionPart[]; ts?: number }
  | { role: "assistant"; content: string; ts?: number }
  | { role: "system"; content: string; ts?: number };

type TabType = "chat" | "enhance" | "coder" | "writer" | "translator" | "json";

// --- STYLES ---
const Glass =
  "bg-surface/60 backdrop-blur-xl border border-white/10";
const Soft =
  "rounded-3xl shadow-[0_10px_40px_-12px_rgba(0,0,0,.5)]";
const GBtn =
  "rounded-2xl px-4 py-2 font-semibold bg-gradient-to-r from-primary via-accent to-secondary hover:opacity-90 transition";

// --- SUB-COMPONENTS ---
const TabButton: FC<{
  id: TabType;
  label: string;
  currentTab: TabType;
  setTab: (tab: TabType) => void;
}> = ({ id, label, currentTab, setTab }) => (
  <button
    onClick={() => setTab(id)}
    className={`px-4 py-2 rounded-2xl text-sm transition ${
      currentTab === id ? "bg-white/10 border border-white/15" : "hover:bg-white/5"
    }`}
  >
    {label}
  </button>
);

interface ChatUIProps {
  messages: ChatMsg[];
  endRef: React.RefObject<HTMLDivElement>;
  t: (key: string) => string;
  tab: TabType;
  setTab: (tab: TabType) => void;
  model: string;
  setModel: (model: string) => void;
  format: "text" | "json";
  setFormat: (format: "text" | "json") => void;
  temperature: number;
  setTemperature: (temp: number) => void;
  language: string;
  input: string;
  setInput: (input: string) => void;
  uploads: string[];
  handleFileDrop: (files: FileList | null) => void;
  send: () => void;
  canSend: boolean;
  busy: boolean;
}

const ChatUI: FC<ChatUIProps> = React.memo(
  ({
    messages,
    endRef,
    t,
    tab,
    setTab,
    model,
    setModel,
    format,
    setFormat,
    temperature,
    setTemperature,
    language,
    input,
    setInput,
    uploads,
    handleFileDrop,
    send,
    canSend,
    busy,
  }) => {
    const uploaderRef = useRef<HTMLInputElement | null>(null);

    const handleDragEvents = (
      e: DragEvent<HTMLTextAreaElement | HTMLLabelElement>
    ) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const suggestions = [
      { k: t("chatgpt.suggestions.vision"), v: t("chatgpt.suggestions.visionText") },
      { k: t("chatgpt.suggestions.enhance"), v: t("chatgpt.suggestions.enhanceText") },
      { k: t("chatgpt.suggestions.coding"), v: t("chatgpt.suggestions.codingText") },
    ];

    return (
      <div className="w-full h-full grid grid-rows-[auto,1fr] gap-4 text-neutral-100">
        {/* Header */}
        <header className={`${Glass} ${Soft} p-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold">
              AI
            </div>
            <div>
              <div className="font-semibold">{t("chatgpt.headerTitle")}</div>
              <div className="text-xs text-text-secondary">{t("chatgpt.headerSubtitle")}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <TabButton id="chat" label={t("chatgpt.tabs.chat")} currentTab={tab} setTab={setTab} />
            <TabButton id="enhance" label={t("chatgpt.tabs.enhance")} currentTab={tab} setTab={setTab} />
            <TabButton id="coder" label={t("chatgpt.tabs.coder")} currentTab={tab} setTab={setTab} />
            <TabButton id="writer" label={t("chatgpt.tabs.writer")} currentTab={tab} setTab={setTab} />
            <TabButton id="translator" label={t("chatgpt.tabs.translator")} currentTab={tab} setTab={setTab} />
            <TabButton id="json" label={t("chatgpt.tabs.json")} currentTab={tab} setTab={setTab} />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="bg-white/5 rounded-xl px-3 py-2 text-sm border border-white/10"
            >
              <option value="gpt-5.0">{t("chatgpt.models.gpt-5.0")}</option>
              <option value="gpt-5.0-mini">{t("chatgpt.models.gpt-5.0-mini")}</option>
              <option value="gpt-4.1">{t("chatgpt.models.gpt-4.1")}</option>
              <option value="gpt-4.1-mini">{t("chatgpt.models.gpt-4.1-mini")}</option>
              <option value="gpt-4o">{t("chatgpt.models.gpt-4o")}</option>
              <option value="gpt-4o-mini">{t("chatgpt.models.gpt-4o-mini")}</option>
              <option value="o1">{t("chatgpt.models.o1")}</option>
              <option value="o1-mini">{t("chatgpt.models.o1-mini")}</option>
            </select>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as "text" | "json")}
              className="bg-white/5 rounded-xl px-3 py-2 text-sm border border-white/10"
            >
              <option value="text">{t("chatgpt.formats.text")}</option>
              <option value="json">{t("chatgpt.formats.json")}</option>
            </select>
          </div>
        </header>

        {/* Body */}
        <div className="grid grid-cols-12 gap-4 min-h-0">
          <aside className={`col-span-3 ${Glass} ${Soft} p-4 space-y-3 hidden xl:block`}>
            <div className="text-sm text-text-secondary">{t("chatgpt.suggestions.title")}</div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s.v)}
                  className="px-3 py-1.5 rounded-2xl bg-white/5 hover:bg-white/10 text-xs border border-white/10"
                >
                  {s.k}
                </button>
              ))}
            </div>
            <div className="pt-4 text-xs text-text-secondary border-t border-white/10">
              {t("chatgpt.tips.dragDrop")}
            </div>
          </aside>

          <main className={`col-span-12 xl:col-span-6 ${Glass} ${Soft} p-0 flex flex-col overflow-hidden`}>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m, idx) => {
                const isUser = m.role === "user";
                const contentParts = Array.isArray(m.content) ? (m.content as VisionPart[]) : null;
                const rawText = !contentParts ? (m.content as string) : "";

                return (
                  <div key={idx} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                    {!isUser && (
                      <div className="w-9 h-9 rounded-2xl bg-surface/80 border border-border flex items-center justify-center text-sm flex-shrink-0">
                        {t("chatgpt.chat.aiInitial")}
                      </div>
                    )}
                    <div
                      className={`${
                        isUser ? "bg-gradient-to-br from-primary/60 to-accent/60" : "bg-surface/50"
                      } border border-border rounded-2xl p-3 max-w-[80%]`}
                    >
                      {contentParts ? (
                        <div className="space-y-2">
                          {contentParts.map((p, i) =>
                            p.type === "text" ? (
                              <p key={i} className="whitespace-pre-wrap text-sm leading-relaxed">
                                {p.text}
                              </p>
                            ) : (
                              <img key={i} src={p.image_url.url} className="rounded-xl max-h-56" />
                            )
                          )}
                        </div>
                      ) : (
                        <div
                          className="prose prose-invert prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: marked.parse(rawText || "") }}
                        />
                      )}
                    </div>
                    {isUser && (
                      <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm flex-shrink-0">
                        {t("chatgpt.chat.userInitial")}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <div className="sticky bottom-0 p-4 border-t border-white/10 bg-background/70 backdrop-blur-xl">
              {uploads.length > 0 && (
                <div className="flex gap-2 mb-2 overflow-x-auto">
                  {uploads.map((u, i) => (
                    <img key={i} src={u} className="h-16 w-16 object-cover rounded-xl border border-white/10" />
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <label className="flex-1 relative">
                  <textarea
                    placeholder={t("chatgpt.chat.placeholder")}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleFileDrop(e.dataTransfer.files);
                    }}
                    onDragOver={handleDragEvents}
                    onDragLeave={handleDragEvents}
                    className="w-full resize-none min-h-[54px] max-h-[160px] bg-white/5 border border-white/10 rounded-2xl p-3 pr-14 outline-none"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileDrop(e.target.files)}
                    className="hidden"
                    ref={uploaderRef}
                  />
                  <button
                    onClick={() => uploaderRef.current?.click()}
                    className="absolute right-3 bottom-3 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-xl cursor-pointer"
                  >
                    {t("chatgpt.chat.uploadLabel")}
                  </button>
                </label>
                <button disabled={!canSend || busy} onClick={send} className={`${GBtn} disabled:opacity-50`}>
                  {busy ? t("chatgpt.chat.sending") : t("chatgpt.chat.send")}
                </button>
              </div>
            </div>
          </main>

          <aside className={`col-span-3 ${Glass} ${Soft} p-4 space-y-4 hidden lg:block`}>
            <div className="text-sm text-text-secondary">{t("chatgpt.quickSettings.title")}</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs mb-1">{t("chatgpt.quickSettings.language")}</div>
                <select disabled className="w-full bg-white/5 rounded-xl p-2 border border-white/10 text-sm">
                  <option>{language === "id" ? "Indonesia" : "English"}</option>
                </select>
              </div>
              <div>
                <div className="text-xs mb-1">{t("chatgpt.quickSettings.temperature")}</div>
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  max={1}
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full bg-white/5 rounded-xl p-2 border border-white/10"
                />
              </div>
            </div>
            <div className="text-xs text-text-secondary border-t border-white/10 pt-3">
              {t("chatgpt.quickSettings.notes")}
            </div>
          </aside>
        </div>
      </div>
    );
  }
);

// --- MAIN COMPONENT ---
export default function ChatGPT() {
  const { t, language } = useTranslations();

  const [openAiApiKey, setOpenAiApiKey] = useState<string | null>(() => localStorage.getItem("openai_api_key"));
  const [tempApiKey, setTempApiKey] = useState("");

  const [tab, setTab] = useState<TabType>("chat");
  const [model, setModel] = useState("gpt-4o");
  const [format, setFormat] = useState<"text" | "json">("text");
  const [temperature, setTemperature] = useState(0.7);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [uploads, setUploads] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const endRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => Boolean(input.trim() || uploads.length), [input, uploads]);

  const scrollToEnd = () => {
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
  };
  useEffect(scrollToEnd, [messages]);
  
  const handleFileDrop = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const reads = Array.from(files).map(
      (f) =>
        new Promise<string>((r) => {
          const fr = new FileReader();
          fr.onload = () => r(String(fr.result));
          fr.readAsDataURL(f);
        })
    );
    const urls = await Promise.all(reads);
    setUploads((prev) => [...prev, ...urls]);
  };

  const buildUserMsg = (): ChatMsg => {
    const parts: VisionPart[] = [];
    if (input.trim()) parts.push({ type: "text", text: input.trim() });
    uploads.forEach((u) => parts.push({ type: "image_url", image_url: { url: u } }));
    return { role: "user", content: parts, ts: Date.now() };
  };

  const send = async () => {
    if (!canSend || busy || !openAiApiKey) return;

    setBusy(true);

    const userMsg = buildUserMsg();
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setUploads([]);

    const openai = new OpenAI({ apiKey: openAiApiKey, dangerouslyAllowBrowser: true });

    const locale = language === "id" ? "Indonesian" : "English";
    const systemMap: Record<TabType, string> = {
      chat: `You are a helpful assistant. Default output language: ${locale}. Keep answers concise unless asked to elaborate.`,
      enhance: `You are an expert prompt engineer. Improve user's prompt. Return ONLY the improved prompt in ${locale}.`,
      coder: `You are a senior software engineer. Provide production-ready code snippets and minimal explanations in ${locale}.`,
      writer: `You are a professional writer/editor. Write clearly, structured, persuasive in ${locale}.`,
      translator: `Translate to natural ${locale} while preserving meaning and formatting.`,
      json: `Always respond with a VALID JSON object only. No extra commentary. Language: ${locale}.`,
    };
    const systemInstruction = systemMap[tab] || systemMap.chat;

    const apiMessages: Array<{ role: "user" | "assistant" | "system"; content: any }> = [
      { role: "system", content: systemInstruction },
      ...nextMessages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role,
          content: m.content,
        })),
    ];

    try {
      const stream = await openai.chat.completions.create({
        model,
        messages: apiMessages as any,
        temperature,
        response_format: format === "json" ? { type: "json_object" } : undefined,
        stream: true,
      });

      setMessages((prev) => [...prev, { role: "assistant", content: "", ts: Date.now() }]);

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content ?? "";
        if (!delta) continue;

        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (!last || last.role !== "assistant") return prev;
          const updated: ChatMsg = { ...last, content: (last.content as string) + delta };
          return [...prev.slice(0, -1), updated];
        });
      }

      if (format === "json") {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            let out = (last.content as string).trim();
            const start = out.indexOf("{");
            const end = out.lastIndexOf("}");
            if (start !== -1 && end !== -1 && end > start) {
              out = out.slice(start, end + 1);
            }
            return [...prev.slice(0, -1), { ...last, content: out }];
          }
          return prev;
        });
      }
    } catch (e: any) {
      let errorMessage = t("chatgpt.errors.general");
      if (e?.status === 401) errorMessage = t("chatgpt.errors.invalidKey");
      else if (e?.status === 429) errorMessage = t("chatgpt.errors.quotaExceeded");
      else if (typeof e?.message === "string") errorMessage = e.message;

      setMessages((prev) => [
        ...messages, // Keep user message on error
        { role: "assistant", content: `?? Error: ${errorMessage}`, ts: Date.now() },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const saveApiKey = () => {
    if (tempApiKey.trim()) {
      localStorage.setItem("openai_api_key", tempApiKey.trim());
      setOpenAiApiKey(tempApiKey.trim());
    }
  };

  const clearApiKey = () => {
      localStorage.removeItem("openai_api_key");
      setOpenAiApiKey(null);
      setTempApiKey("");
  }
  
  if (!openAiApiKey) {
      return (
          <div className="w-full h-full flex items-center justify-center p-4">
              <div className={`${Glass} ${Soft} p-8 max-w-md w-full text-center space-y-4`}>
                  <h2 className="text-2xl font-bold">{t('chatgpt.apiKey.title')}</h2>
                  <p className="text-text-secondary text-sm">{t('chatgpt.apiKey.description')}</p>
                  <div>
                      <label htmlFor="openai-key" className="sr-only">{t('chatgpt.apiKey.label')}</label>
                      <input
                          id="openai-key"
                          type="password"
                          value={tempApiKey}
                          onChange={(e) => setTempApiKey(e.target.value)}
                          onKeyDown={(e) => { if(e.key === 'Enter') saveApiKey() }}
                          placeholder={t('chatgpt.apiKey.placeholder')}
                          className="w-full bg-background/50 border border-border rounded-xl py-2 px-4 text-text-main placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                  </div>
                  <div className="flex gap-4">
                      <button onClick={saveApiKey} className={`${GBtn} w-full`}>{t('chatgpt.apiKey.saveButton')}</button>
                      <button onClick={clearApiKey} className="w-full bg-surface/50 hover:bg-surface/80 border border-border text-text-secondary font-bold py-2.5 px-4 rounded-xl transition-colors">{t('chatgpt.apiKey.clearButton')}</button>
                  </div>
              </div>
          </div>
      );
  }

  return (
      <ChatUI
        messages={messages}
        endRef={endRef}
        t={t}
        tab={tab}
        setTab={setTab}
        model={model}
        setModel={setModel}
        format={format}
        setFormat={setFormat}
        temperature={temperature}
        setTemperature={setTemperature}
        language={language}
        input={input}
        setInput={setInput}
        uploads={uploads}
        handleFileDrop={handleFileDrop}
        send={send}
        canSend={canSend}
        busy={busy}
      />
  );
}