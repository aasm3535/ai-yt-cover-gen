export enum ThumbnailStyle {
  MINIMALIST = 'Minimalist & Clean',
  CLICKBAIT = 'High Contrast & Emotional (Clickbait)',
  GAMING = 'Gaming & Neon',
  PROFESSIONAL = 'Professional & Corporate',
  VLOG = 'Lifestyle & Vlog'
}

export interface GeneratedImage {
  url: string;
  promptUsed: string;
}

export enum AppState {
  IDLE,
  GENERATING,
  SUCCESS,
  ERROR
}
