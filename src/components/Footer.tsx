import React from 'react';
import { MapPin, Clock, Phone, Instagram, Facebook, Heart } from 'lucide-react';
import { SaoCristovaoLogo } from './SaoCristovaoLogo';
import { STORE_CLOSES_AT, STORE_OPENS_AT } from '../../shared/storeHours';

export const Footer: React.FC = () => {
  return (
    <footer className="relative z-20 bg-black border-t border-white/10 text-zinc-400 text-xs py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <SaoCristovaoLogo size={52} alt="" />
              <div className="flex flex-col">
                <span className="font-extrabold text-base text-white uppercase tracking-tight font-display">
                  São Cristóvão
                </span>
                <span className="text-[10px] tracking-wider font-bold text-amber-400 uppercase">
                  Hamburgueria
                </span>
              </div>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Smash burgers artesanais na chapa a 200°C com crosta de Maillard e blend Angus fresco selecionado. O sabor autêntico de Palhoça.
            </p>
            <div className="flex items-center gap-3 text-zinc-300 pt-1">
              <a href="#" aria-label="Instagram do São Cristóvão Burger" className="p-3 rounded-lg bg-white/5 hover:bg-amber-400 hover:text-black transition-colors">
                <Instagram className="w-4 h-4" aria-hidden="true" />
              </a>
              <a href="#" aria-label="Facebook do São Cristóvão Burger" className="p-3 rounded-lg bg-white/5 hover:bg-amber-400 hover:text-black transition-colors">
                <Facebook className="w-4 h-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Delivery & Address */}
          <div className="space-y-3">
            <h2 className="font-bold text-white uppercase tracking-wider text-xs font-sans">
              Localização & Entregas
            </h2>
            <div className="space-y-2 text-zinc-400">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Palhoça - Santa Catarina (Pagani, Pedra Branca, Centro, Ponte do Imaruim e região)</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Todos os dias, das {STORE_OPENS_AT} às {STORE_CLOSES_AT}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <span>(48) 99999-9999</span>
              </div>
            </div>
          </div>

          {/* Cardápio Rápido */}
          <div className="space-y-3">
            <h2 className="font-bold text-white uppercase tracking-wider text-xs font-sans">
              Categorias em Destaque
            </h2>
            <ul className="space-y-1.5 text-zinc-400">
              <li><a href="#cardapio" className="hover:text-amber-400 transition-colors">Destaques & Mais Vendidos</a></li>
              <li><a href="#cardapio" className="hover:text-amber-400 transition-colors">Baratíssimos do São Cristóvão</a></li>
              <li><a href="#cardapio" className="hover:text-amber-400 transition-colors">Combos para 2 Pessoas</a></li>
              <li><a href="#cardapio" className="hover:text-amber-400 transition-colors">Box Experiência Nutella</a></li>
              <li><a href="#cardapio" className="hover:text-amber-400 transition-colors">Molhos Artesanais & Bebidas</a></li>
            </ul>
          </div>

          {/* Informações Regulamentares & iFood */}
          <div className="space-y-3">
            <h2 className="font-bold text-white uppercase tracking-wider text-xs font-sans">
              Institucional & iFood
            </h2>
            <ul className="space-y-1.5 text-zinc-400">
              <li><a href="#" className="hover:text-amber-400 transition-colors">Site Institucional</a></li>
              <li><a href="#" className="hover:text-amber-400 transition-colors">Termos e Condições de Uso</a></li>
              <li><a href="#" className="hover:text-amber-400 transition-colors">Código de Conduta</a></li>
              <li><a href="#" className="hover:text-amber-400 transition-colors">Privacidade e Dicas de Segurança</a></li>
              <li><span className="text-zinc-500">CNPJ 14.380.200/0001-21</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-500 text-[11px]">
          <div>
            © 2026 São Cristóvão Burger • Palhoça - SC. Todos os direitos reservados.
          </div>
          <div className="flex items-center gap-1">
            <span>Desenvolvido com</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 inline" />
            <span>para amantes de smash burger.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
