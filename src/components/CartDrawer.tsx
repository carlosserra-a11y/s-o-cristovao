import React, { useEffect, useRef, useState } from 'react';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, CheckCircle2, MapPin, CreditCard, QrCode, Banknote, AlertCircle } from 'lucide-react';
import { CartItem, Order } from '../types/burger';
import { SaoCristovaoLogo } from './SaoCristovaoLogo';
import { Dialog, DialogCloseButton } from './ui/Dialog';
import { SafeImage } from './ui/SafeImage';
import { formatBRL, formatClock } from '../lib/format';
import { EXTRAS, MIN_ORDER_VALUE, REMOVALS, getDeliveryFee, roundMoney } from '../lib/pricing';
import { STORE_OPENS_AT } from '../../shared/storeHours';

interface CartDrawerProps {
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (cartItemId: string, delta: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onCheckoutSuccess: (order: Order) => void;
  isOpenStore: boolean;
}

type PaymentMethod = Order['paymentMethod'];

const PAYMENT_OPTIONS: ReadonlyArray<{ value: PaymentMethod; label: string; Icon: typeof QrCode }> = [
  { value: 'pix', label: 'Pix', Icon: QrCode },
  { value: 'card', label: 'Cartão', Icon: CreditCard },
  { value: 'cash', label: 'Dinheiro', Icon: Banknote },
];

const MIN_ADDRESS_LENGTH = 8;
const CHECKOUT_DELAY_MS = 600;

const CartDrawer: React.FC<CartDrawerProps> = ({
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onCheckoutSuccess,
  isOpenStore,
}) => {
  const [address, setAddress] = useState<string>('Rua Prefeito Reinoldo Alves, 142 - Pagani, Palhoça - SC');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [troco, setTroco] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const checkoutTimerRef = useRef<number | undefined>(undefined);

  // Nenhum timer sobrevive ao fechamento do drawer.
  useEffect(() => () => window.clearTimeout(checkoutTimerRef.current), []);

  const subtotal = roundMoney(cart.reduce((acc, curr) => acc + curr.totalPrice, 0));
  const deliveryFee = getDeliveryFee(subtotal);
  const total = roundMoney(subtotal + deliveryFee);

  const reachedMinimum = subtotal >= MIN_ORDER_VALUE;
  const hasAddress = address.trim().length >= MIN_ADDRESS_LENGTH;
  const canCheckout = reachedMinimum && hasAddress;
  const missingAmount = Math.max(0, MIN_ORDER_VALUE - subtotal);
  const minProgress = Math.min(100, (subtotal / MIN_ORDER_VALUE) * 100);

  const handleFinishOrder = () => {
    if (!canCheckout || isSubmitting) return;
    setIsSubmitting(true);

    // canvas-confetti só é baixado no momento do pedido (code splitting).
    import('canvas-confetti')
      .then(({ default: confetti }) =>
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#fbbf24', '#f59e0b', '#ef4444', '#10b981'],
          disableForReducedMotion: true,
        })
      )
      .catch(() => {
        /* efeito decorativo — falha silenciosa */
      });

