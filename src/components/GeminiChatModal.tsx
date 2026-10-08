import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Zap, Brain, Flame, Plus, Check, Info } from 'lucide-react';
import { ChatMessage, MenuItem } from '../types/burger';
import { MENU_ITEMS } from '../data/menuData';
import { SaoCristovaoLogo } from './SaoCristovaoLogo';
import { Dialog, DialogCloseButton } from './ui/Dialog';
import { SafeImage } from './ui/SafeImage';
import { api, ApiRequestError, isBackendUnavailable } from '../lib/api';
import { buildChatFallback } from '../../shared/aiFallback';
import { createId, formatBRL, formatClock } from '../lib/format';
import { CHAT_LIMITS, ChatModel, ChatRoleMode } from '../../shared/api';

interface GeminiChatModalProps {
  onClose: () => void;
  onQuickAddItem: (item: MenuItem) => void;
  initialQuery?: string | null;
}

const MODEL_BY_ROLE: Record<ChatRoleMode, ChatModel> = {
  fast: 'gemini-3.1-flash-lite',
  sommelier: 'gemini-3.5-flash',
  expert: 'gemini-3.1-pro-preview',
};

const ROLE_OPTIONS: ReadonlyArray<{ mode: ChatRoleMode; label: string; title: string; Icon: typeof Zap }> = [
  { mode: 'fast', label: '⚡ Rápido (flash-lite)', title: 'Usa gemini-3.1-flash-lite para respostas super rápidas', Icon: Zap },
  { mode: 'sommelier', label: '🍔 Sommelier (flash)', title: 'Usa gemini-3.5-flash para recomendações e atendimento geral', Icon: Sparkles },
  { mode: 'expert', label: '🧠 Mestre (pro-preview)', title: 'Usa gemini-3.1-pro-preview para análise gastronômica avançada', Icon: Brain },
];

const PROMPT_PRESETS = [
  'Qual o combo mais vantajoso para 2 pessoas?',
  'Quais burgers têm a costela bovina desfiada?',
  'Explique a técnica da crosta smash a 200°C',
  'Qual burger combina com o Guaraná Antarctica?',
];

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome-1',
  role: 'assistant',
  content:
    'Olá! Bem-vindo ao São Cristóvão Burger em Palhoça - SC! Sou seu assistente gastronômico. Quer uma recomendação de smash burger, saber os combos para casal ou tirar dúvidas sobre nossos ingredientes?',
  timestamp: 'Agora',
};

const ADDED_FEEDBACK_MS = 2000;
const ERROR_ID_PREFIX = 'err-';

/** Renderiza **negrito** do Markdown sem usar innerHTML (sem risco de XSS). */
function renderRichText(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((chunk, i) =>
    chunk.startsWith('**') && chunk.endsWith('**') && chunk.length > 4 ? (
      <strong key={i} className="font-bold text-white">
        {chunk.slice(2, -2)}
      </strong>
    ) : (
      <React.Fragment key={i}>{chunk}</React.Fragment>
    )
  );
}

function findSuggestedItem(reply: string): MenuItem | undefined {
  const lower = reply.toLowerCase();
  return MENU_ITEMS.find((item) => lower.includes(item.name.toLowerCase()));
}

