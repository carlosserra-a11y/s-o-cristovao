/**
 * Validação e normalização de telefones para WhatsApp no formato E.164.
 *
 * Aceita o que o cliente costuma digitar — "(48) 99999-9999", "48999999999",
 * "+55 48 9 9999 9999", "0 48 99999-9999", "5548999999999" — e devolve
 * sempre "+55DDD9XXXXXXXX". Somente celulares brasileiros são aceitos
 * (WhatsApp exige número móvel; fixos têm 8 dígitos e não começam com 9).
 */

/** E.164 genérico: "+", código do país (sem zero inicial) e até 15 dígitos no total. */
export const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

/** Celular brasileiro em E.164: +55 · DDD (2 dígitos) · 9 · 8 dígitos. */
export const BR_MOBILE_E164_PATTERN = /^\+55[1-9][1-9]9\d{8}$/;

/** DDDs válidos no Brasil (Anatel). */
const VALID_DDDS: ReadonlySet<string> = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
]);

export const isE164 = (value: string): boolean => E164_PATTERN.test(value);

/**
 * Normaliza um celular brasileiro para E.164. Retorna null quando o número é
 * inválido (DDD inexistente, fixo, quantidade errada de dígitos, outro país).
 */
export function normalizeBrazilianMobile(input: string): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > 30) return null;
  // Só dígitos e separadores comuns; letras indicam entrada inválida.
  if (!/^[\d\s()+.\-]+$/.test(trimmed)) return null;

  const hasPlus = trimmed.startsWith('+');
  let digits = trimmed.replace(/\D/g, '');

  if (hasPlus) {
    if (!digits.startsWith('55')) return null; // outro país
    digits = digits.slice(2);
  } else if (digits.length === 13 && digits.startsWith('55')) {
    digits = digits.slice(2); // 55 + DDD + 9 dígitos sem "+"
  } else if (digits.length === 12 && digits.startsWith('0')) {
    digits = digits.slice(1); // prefixo de longa distância "0"
  }

  if (digits.length !== 11) return null;
  const ddd = digits.slice(0, 2);
  const subscriber = digits.slice(2);
  if (!VALID_DDDS.has(ddd) || !subscriber.startsWith('9')) return null;

  const e164 = `+55${ddd}${subscriber}`;
  return BR_MOBILE_E164_PATTERN.test(e164) ? e164 : null;
}

/** "+5548999999999" → "(48) 99999-9999" — para exibição. */
export function formatBrazilianMobile(e164: string): string {
  const match = /^\+55(\d{2})(\d{5})(\d{4})$/.exec(e164);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : e164;
}
