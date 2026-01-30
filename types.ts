
export type ThemeId = 'cyber' | 'luxury' | 'light' | 'forest';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  background: string;
  accent: string;
  text: string;
  footerColor: string;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  cyber: {
    id: 'cyber',
    name: 'Cyberpunk',
    background: 'rgba(0, 0, 0, 0.6)',
    accent: '#00ffff',
    text: '#ffffff',
    footerColor: '#aaaaaa'
  },
  luxury: {
    id: 'luxury',
    name: 'Midnight Luxury',
    background: 'linear-gradient(135deg, #1a1a1a, #000000)',
    accent: '#ffd700',
    text: '#ffffff',
    footerColor: '#999999'
  },
  light: {
    id: 'light',
    name: 'Clean Light',
    background: 'rgba(255, 255, 255, 0.95)',
    accent: '#2563eb',
    text: '#1f2937',
    footerColor: '#6b7280'
  },
  forest: {
    id: 'forest',
    name: 'Nature',
    background: 'linear-gradient(to bottom right, #134e5e, #71b280)',
    accent: '#a8ff78',
    text: '#ffffff',
    footerColor: '#e5e7eb'
  }
};

export interface AudioConfig {
  voiceName: string;
  script: string;
  generatedAudioBase64?: string;
  mood?: string;
}

export interface ThreeDConfig {
  shape: 'box' | 'sphere' | 'cylinder' | 'torus' | 'icosahedron' | 'custom';
  color: string;
  metalness: number;
  roughness: number;
  emissive: string;
  wireframe: boolean;
  autoRotate: boolean;
  // New field for professional software models
  modelUrl?: string; 
}

export interface LibraryItem {
  id: string;
  type: 'audio' | '3d';
  source: 'system' | 'user';
  name: string;
  // Stores either AudioConfig or ThreeDConfig
  data: any; 
  createdAt: number;
}

export interface AdData {
  header: string;
  productName: string;
  specs: string[];
  footer: string;
  videoUrl?: string;
  theme: ThemeId;
  audio?: AudioConfig;
  threeD?: ThreeDConfig;
}

export const INITIAL_AD_DATA: AdData = {
  header: "🌟 Sản phẩm mới tại Server Store",
  productName: "Dell PowerEdge R640 | Máy chủ doanh nghiệp mật độ cao",
  specs: [
    "🔧 CPU: Intel Xeon J-00 Tenade",
    "💾 5x 1.92TB SAS Enterprise",
    "⚡ Dual 750W RAD Enterprise",
    "❄️ Thiết kế làm mát hiệu suất cao 1U"
  ],
  footer: "SERVER STORE | Giải pháp máy chủ chuyên nghiệp",
  videoUrl: "",
  theme: 'cyber'
};