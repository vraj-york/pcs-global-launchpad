import { query } from '../utils/db.js';
import { notFound } from '../utils/errors.js';

export interface TopRepoRow {
  name: string;
  stars: number;
  language: string;
  description: string;
}

export interface AchievementRow {
  id: string;
  name: string;
  icon: string;
  unlockedAt: string;
}

export interface DeveloperRow {
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
  buildingPosition: [number, number];
  buildingColor: string;
  isOnline: boolean;
  customization?: Record<string, unknown>;
  topRepos: TopRepoRow[];
  achievements: AchievementRow[];
}

interface DeveloperDbRow {
  id: string;
  username: string;
  avatar_url: string;
  display_name: string;
  bio: string;
  location: string;
  contributions: number;
  repo_count: number;
  star_count: number;
  followers: number;
  joined_date: string;
  building_position_x: number;
  building_position_y: number;
  building_color: string;
  is_online: boolean;
  customization: Record<string, unknown> | null;
}

function mapDeveloper(
  row: DeveloperDbRow,
  topRepos: TopRepoRow[],
  achievements: AchievementRow[],
): DeveloperRow {
  const customization = row.customization && Object.keys(row.customization).length > 0
    ? row.customization
    : undefined;

  return {
    id: row.id,
    username: row.username,
    avatarUrl: row.avatar_url,
    displayName: row.display_name,
    bio: row.bio,
    location: row.location,
    contributions: row.contributions,
    repoCount: row.repo_count,
    starCount: row.star_count,
    followers: row.followers,
    joinedDate: String(row.joined_date).split('T')[0],
    buildingPosition: [row.building_position_x, row.building_position_y],
    buildingColor: row.building_color,
    isOnline: row.is_online,
    customization: customization as DeveloperRow['customization'],
    topRepos,
    achievements,
  };
}

async function loadRelated(developerIds: string[]): Promise<{
  repos: Map<string, TopRepoRow[]>;
  achievements: Map<string, AchievementRow[]>;
}> {
  const repos = new Map<string, TopRepoRow[]>();
  const achievements = new Map<string, AchievementRow[]>();

  if (developerIds.length === 0) {
    return { repos, achievements };
  }

  const repoResult = await query<{
    developer_id: string;
    name: string;
    stars: number;
    language: string;
    description: string;
  }>(
    `SELECT developer_id, name, stars, language, description
     FROM top_repos WHERE developer_id = ANY($1)
     ORDER BY sort_order ASC`,
    [developerIds],
  );

  for (const r of repoResult.rows) {
    const list = repos.get(r.developer_id) ?? [];
    list.push({
      name: r.name,
      stars: r.stars,
      language: r.language,
      description: r.description,
    });
    repos.set(r.developer_id, list);
  }

  const achResult = await query<{
    developer_id: string;
    id: string;
    name: string;
    icon: string;
    unlocked_at: string;
  }>(
    `SELECT da.developer_id, a.id, a.name, a.icon, da.unlocked_at
     FROM developer_achievements da
     JOIN achievements a ON a.id = da.achievement_id
     WHERE da.developer_id = ANY($1)`,
    [developerIds],
  );

  for (const a of achResult.rows) {
    const list = achievements.get(a.developer_id) ?? [];
    list.push({
      id: a.id,
      name: a.name,
      icon: a.icon,
      unlockedAt: String(a.unlocked_at).split('T')[0],
    });
    achievements.set(a.developer_id, list);
  }

  return { repos, achievements };
}

export async function listDevelopers(search?: string, limit?: number): Promise<DeveloperRow[]> {
  let sql = `SELECT * FROM developers`;
  const params: unknown[] = [];

  if (search?.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    sql += ` WHERE LOWER(username) LIKE $1 OR LOWER(display_name) LIKE $1`;
  }

  sql += ` ORDER BY contributions DESC`;

  if (limit && limit > 0) {
    params.push(limit);
    sql += ` LIMIT $${params.length}`;
  }

  const result = await query<DeveloperDbRow>(sql, params);
  const ids = result.rows.map((r) => r.id);
  const { repos, achievements } = await loadRelated(ids);

  return result.rows.map((row) =>
    mapDeveloper(row, repos.get(row.id) ?? [], achievements.get(row.id) ?? []),
  );
}

export async function getDeveloperById(id: string): Promise<DeveloperRow> {
  const result = await query<DeveloperDbRow>(`SELECT * FROM developers WHERE id = $1`, [id]);
  if (result.rows.length === 0) throw notFound('Developer not found');

  const { repos, achievements } = await loadRelated([id]);
  return mapDeveloper(result.rows[0], repos.get(id) ?? [], achievements.get(id) ?? []);
}

export async function updateCustomization(
  id: string,
  customization: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const existing = await query(`SELECT id FROM developers WHERE id = $1`, [id]);
  if (existing.rows.length === 0) throw notFound('Developer not found');

  const result = await query<{ customization: Record<string, unknown> }>(
    `UPDATE developers SET customization = $2::jsonb WHERE id = $1 RETURNING customization`,
    [id, JSON.stringify(customization)],
  );

  return result.rows[0].customization;
}

export async function getCityStats(): Promise<{ totalDevelopers: number }> {
  const result = await query<{ total_developers: number }>(
    `SELECT total_developers FROM city_stats WHERE id = 1`,
  );
  if (result.rows.length === 0) {
    const count = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM developers`);
    return { totalDevelopers: parseInt(count.rows[0]?.count ?? '0', 10) };
  }
  return { totalDevelopers: result.rows[0].total_developers };
}

export async function listShopItems() {
  const result = await query<{
    id: string;
    name: string;
    description: string;
    price: string;
    category: string;
    preview_color: string | null;
    aura_type: string | null;
  }>(`SELECT * FROM shop_items ORDER BY id`);

  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    price: r.price,
    category: r.category,
    ...(r.preview_color ? { previewColor: r.preview_color } : {}),
    ...(r.aura_type ? { auraType: r.aura_type } : {}),
  }));
}

export async function listAchievements() {
  const result = await query<{ id: string; name: string; icon: string }>(
    `SELECT id, name, icon FROM achievements ORDER BY id`,
  );
  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    icon: r.icon,
    unlockedAt: '',
  }));
}
