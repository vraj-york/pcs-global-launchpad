import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../utils/db.js';
import { logger } from '../utils/logger.js';
import { runMigrations } from './migrate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface SeedDeveloper {
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
  topRepos: Array<{ name: string; stars: number; language: string; description: string }>;
  achievements: Array<{ id: string; name: string; icon: string; unlockedAt: string }>;
  buildingPosition: [number, number];
  buildingColor: string;
  isOnline: boolean;
  customization?: Record<string, unknown>;
}

interface SeedData {
  developers: SeedDeveloper[];
  cityDevCount: number;
  shopItems: Array<{
    id: string;
    name: string;
    description: string;
    price: string;
    category: string;
    previewColor?: string;
    auraType?: string;
  }>;
  achievements: Array<{ id: string; name: string; icon: string }>;
}

export async function runSeed(): Promise<void> {
  const seedPath = path.resolve(__dirname, '../../seeds/seed-data.json');
  const raw = fs.readFileSync(seedPath, 'utf8');
  const data: SeedData = JSON.parse(raw);

  await runMigrations();

  await pool.query('TRUNCATE developer_achievements, top_repos, developers, achievements, shop_items, city_stats RESTART IDENTITY CASCADE');

  for (const a of data.achievements) {
    await pool.query(
      `INSERT INTO achievements (id, name, icon) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [a.id, a.name, a.icon],
    );
  }

  for (const item of data.shopItems) {
    await pool.query(
      `INSERT INTO shop_items (id, name, description, price, category, preview_color, aura_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
      [item.id, item.name, item.description, item.price, item.category, item.previewColor ?? null, item.auraType ?? null],
    );
  }

  for (const dev of data.developers) {
    await pool.query(
      `INSERT INTO developers (
        id, username, avatar_url, display_name, bio, location,
        contributions, repo_count, star_count, followers, joined_date,
        building_position_x, building_position_y, building_color, is_online, customization
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb)`,
      [
        dev.id,
        dev.username,
        dev.avatarUrl,
        dev.displayName,
        dev.bio,
        dev.location,
        dev.contributions,
        dev.repoCount,
        dev.starCount,
        dev.followers,
        dev.joinedDate,
        dev.buildingPosition[0],
        dev.buildingPosition[1],
        dev.buildingColor,
        dev.isOnline,
        JSON.stringify(dev.customization ?? {}),
      ],
    );

    for (let i = 0; i < dev.topRepos.length; i++) {
      const repo = dev.topRepos[i];
      await pool.query(
        `INSERT INTO top_repos (developer_id, name, stars, language, description, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [dev.id, repo.name, repo.stars, repo.language, repo.description, i],
      );
    }

    for (const ach of dev.achievements) {
      if (!ach.unlockedAt) continue;
      await pool.query(
        `INSERT INTO developer_achievements (developer_id, achievement_id, unlocked_at)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [dev.id, ach.id, ach.unlockedAt],
      );
    }
  }

  await pool.query(
    `INSERT INTO city_stats (id, total_developers) VALUES (1, $1)
     ON CONFLICT (id) DO UPDATE SET total_developers = EXCLUDED.total_developers`,
    [data.cityDevCount],
  );

  logger.info(`Seeded ${data.developers.length} developers`);
}