    checkoutTimerRef.current = window.setTimeout(() => {
      const order: Order = {
        id: `SC-${Math.floor(1000 + Math.random() * 9000)}`,
        items: [...cart],
        subtotal,
        deliveryFee,
        total,
        address: address.trim(),
        paymentMethod,
        status: 'received',
        createdAt: formatClock(),
      };
      setIsSubmitting(false);
      onCheckoutSuccess(order);
    }, CHECKOUT_DELAY_MS);
  };

  const titleId = 'cart-title';

  return (
    <Dialog
      onClose={onClose}
      labelledBy={titleId}
      variant="drawer"
      panelClassName="h-full w-full max-w-md bg-[#121216] border-l border-white/10 flex flex-col shadow-2xl"
    >
      {/* Cabeçalho */}
      <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SaoCristovaoLogo size={38} />
          <div>
            <h2 id={titleId} className="font-extrabold text-base text-white uppercase font-display leading-tight">
              Seu Carrinho
            </h2>
            <span className="text-[10px] text-amber-400 font-semibold uppercase">São Cristóvão Hamburgueria</span>
          </div>
        </div>
        <DialogCloseButton onClose={onClose} label="Fechar carrinho" />
      </div>

      {!isOpenStore && (
        <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
          <span>A loja abre às {STORE_OPENS_AT}. Você pode antecipar e agendar seu pedido normalmente!</span>
        </div>
      )}

      {/* Itens */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
        {cart.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500">
              <ShoppingBag className="w-8 h-8" aria-hidden="true" />
            </div>
            <p className="text-zinc-300 text-sm font-medium">Seu carrinho está vazio.</p>
            <p className="text-xs text-zinc-400 max-w-xs">
              Adicione nossos smash burgers crocantes para começar seu pedido!
            </p>
            <button
              type="button"
              onClick={onClose}
              data-autofocus
              className="mt-2 px-5 py-3 rounded-xl bg-amber-400 text-black font-bold text-xs uppercase cursor-pointer"
            >
              Explorar Cardápio
            </button>
          </div>
        ) : (
          <>
            {/* Pedido mínimo */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex justify-between gap-2 text-xs">
                <span className="text-zinc-300">Pedido Mínimo ({formatBRL(MIN_ORDER_VALUE)}):</span>
                {reachedMinimum ? (
                  <span className="text-green-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Mínimo atingido!
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold">Faltam {formatBRL(missingAmount)}</span>
                )}
              </div>
              <div
                className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden"
                role="progressbar"
                aria-label="Progresso até o pedido mínimo"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(minProgress)}
              >
                <div
                  className={`h-full w-full origin-left transition-transform duration-300 ${
                    reachedMinimum ? 'bg-green-400' : 'bg-amber-400'
                  }`}
                  style={{ transform: `scaleX(${minProgress / 100})` }}
                />
              </div>
            </div>

            <ul className="space-y-3" aria-label="Itens no carrinho">
              {cart.map((cartItem) => {
                const c = cartItem.customization;
                return (
                  <li
                    key={cartItem.id}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3 min-w-0">
                        <SafeImage
                          src={cartItem.item.image}
                          alt=""
                          width={56}
                          height={56}
                          responsiveWidths={[120]}
                          sizes="56px"
                          className="w-14 h-14 rounded-xl object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-white line-clamp-2">{cartItem.item.name}</h3>
                          <span className="text-xs font-mono font-bold text-amber-400">
                            {formatBRL(cartItem.totalPrice)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(cartItem.id)}
                        aria-label={`Remover ${cartItem.item.name} do carrinho`}
                        className="text-zinc-500 hover:text-red-400 transition-colors p-2 -m-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>

                    {c && (
                      <div className="flex flex-wrap gap-1 text-[10px] text-zinc-400">
                        {c.bebidaEscolhida && (
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                            Bebida: {c.bebidaEscolhida}
                          </span>
                        )}
                        {EXTRAS.filter((e) => c[e.key]).map((e) => (
                          <span key={e.key} className="px-2 py-0.5 rounded bg-amber-400/10 text-amber-300">
                            + {e.label}
                          </span>
                        ))}
                        {REMOVALS.filter((r) => c[r.key]).map((r) => (
                          <span key={r.key} className="px-2 py-0.5 rounded bg-red-500/10 text-red-300">
                            Sem {r.ingredient}
                          </span>
                        ))}
                        {c.observacao && (
                          <span className="px-2 py-0.5 rounded bg-white/5 text-zinc-400 italic break-all">
                            Obs: {c.observacao}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-zinc-400">Quantidade:</span>
                      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(cartItem.id, -1)}
                          aria-label={`Diminuir quantidade de ${cartItem.item.name}`}
                          className="w-8 h-8 rounded bg-white/5 hover:bg-white/15 flex items-center justify-center text-white cursor-pointer"
                        >
                          <Minus className="w-3 h-3" aria-hidden="true" />
                        </button>
                        <span className="w-6 text-center text-xs font-mono font-bold text-white" aria-live="polite">
                          {cartItem.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(cartItem.id, 1)}
                          aria-label={`Aumentar quantidade de ${cartItem.item.name}`}
                          className="w-8 h-8 rounded bg-white/5 hover:bg-white/15 flex items-center justify-center text-white cursor-pointer"
                        >
                          <Plus className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Endereço */}
            <div className="pt-4 border-t border-white/10 space-y-2">
              <label htmlFor="cart-address" className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                Endereço de Entrega (Palhoça - SC)
              </label>
              <input
                id="cart-address"
                type="text"
                value={address}
                autoComplete="street-address"
                maxLength={200}
                aria-invalid={!hasAddress}
                aria-describedby="cart-address-hint"
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-base sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 aria-[invalid=true]:border-red-500/60"
              />
              <span id="cart-address-hint" className="text-[10px] text-zinc-400 block">
                {hasAddress
                  ? 'Entrega rápida em Pagani, Pedra Branca, Centro, Ponte do Imaruim e bairros vizinhos.'
                  : 'Informe o endereço completo para finalizar o pedido.'}
              </span>
            </div>

            {/* Pagamento */}
            <fieldset className="pt-2 space-y-2">
              <legend className="text-xs font-bold text-zinc-300 mb-2">Forma de Pagamento</legend>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_OPTIONS.map(({ value, label, Icon }) => (
                  <label
                    key={value}
                    className={`min-h-14 p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-amber-400 ${
                      paymentMethod === value
                        ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                        : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment-method"
                      value={value}
                      checked={paymentMethod === value}
                      onChange={() => setPaymentMethod(value)}
                      className="sr-only"
                    />
                    <Icon className="w-4 h-4 text-amber-400" aria-hidden="true" />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              {paymentMethod === 'cash' && (
                <div className="pt-1">
                  <label htmlFor="cart-troco" className="sr-only">
                    Troco para quanto?
                  </label>
                  <input
                    id="cart-troco"
                    type="text"
                    inputMode="decimal"
                    value={troco}
                    maxLength={20}
                    onChange={(e) => setTroco(e.target.value)}
                    placeholder="Troco para quanto? (Ex: R$ 100)"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-base sm:text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}
            </fieldset>
          </>
        )}
      </div>

      {/* Resumo e checkout */}
      {cart.length > 0 && (
        <div className="p-4 sm:p-6 bg-black/80 border-t border-white/10 space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <dl className="space-y-1.5 text-xs text-zinc-400">
            <div className="flex justify-between">
              <dt>Subtotal dos itens:</dt>
              <dd className="text-white font-mono">{formatBRL(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Taxa de Entrega (Palhoça):</dt>
              <dd className={deliveryFee === 0 ? 'text-green-400 font-bold' : 'text-white font-mono'}>
                {deliveryFee === 0 ? 'Grátis (acima de R$ 75)' : formatBRL(deliveryFee)}
              </dd>
            </div>
            <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-white/10">
              <dt>Total do Pedido:</dt>
              <dd className="text-amber-400 font-display">{formatBRL(total)}</dd>
            </div>
          </dl>

          <button
            type="button"
            disabled={!canCheckout || isSubmitting}
            onClick={handleFinishOrder}
            className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-[0_0_20px_rgba(251,191,36,0.3)] cursor-pointer"
          >
            <span>
              {isSubmitting
                ? 'Enviando pedido...'
                : !reachedMinimum
                  ? 'Pedido Mínimo não Atingido'
                  : !hasAddress
                    ? 'Informe o Endereço'
                    : 'Finalizar e Enviar Pedido'}
            </span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </Dialog>
  );
};

export default CartDrawer;
