import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatBrazilianMobile, isE164, normalizeBrazilianMobile } from '../shared/phone.ts';

test('normaliza formatos comuns de celular brasileiro para E.164', () => {
  const expected = '+5548999998888';
  for (const input of [
    '(48) 99999-8888',
    '48 99999 8888',
    '48999998888',
    '048999998888',
    '5548999998888',
    '+55 48 9 9999-8888',
    '+55 (48) 99999.8888',
  ]) {
    assert.equal(normalizeBrazilianMobile(input), expected, input);
  }
});

test('rejeita números inválidos', () => {
  for (const input of [
    '',
    '   ',
    '4899999888', // 10 dígitos
    '(48) 3333-4444', // fixo
    '(20) 99999-8888', // DDD inexistente
    '+1 415 555 0100', // outro país
    '+55 48 99999-88888', // dígito a mais
    'abc48999998888',
    '48999998888; DROP TABLE',
  ]) {
    assert.equal(normalizeBrazilianMobile(input), null, JSON.stringify(input));
  }
});

test('valida E.164 genérico e formata para exibição', () => {
  assert.equal(isE164('+14155238886'), true);
  assert.equal(isE164('5548999998888'), false);
  assert.equal(isE164('+0123456789'), false);
  assert.equal(formatBrazilianMobile('+5548999998888'), '(48) 99999-8888');
});
