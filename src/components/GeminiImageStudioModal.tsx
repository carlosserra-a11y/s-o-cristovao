import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Download, Maximize2, RefreshCw, Image as ImageIcon, Info } from 'lucide-react';
import { GeneratedImageRecord } from '../types/burger';
import { Dialog, DialogCloseButton } from './ui/Dialog';
import { SafeImage } from './ui/SafeImage';
import { api, ApiRequestError, isBackendUnavailable } from '../lib/api';
import { buildImageFallback } from '../../shared/aiFallback';
import { createId, formatClock } from '../lib/format';
import {
  ASPECT_RATIOS,
  AspectRatio,
  IMAGE_LIMITS,
  IMAGE_SIZES,
  IMAGE_STYLES,
  ImageSize,
  ImageStyle,
} from '../../shared/api';

interface GeminiImageStudioModalProps {
  onClose: () => void;
}

const SIZE_INFO: Record<ImageSize, { px: string; caption: string }> = {
  '1K': { px: '1024px', caption: '1024 × 1024 (Rápido)' },
  '2K': { px: '2048px', caption: '2048 × 2048 (Alta Definição)' },
  '4K': { px: '4096px', caption: '4096 × 4096 (Ultra Detalhe)' },
};

const ASPECT_LABELS: Record<AspectRatio, string> = {
  '1:1': '1:1 (Quadrado)',
  '16:9': '16:9 (Widescreen)',
  '4:3': '4:3 (Padrão)',
  '9:16': '9:16 (Stories)',
};

const STYLE_LABELS: Record<ImageStyle, string> = {
  'Dark Gourmet Gastronômico': 'Dark Gourmet',
  'Estúdio Publicitário Quente': 'Estúdio Quente',
  'Close-up Macro na Crosta': 'Macro Maillard',
  'Chapa Quente Rústica com Brasa': 'Chapa & Brasa',
};

const PRESET_PROMPTS = [
  'Smash burger triplo com queijo gouda empanado crocante e cebola caramelizada artesanal',
  'Burger Angus com costela bovina desfiada suculenta e fumaça leve de defumação',
  'Combo perfeito com batatas rústicas douradas, bacon crispy e potinho de maionese verde da casa',
  'Burger doce no pão brioche com generosa camada de Nutella cremosa e Kinder Bueno',
];

const SAMPLE_IMAGE: GeneratedImageRecord = {
  id: 'sample-1',
  imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=85',
  prompt: 'Smash burger artesanal com crosta perfeita e cheddar derretido',
  imageSize: '1K',
  aspectRatio: '1:1',
  createdAt: 'Exemplo',
};

