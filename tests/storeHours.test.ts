import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getStoreStatus } from '../shared/storeHours.ts';

// America/Sao_Paulo = UTC−3 (sem horário de verão desde 2019).
const at = (utcIso: string) => getStoreStatus(new Date(utcIso));

test('abre exatamente às 18:00 e fecha exatamente às 23:30 (horário de Brasília)', () => {
  assert.equal(at('2026-10-08T20:59:59Z').isOpen, false); // 17:59:59
  assert.equal(at('2026-10-08T21:00:00Z').isOpen, true); // 18:00:00
  assert.equal(at('2026-10-09T02:29:59Z').isOpen, true); // 23:29:59
  assert.equal(at('2026-10-09T02:30:00Z').isOpen, false); // 23:30:00
  assert.equal(at('2026-10-09T03:15:00Z').isOpen, false); // 00:15
});

test('informa hora local e minutos até a próxima mudança', () => {
  const status = at('2026-10-08T20:00:00Z'); // 17:00
  assert.equal(status.localTime, '17:00');
  assert.equal(status.minutesUntilChange, 60);
  assert.equal(status.timezone, 'America/Sao_Paulo');
});
