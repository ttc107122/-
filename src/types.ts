export interface Contact {
  id: string;
  name: string;
  signature: string;
  persona: string;
  avatar: string; // Base64 or preset placeholder url
  avatarShape: 'rounded' | 'circle';
  chatBg?: string; // Hex color, CSS gradient, or uploaded Base64 image
  voiceBg?: string; // Hex color, CSS gradient, or uploaded Base64 image
  postFrequency: 'high' | 'medium' | 'low' | 'none';
  isPinned: boolean;
}

export interface Group {
  id: string;
  name: string;
  memberIds: string[]; // List of Contact IDs
  chatBg?: string;
}

export interface ChatMessage {
  id: string;
  chatId: string; // Contact ID or Group ID
  senderId: 'me' | string; // Contact ID or 'me'
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
  type: 'text' | 'system' | 'voice_call';
}

export interface MomentPost {
  id: string;
  authorId: 'me' | string;
  authorName: string;
  authorAvatar: string;
  authorAvatarShape: 'rounded' | 'circle';
  content: string;
  timestamp: string;
  likes: string[]; // List of names
  comments: {
    id: string;
    authorName: string;
    text: string;
    timestamp: string;
  }[];
}

export interface UserProfile {
  name: string;
  avatar: string;
  signature: string;
  persona: string; // Faced AI persona
  state: string; // Current status emoji/text
}

export interface APIConfig {
  url: string;
  model: string;
  apiKey: string;
}
