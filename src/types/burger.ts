export interface MenuItem {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  serves?: string;
  highlight?: boolean;
  tags?: string[];
  isAvailable?: boolean;
}

export interface CustomizationOption {
  baconExtra?: boolean;
  cheddarExtra?: boolean;
  costelaExtra?: boolean;
  maioneseExtra?: boolean;
  semCebola?: boolean;
  semSalada?: boolean;
  semPicles?: boolean;
  observacao?: string;
  bebidaEscolhida?: string;
}

export interface CartItem {
  id: string;
  item: MenuItem;
  quantity: number;
  customization?: CustomizationOption;
  totalPrice: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  address: string;
  paymentMethod: 'pix' | 'card' | 'cash';
  status: 'received' | 'grilling' | 'packing' | 'delivering' | 'delivered';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedItemId?: string;
}

export interface GeneratedImageRecord {
  id: string;
  imageUrl: string;
  prompt: string;
  imageSize: '1K' | '2K' | '4K';
  aspectRatio: string;
  createdAt: string;
}
