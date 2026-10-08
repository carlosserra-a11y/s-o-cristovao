/**
 * Pilha global de modais abertos.
 *
 * - Bloqueio de scroll com contagem de referências: o scroll da página só é
 *   restaurado quando o ÚLTIMO modal fecha (suporta modais/portais múltiplos).
 * - Bloqueia via `overflow: hidden` no <html>: a posição do scroll é mantida
 *   (sem o truque de position: fixed) e, com `scrollbar-gutter: stable` no CSS
 *   global, a barra de rolagem não "some" — logo não há salto horizontal.
 * - Marca o #root como `inert` enquanto houver modal: o conteúdo de fundo sai
 *   da navegação por teclado e da árvore de acessibilidade.
 * - Apenas o modal do topo responde a Escape/Tab.
 */

const stack: symbol[] = [];
let savedOverflow: string | null = null;

const ROOT_ID = 'root';

function lockPage(): void {
  const html = document.documentElement;
  savedOverflow = html.style.overflow;
  html.style.overflow = 'hidden';
  document.getElementById(ROOT_ID)?.setAttribute('inert', '');
}

function unlockPage(): void {
  document.documentElement.style.overflow = savedOverflow ?? '';
  savedOverflow = null;
  document.getElementById(ROOT_ID)?.removeAttribute('inert');
}

export function pushModal(id: symbol): void {
  if (stack.length === 0) lockPage();
  stack.push(id);
}

export function popModal(id: symbol): void {
  const index = stack.lastIndexOf(id);
  if (index === -1) return;
  stack.splice(index, 1);
  if (stack.length === 0) unlockPage();
}

export const isTopModal = (id: symbol): boolean => stack[stack.length - 1] === id;
