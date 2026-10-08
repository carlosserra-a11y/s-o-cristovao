import type {
  AspectRatio,
  ChatMessageInput,
  ChatModel,
  ChatRoleMode,
  ImageSize,
  ImageStyle,
} from '../../shared/api.ts';

/** Payload de chat já validado e normalizado (sem campos desconhecidos). */
export interface ValidatedChatRequest {
  messages: ChatMessageInput[];
  role: ChatRoleMode;
  modelPreference?: ChatModel;
}

export interface ValidatedImageRequest {
  prompt: string;
  imageSize: ImageSize;
  aspectRatio: AspectRatio;
  style: ImageStyle;
}

export interface ChatModelSelection {
  model: ChatModel;
  systemInstruction: string;
}

export interface GeneratedImage {
  imageUrl: string;
  description: string;
}
