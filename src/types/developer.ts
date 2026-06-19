export interface TopRepo {
  name: string;
  stars: number;
  language: string;
  description: string;
}

export interface Achievement {
  id: string;
  name: string;
  icon: string;
  unlockedAt: string;
}

export interface DeveloperCustomization {
  crown?: boolean;
  aura?: 'none' | 'blue' | 'gold' | 'purple';
  roofEffect?: string;
}

export interface Developer {
  id: string;
  username: string;
  avatarUrl: string;
  displayName: string;
  bio: string;
  location: string;
  contributions: number;
  repoCount: number;
  starCount: number;
  followers: number;
  joinedDate: string;
  topRepos: TopRepo[];
  achievements: Achievement[];
  buildingPosition: [number, number];
  buildingColor: string;
  isOnline: boolean;
  customization?: DeveloperCustomization;
}

export type CameraMode = 'orbit' | 'fly';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: string;
  category: 'crown' | 'aura' | 'roof';
  previewColor?: string;
  auraType?: DeveloperCustomization['aura'];
}
