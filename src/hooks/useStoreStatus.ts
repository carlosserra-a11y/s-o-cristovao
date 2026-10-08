import { useEffect, useRef, useState } from 'react';
import { getStoreStatus, StoreStatus } from '../../shared/storeHours';
import { api } from '../lib/api';

const MAX_RECHECK_MS = 60_000;

/**
 * Status aberto/fechado calculado automaticamente (18:00–23:30, America/Sao_Paulo).
 *
 * - A regra vem de `shared/storeHours.ts` (mesma usada pelo servidor).
 * - O fuso é aplicado via Intl, então funciona em qualquer país/configuração.
 * - Na montagem buscamos /api/store/status uma única vez para corrigir um
 *   eventual relógio desajustado do dispositivo (offset servidor − cliente).
 *   Se a API falhar, seguimos com o relógio local.
 * - Reavalia no próximo limite (abertura/fechamento), a cada minuto no máximo,
 *   e quando a aba volta a ficar visível. Só atualiza o estado se isOpen mudar.
 */
export function useStoreStatus(): StoreStatus {
  const clockOffsetRef = useRef(0);
  const [status, setStatus] = useState<StoreStatus>(() => getStoreStatus());

  useEffect(() => {
    const controller = new AbortController();
    let timeoutId = 0;

    const evaluate = () => {
      window.clearTimeout(timeoutId);
      const next = getStoreStatus(new Date(Date.now() + clockOffsetRef.current));
      setStatus((prev) => (prev.isOpen === next.isOpen ? prev : next));
      const untilChangeMs = next.minutesUntilChange * 60_000 + 500;
      timeoutId = window.setTimeout(evaluate, Math.max(1_000, Math.min(MAX_RECHECK_MS, untilChangeMs)));
    };

    const onVisibilityChange = () => {
      if (!document.hidden) evaluate();
    };

    evaluate();
    document.addEventListener('visibilitychange', onVisibilityChange);

    api
      .storeStatus(controller.signal)
      .then(({ data }) => {
        if (Number.isFinite(data.serverTime)) {
          clockOffsetRef.current = data.serverTime - Date.now();
          evaluate();
        }
      })
      .catch(() => {
        /* sem servidor → relógio local (a regra de fuso continua correta) */
      });

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return status;
}
