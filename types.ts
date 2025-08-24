export enum Tab {
  GENERATOR = 'generator',
  IMAGE_STUDIO = 'image_studio',
  PROMPT_HELPER = 'prompt_helper',
  FILMMAKER = 'filmmaker',
  AFFILIATE_SCRIPT_GENERATOR = 'affiliate_script_generator',
  CHATGPT = 'chatgpt',
}

export enum ImageStudioSubTab {
  GENERATE = 'generate',
  ANALYZE = 'analyze',
  UPSCALE = 'upscale',
  MICROSTOCK = 'microstock',
}

export interface SelectOption {
    value: string;
    label: string;
}

export interface Scene {
  sceneNumber: number;
  duration: number;
  setting: string;
  characters: string[];
  camera: string;
  dialogue: string;
}

export enum Resolution {
  HD = 'HD',
  FullHD = 'FullHD',
}

export interface ImageOptions {
  file: File;
}

export interface VideoGenerationOptions {
  prompt: string;
  model: string;
  aspectRatio: "16:9" | "9:16" | "4:3" | "3:4" | "1:1";
  soundEnabled: boolean;
  resolution: Resolution;
  image?: ImageOptions;
}