const GeminiImageStudioModal: React.FC<GeminiImageStudioModalProps> = ({ onClose }) => {
  const [prompt, setPrompt] = useState<string>(
    'Smash burger artesanal duplo com crosta crocante de Maillard, queijo cheddar derretido escorrendo, bacon defumado e pão brioche dourado na manteiga'
  );
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [style, setStyle] = useState<ImageStyle>('Dark Gourmet Gastronômico');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState<boolean>(false);
  const [currentImage, setCurrentImage] = useState<GeneratedImageRecord>(SAMPLE_IMAGE);
  const [gallery, setGallery] = useState<GeneratedImageRecord[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const handleGenerate = async () => {
    const text = prompt.trim();
    if (!text || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data, meta } = await api.generateImage({ prompt: text, imageSize, aspectRatio, style }, controller.signal);
      const record: GeneratedImageRecord = {
        id: createId('img'),
        imageUrl: data.imageUrl,
        prompt: data.prompt,
        imageSize: data.imageSize,
        aspectRatio: data.aspectRatio,
        createdAt: formatClock(),
      };
      setIsFallback(Boolean(meta?.fallback));
      setCurrentImage(record);
      setGallery((prev) => [record, ...prev].slice(0, 12));
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'ABORTED') return;
      if (isBackendUnavailable(err)) {
        // Sem servidor (ex.: versão estática): foto de referência do acervo.
        const fallback = buildImageFallback(text, imageSize);
        const record: GeneratedImageRecord = {
          id: createId('img'),
          imageUrl: fallback.imageUrl,
          prompt: text,
          imageSize,
          aspectRatio,
          createdAt: formatClock(),
        };
        setIsFallback(true);
        setCurrentImage(record);
        setGallery((prev) => [record, ...prev].slice(0, 12));
        return;
      }
      setError(err instanceof ApiRequestError ? err.message : 'Erro ao processar a imagem com Gemini.');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsGenerating(false);
    }
  };

  const titleId = 'studio-title';
  const descriptionId = 'studio-description';

  return (
    <Dialog
      onClose={onClose}
      labelledBy={titleId}
      describedBy={descriptionId}
      panelClassName="w-full max-w-4xl my-auto bg-[#121216] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[92vh]"
    >
      <div className="p-4 sm:p-5 border-b border-white/10 bg-black/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden sm:flex w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 via-orange-500 to-red-500 items-center justify-center shadow-lg shrink-0">
            <Sparkles className="w-5 h-5 text-black" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 id={titleId} className="font-extrabold text-white text-base font-display">
                Burger Visual Studio IA
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                gemini-3-pro-image-preview
              </span>
            </div>
            <p id={descriptionId} className="text-[11px] text-zinc-400">
              Gere fotos gastronômicas de alta fidelidade com controle de resolução (1K, 2K, 4K)
            </p>
          </div>
        </div>
        <DialogCloseButton onClose={onClose} label="Fechar estúdio de imagens" />
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto overscroll-contain">
        {/* Controles */}
        <form
          className="lg:col-span-6 p-4 sm:p-6 space-y-5 border-b lg:border-b-0 lg:border-r border-white/10"
          onSubmit={(e) => {
            e.preventDefault();
            void handleGenerate();
          }}
        >
          <div className="space-y-2">
            <label htmlFor="studio-prompt" className="text-xs font-bold text-zinc-300 flex items-center justify-between">
              <span>Descrição do Hambúrguer Gourmet</span>
              <span className="text-[10px] text-zinc-400 font-normal">
                {prompt.length}/{IMAGE_LIMITS.maxPromptLength}
              </span>
            </label>
            <textarea
              id="studio-prompt"
              value={prompt}
              maxLength={IMAGE_LIMITS.maxPromptLength}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Descreva o hambúrguer, ingredientes, ponto da carne ou iluminação..."
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-base sm:text-sm text-white placeholder-zinc-400 focus:outline-none focus:border-amber-400 leading-relaxed resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Inspirações do Cardápio:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPrompt(p)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-zinc-300 text-left line-clamp-1 cursor-pointer transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <fieldset className="space-y-2 pt-1">
            <div className="flex items-center justify-between gap-2">
              <legend className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                Resolução da Imagem
              </legend>
              <span className="text-[11px] font-mono text-amber-400 font-bold">{SIZE_INFO[imageSize].caption}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {IMAGE_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={imageSize === size}
                  onClick={() => setImageSize(size)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold font-mono transition-colors cursor-pointer flex flex-col items-center gap-0.5 ${
                    imageSize === size
                      ? 'bg-amber-400 text-black border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                      : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/20'
                  }`}
                >
                  <span>{size}</span>
                  <span className="text-[9px] font-sans font-normal opacity-80">{SIZE_INFO[size].px}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label htmlFor="studio-aspect" className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block">
                Proporção (Aspect Ratio)
              </label>
              <select
                id="studio-aspect"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                className="w-full px-3 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-sm sm:text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                {ASPECT_RATIOS.map((ratio) => (
                  <option key={ratio} value={ratio}>
                    {ASPECT_LABELS[ratio]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="studio-style" className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block">
                Estilo Visual
              </label>
              <select
                id="studio-style"
                value={style}
                onChange={(e) => setStyle(e.target.value as ImageStyle)}
                className="w-full px-3 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-sm sm:text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                {IMAGE_STYLES.map((s) => (
                  <option key={s} value={s}>
                    {STYLE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div role="alert" className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-4 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-extrabold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-[0_0_20px_rgba(251,191,36,0.3)] cursor-pointer"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" aria-hidden="true" />
                <span>Gerando ({imageSize})...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-black" aria-hidden="true" />
                <span>Gerar Imagem Gourmet ({imageSize})</span>
              </>
            )}
          </button>
        </form>

        {/* Resultado */}
        <div className="lg:col-span-6 p-4 sm:p-6 flex flex-col justify-between bg-black/40 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-400" aria-hidden="true" />
                Resultado Visual
              </span>
              <span className="font-mono text-amber-400 font-semibold">
                {currentImage.imageSize} • {currentImage.aspectRatio}
              </span>
            </div>

            {isFallback && (
              <p className="text-[11px] text-amber-200 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                Gerador indisponível no momento — exibindo uma foto de referência do nosso acervo.
              </p>
            )}

            <div
              className="relative w-full h-[280px] sm:h-[360px] rounded-2xl bg-zinc-950 border border-white/10 overflow-hidden flex items-center justify-center group shadow-xl"
              aria-busy={isGenerating}
            >
              {isGenerating ? (
                <div className="flex flex-col items-center space-y-3 p-6 text-center" role="status">
                  <div className="w-12 h-12 rounded-full bg-amber-400/20 border border-amber-400 flex items-center justify-center text-amber-400 animate-pulse">
                    <Sparkles className="w-6 h-6 animate-spin [animation-duration:3s]" aria-hidden="true" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">Criando fotografia com IA...</p>
                    <p className="text-xs text-zinc-400">Renderizando smash patty em resolução {imageSize}</p>
                  </div>
                </div>
              ) : (
                <>
                  <SafeImage
                    src={currentImage.imageUrl}
                    alt={currentImage.prompt}
                    loading="eager"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4 flex flex-col justify-end sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                    <p className="text-xs text-zinc-200 line-clamp-2 mb-3">{currentImage.prompt}</p>
                    <a
                      href={currentImage.imageUrl}
                      download={`sao-cristovao-burger-${currentImage.imageSize.toLowerCase()}.png`}
                      className="self-start px-4 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 hover:bg-amber-300 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Baixar Imagem ({currentImage.imageSize})</span>
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>

          {gallery.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Histórico desta sessão ({gallery.length}):
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {gallery.map((rec, index) => (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => setCurrentImage(rec)}
                    aria-label={`Ver imagem ${gallery.length - index}: ${rec.prompt}`}
                    aria-pressed={currentImage.id === rec.id}
                    className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border transition-all cursor-pointer ${
                      currentImage.id === rec.id
                        ? 'border-amber-400 scale-105 shadow-md'
                        : 'border-white/10 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <SafeImage src={rec.imageUrl} alt="" className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 right-0 px-1 bg-black/80 text-[8px] font-mono text-amber-300">
                      {rec.imageSize}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default GeminiImageStudioModal;
