import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatOrderMessage, validateAndPriceOrder } from '../shared/order.ts';

const validBody = () => ({
  customer: { name: '  Maria   Silva ', phone: '(48) 99999-8888' },
  address: 'Rua das Flores, 123 - Pagani',
  paymentMethod: 'cash',
  changeFor: 'R$ 100',
  items: [
    { itemId: 'destaque-1', quantity: 2, customization: { baconExtra: true, observacao: 'Bem passado' } },
    { itemId: 'bebida-1', quantity: 1 },
  ],
});

test('recalcula preços a partir do cardápio e normaliza dados do cliente', () => {
  const result = validateAndPriceOrder(validBody());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const { order } = result;
  assert.equal(order.customer.name, 'Maria Silva');
  assert.equal(order.customer.phone, '+5548999998888');
  assert.equal(order.lines[0].unitPrice, 54.9); // 48,90 + bacon 6,00
  assert.equal(order.lines[0].total, 109.8);
  assert.equal(order.subtotal, 115.7); // + Coca 5,90
  assert.equal(order.deliveryFee, 0); // frete grátis acima de R$ 75
  assert.equal(order.total, 115.7);
  assert.equal(order.changeFor, 'R$ 100');
});

test('ignora preços/campos injetados pelo cliente', () => {
  const body = validBody() as Record<string, unknown>;
  body.total = 0.01;
  (body.items as Record<string, unknown>[])[0].price = 0.01;
  (body.items as Record<string, unknown>[])[0].customization = { baconExtra: true, hack: true, bebidaEscolhida: 'Veneno' };
  const result = validateAndPriceOrder(body);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.order.lines[0].unitPrice, 54.9);
  assert.deepEqual(result.order.lines[0].customization, { baconExtra: true });
});

test('rejeita pedido abaixo do mínimo', () => {
  const body = { ...validBody(), items: [{ itemId: 'molho-1', quantity: 1 }] };
  const result = validateAndPriceOrder(body);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'ORDER_BELOW_MINIMUM');
});

test('acumula erros de validação de todos os campos', () => {
  const result = validateAndPriceOrder({
    customer: { name: 'A', phone: '123' },
    address: 'curto',
    paymentMethod: 'bitcoin',
    items: [{ itemId: 'nao-existe', quantity: 1 }, { itemId: 'destaque-1', quantity: 0 }],
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'INVALID_PAYLOAD');
  assert.equal(result.errors.length, 6);
});

test('troco só é considerado no pagamento em dinheiro', () => {
  const result = validateAndPriceOrder({ ...validBody(), paymentMethod: 'pix' });
  assert.equal(result.ok && result.order.changeFor, undefined);
});

test('mensagem do WhatsApp contém itens, personalizações e totais', () => {
  const result = validateAndPriceOrder(validBody());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const message = formatOrderMessage('SC-TEST01', result.order);
  assert.match(message, /Novo pedido SC-TEST01/);
  assert.match(message, /\(48\) 99999-8888/);
  assert.match(message, /2x Burger 120g Bacon & Cheddar Cristovão Bacon — R\$ 109,80/);
  assert.match(message, /\+ Farofa de Bacon Crocante; Obs: Bem passado/);
  assert.match(message, /Dinheiro \(troco para R\$ 100\)/);
  assert.match(message, /\*Total: R\$ 115,70\*/);
});
