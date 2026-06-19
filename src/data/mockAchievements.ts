import type { Achievement } from '@/types/developer';

export const ACHIEVEMENT_ICONS: Record<string, string> = {
  'first-commit': 'FC',
  'star-collector': 'SC',
  polyglot: 'PL',
  'night-owl': 'NO',
  maintainer: 'MT',
  skyscraper: 'SK',
  'open-source': 'OS',
  mentor: 'MN',
  'speed-demon': 'SD',
  documentarian: 'DC',
  'bug-hunter': 'BH',
  architect: 'AR',
};

export const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first-commit', name: 'First Commit', icon: 'FC', unlockedAt: '' },
  { id: 'star-collector', name: 'Star Collector', icon: 'SC', unlockedAt: '' },
  { id: 'polyglot', name: 'Polyglot', icon: 'PL', unlockedAt: '' },
  { id: 'night-owl', name: 'Night Owl', icon: 'NO', unlockedAt: '' },
  { id: 'maintainer', name: 'Maintainer', icon: 'MT', unlockedAt: '' },
  { id: 'skyscraper', name: 'Skyscraper', icon: 'SK', unlockedAt: '' },
  { id: 'open-source', name: 'Open Source Hero', icon: 'OS', unlockedAt: '' },
  { id: 'mentor', name: 'Community Mentor', icon: 'MN', unlockedAt: '' },
  { id: 'speed-demon', name: 'Speed Demon', icon: 'SD', unlockedAt: '' },
  { id: 'documentarian', name: 'Documentarian', icon: 'DC', unlockedAt: '' },
  { id: 'bug-hunter', name: 'Bug Hunter', icon: 'BH', unlockedAt: '' },
  { id: 'architect', name: 'System Architect', icon: 'AR', unlockedAt: '' },
];
