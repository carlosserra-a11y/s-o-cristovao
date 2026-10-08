import React, { Component, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface LazyBoundaryProps {
  /** O que exibir se o chunk falhar ao carregar (rede instável, deploy novo). */
  errorFallback: ReactNode;
  children: ReactNode;
}

interface LazyBoundaryState {
  hasError: boolean;
}

/** Evita tela branca quando um componente carregado via React.lazy falha. */
export class LazyBoundary extends Component<LazyBoundaryProps, LazyBoundaryState> {
  state: LazyBoundaryState = { hasError: false };

  static getDerivedStateFromError(): LazyBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[LazyBoundary] Falha ao carregar componente:', error);
  }

  render() {
    return this.state.hasError ? this.props.errorFallback : this.props.children;
  }
}

/** Fallback minimalista enquanto o chunk de um modal é baixado. */
export const ModalLoadingFallback: React.FC = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" role="status">
    <Loader2 className="w-8 h-8 text-amber-400 animate-spin" aria-hidden="true" />
    <span className="sr-only">Carregando...</span>
  </div>
);

export const ModalLoadError: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div
    role="alert"
    className="fixed bottom-4 left-4 right-4 sm:left-auto sm:max-w-sm z-50 p-4 rounded-2xl bg-[#121216] border border-red-500/40 text-sm text-zinc-200 shadow-2xl flex items-center justify-between gap-3"
  >
    <span>Não foi possível carregar esta seção. Verifique sua conexão.</span>
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="px-3 py-2 rounded-lg bg-amber-400 text-black text-xs font-bold shrink-0 cursor-pointer"
    >
      Recarregar
    </button>
    <button
      type="button"
      onClick={onClose}
      className="px-2 py-2 text-xs text-zinc-400 hover:text-white underline shrink-0 cursor-pointer"
    >
      Fechar
    </button>
  </div>
);

/** Brilho estático exibido enquanto a camada animada do burger carrega. */
export const StaticBackdrop: React.FC = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_70%_45%,rgba(245,158,11,0.16),transparent_60%)]"
  />
);
