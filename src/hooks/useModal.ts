import { RefObject, useEffect, useLayoutEffect, useRef } from 'react';
import { isTopModal, popModal, pushModal } from '../lib/modalManager';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.closest('[inert]') && el.getClientRects().length > 0
  );
}

interface UseModalOptions {
  /** Elemento que recebe o foco inicial. Padrão: [data-autofocus] ou o próprio painel. */
  initialFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Comportamento de diálogo acessível:
 *  - registra o modal na pilha global (scroll lock + fundo `inert`);
 *  - foco inicial dentro do diálogo;
 *  - focus trap (Tab / Shift+Tab circulam apenas dentro do painel);
 *  - Escape fecha (somente o modal do topo);
 *  - ao fechar, devolve o foco ao elemento que abriu o modal.
 */
export function useModal(
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  { initialFocusRef }: UseModalOptions = {}
): void {
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const id = Symbol('modal');
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    pushModal(id);

    const panel = panelRef.current;
    const initial =
      initialFocusRef?.current ?? panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel;
    initial?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTopModal(id) || !panel) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = getFocusableElements(panel);
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus({ preventScroll: true });
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const outside = !active || !panel.contains(active);

      if (event.shiftKey && (active === first || active === panel || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };

    // Rede de segurança: se o foco escapar (ex.: clique programático), traz de volta.
    const onFocusIn = (event: FocusEvent) => {
      if (!isTopModal(id) || !panel) return;
      if (event.target instanceof Node && !panel.contains(event.target)) {
        (getFocusableElements(panel)[0] ?? panel).focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
      // Remove o `inert` do fundo ANTES de devolver o foco (elemento inert não recebe foco).
      popModal(id);
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    };
    // O diálogo é montado/desmontado pelo pai: o efeito roda uma vez por abertura
    // (onClose é lido via ref; panelRef/initialFocusRef são refs estáveis).
  }, []);
}
