import { Mic, Send } from "lucide-react";

const COPY = {
  es: {
    prompt: "Pregunta por stock, llegadas o incidencias...",
    listening: "Escuchando",
    voice: "Voz",
    assistant: "Mercedes IA",
    operator: "Operario",
    empty: "sin objetos detectados",
  },
  en: {
    prompt: "Ask about stock, arrivals or incidents...",
    listening: "Listening",
    voice: "Voice",
    assistant: "Mercedes AI",
    operator: "Operator",
    empty: "no objects detected",
  },
};

export default function PanelAsistente({
  detections,
  inputValue,
  isListening,
  lang,
  messages,
  onInputChange,
  onSubmit,
  onVoiceCapture,
}) {
  const copy = COPY[lang];

  return (
    <section className="rounded-[24px] border border-[#dee2e6] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-[#2c3440] dark:bg-[#13171d]">
      <div className="space-y-4 px-5 py-5">
        <div className="max-h-[22rem] space-y-3 overflow-y-auto pr-1">
          {messages.map((message) => (
            <article
              className={`max-w-[90%] rounded-[24px] px-4 py-3 text-sm leading-6 ${
                message.role === "assistant"
                  ? "border border-[#dee2e6] bg-[#f8f9fa] text-[#1a1a1a] dark:border-[#2c3440] dark:bg-[#191f27] dark:text-white"
                  : "ml-auto bg-black text-white dark:bg-white dark:text-black"
              }`}
              key={message.id}
            >
              <p className="mb-1 text-[10px] uppercase tracking-[0.28em] opacity-55">
                {message.role === "assistant" ? copy.assistant : copy.operator}
              </p>
              {message.content}
            </article>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <form className="flex items-center gap-3 rounded-[22px] border border-[#dee2e6] bg-[#f8f9fa] px-4 py-3 dark:border-[#2c3440] dark:bg-[#191f27]" onSubmit={onSubmit}>
            <input
              className="w-full border-none bg-transparent text-sm text-[#1a1a1a] outline-none placeholder:text-[#64748b] dark:text-white dark:placeholder:text-[#8ea0b7]"
              onChange={(event) => onInputChange(event.target.value)}
              placeholder={copy.prompt}
              type="text"
              value={inputValue}
            />
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black" type="submit">
              <Send size={15} />
            </button>
          </form>

          <button
            className={`inline-flex items-center justify-center gap-2 rounded-[22px] px-4 py-3 text-sm font-semibold transition ${
              isListening
                ? "bg-[#0df20d] text-black"
                : "border border-[#dee2e6] bg-white text-[#1a1a1a] hover:bg-[#f8f9fa] dark:border-[#2c3440] dark:bg-[#13171d] dark:text-white dark:hover:bg-[#191f27]"
            }`}
            onClick={onVoiceCapture}
            type="button"
          >
            <Mic size={16} />
            {isListening ? copy.listening : copy.voice}
          </button>
        </div>
      </div>
    </section>
  );
}