const GeminiChatModal: React.FC<GeminiChatModalProps> = ({ onClose, onQuickAddItem, initialQuery }) => {
  const [roleMode, setRoleMode] = useState<ChatRoleMode>('sommelier');
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [addedItemId, setAddedItemId] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<boolean>(false);

  const messagesRef = useRef<ChatMessage[]>(messages);
  const isLoadingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialQuerySentRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  // Cancela requisição pendente ao fechar o modal.
  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (!addedItemId) return;
    const timeoutId = window.setTimeout(() => setAddedItemId(null), ADDED_FEEDBACK_MS);
    return () => window.clearTimeout(timeoutId);
  }, [addedItemId]);

  const modelName = MODEL_BY_ROLE[roleMode];

  const handleSendMessage = useCallback(
    async (textToSend?: string) => {
      const text = (textToSend ?? inputMessage).trim().slice(0, CHAT_LIMITS.maxMessageLength);
      if (!text || isLoadingRef.current) return;

      const userMessage: ChatMessage = {
        id: createId('user'),
        role: 'user',
        content: text,
        timestamp: formatClock(),
      };
      const history = [...messagesRef.current, userMessage];
      setMessages(history);
      setInputMessage('');
      setIsLoading(true);
      isLoadingRef.current = true;

      const controller = new AbortController();
      abortRef.current = controller;

      const payloadMessages = history
        .filter((m) => !m.id.startsWith(ERROR_ID_PREFIX))
        .slice(-CHAT_LIMITS.maxMessages)
        .map((m) => ({ role: m.role, content: m.content.slice(0, CHAT_LIMITS.maxMessageLength) }));

      const appendReply = (reply: string) => {
        const suggestedItem = findSuggestedItem(reply);
        setMessages((prev) => [
          ...prev,
          {
            id: createId('bot'),
            role: 'assistant',
            content: reply,
            timestamp: formatClock(),
            suggestedItemId: suggestedItem?.id,
          },
        ]);
      };

      try {
        const { data, meta } = await api.chat(
          {
            messages: payloadMessages,
            role: roleMode,
            modelPreference: MODEL_BY_ROLE[roleMode],
          },
          controller.signal
        );

        setFallbackNotice(Boolean(meta?.fallback));
        appendReply(data.reply);
      } catch (err) {
        if (err instanceof ApiRequestError && err.code === 'ABORTED') return;
        if (isBackendUnavailable(err)) {
          // Sem servidor (ex.: versão estática): mesmas respostas de contingência do backend.
          setFallbackNotice(true);
          appendReply(buildChatFallback(payloadMessages, roleMode));
          return;
        }
        const message =
          err instanceof ApiRequestError ? err.message : 'Tente novamente em instantes.';
        setMessages((prev) => [
          ...prev,
          {
            id: createId(ERROR_ID_PREFIX.slice(0, -1)),
            role: 'assistant',
            content: `Tivemos uma instabilidade temporária: ${message}`,
            timestamp: formatClock(),
          },
        ]);
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [inputMessage, roleMode]
  );

  // Pergunta inicial (ex.: "Perguntar à IA" num card) — enviada uma única vez.
  useEffect(() => {
    if (initialQuerySentRef.current || !initialQuery?.trim()) return;
    initialQuerySentRef.current = true;
    void handleSendMessage(initialQuery);
  }, [initialQuery, handleSendMessage]);

  const titleId = 'chat-title';
  const descriptionId = 'chat-description';

  return (
    <Dialog
      onClose={onClose}
      labelledBy={titleId}
      describedBy={descriptionId}
      initialFocusRef={inputRef}
      panelClassName="w-full max-w-2xl my-auto h-[calc(100dvh-1.5rem)] sm:h-[82vh] bg-[#121216] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
    >
      {/* Cabeçalho */}
      <div className="p-4 sm:p-5 border-b border-white/10 bg-black/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <SaoCristovaoLogo size={42} className="hidden sm:block" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 id={titleId} className="font-extrabold text-white text-base font-display">
                Cristóvão Atendente & Sommelier
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/10 text-amber-300">
                {modelName}
              </span>
            </div>
            <p id={descriptionId} className="text-[11px] text-zinc-400">
              Especialista no cardápio de Palhoça - SC • Multi-turn Gemini
            </p>
          </div>
        </div>
        <DialogCloseButton onClose={onClose} label="Fechar assistente" />
      </div>

      {/* Seleção do papel/modelo */}
      <div
        role="group"
        aria-label="Papel da IA"
        className="px-4 py-2 bg-zinc-900/50 border-b border-white/5 flex items-center gap-2 overflow-x-auto text-xs"
      >
        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider shrink-0" aria-hidden="true">
          Papel da IA:
        </span>
        {ROLE_OPTIONS.map(({ mode, label, title, Icon }) => (
          <button
            key={mode}
            type="button"
            aria-pressed={roleMode === mode}
            onClick={() => setRoleMode(mode)}
            title={title}
            className={`min-h-9 px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
              roleMode === mode ? 'bg-amber-400 text-black font-bold shadow-md' : 'bg-white/5 text-zinc-300 hover:text-white'
            }`}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {fallbackNotice && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-[11px] text-amber-200 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Assistente em modo de contingência: respostas rápidas do cardápio enquanto a IA se recupera.</span>
        </div>
      )}

      {/* Conversa */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Conversa com o assistente"
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const suggestedItem = msg.suggestedItemId ? MENU_ITEMS.find((i) => i.id === msg.suggestedItemId) : undefined;

          return (
            <div key={msg.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && <SaoCristovaoLogo size={32} className="shrink-0" />}

              <div className="max-w-[85%] sm:max-w-[75%] space-y-2">
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-amber-400 text-black font-medium rounded-tr-none'
                      : 'bg-white/5 text-zinc-200 border border-white/10 rounded-tl-none'
                  }`}
                >
                  <span className="sr-only">{isUser ? 'Você disse: ' : 'Assistente: '}</span>
                  <div className="whitespace-pre-wrap break-words">
                    {isUser ? msg.content : renderRichText(msg.content)}
                  </div>
                  <div className={`text-[10px] mt-1 text-right ${isUser ? 'text-black/60' : 'text-zinc-400'}`}>
                    {msg.timestamp}
                  </div>
                </div>

                {!isUser && suggestedItem && (
                  <div className="p-3 rounded-xl bg-black/60 border border-amber-400/30 flex items-center justify-between gap-3 shadow-lg">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <SafeImage
                        src={suggestedItem.image}
                        alt=""
                        width={40}
                        height={40}
                        responsiveWidths={[96]}
                        sizes="40px"
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white line-clamp-1">{suggestedItem.name}</div>
                        <div className="text-xs font-mono font-bold text-amber-400">{formatBRL(suggestedItem.price)}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onQuickAddItem(suggestedItem);
                        setAddedItemId(suggestedItem.id);
                      }}
                      aria-label={`Pedir ${suggestedItem.name}`}
                      className="min-h-9 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {addedItemId === suggestedItem.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Adicionado!</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Pedir</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 justify-start" role="status">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 text-black animate-pulse" aria-hidden="true" />
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 rounded-tl-none flex items-center gap-2">
              <span aria-hidden="true" className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
              <span aria-hidden="true" className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:150ms]" />
              <span aria-hidden="true" className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:300ms]" />
              <span className="text-xs text-zinc-400 font-mono pl-1">Preparando resposta com {modelName}...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sugestões */}
      <div className="px-4 py-2 border-t border-white/5 bg-black/40 flex items-center gap-2 overflow-x-auto text-[11px]">
        <span className="text-zinc-400 shrink-0">Sugestões:</span>
        {PROMPT_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={isLoading}
            onClick={() => handleSendMessage(preset)}
            className="min-h-8 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 whitespace-nowrap cursor-pointer transition-colors disabled:opacity-50"
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Entrada */}
      <div className="p-3 sm:p-4 bg-black/80 border-t border-white/10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <label htmlFor="chat-input" className="sr-only">
            Mensagem para o assistente
          </label>
          <input
            ref={inputRef}
            id="chat-input"
            type="text"
            value={inputMessage}
            maxLength={CHAT_LIMITS.maxMessageLength}
            autoComplete="off"
            enterKeyHint="send"
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Digite sua dúvida, pedido ou ingrediente..."
            className="flex-1 min-w-0 px-4 py-3 bg-zinc-900 border border-white/10 rounded-2xl text-base sm:text-sm text-white placeholder-zinc-400 focus:outline-none focus:border-amber-400 transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            aria-label="Enviar mensagem"
            className="w-12 h-12 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold flex items-center justify-center transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </Dialog>
  );
};

export default GeminiChatModal;
