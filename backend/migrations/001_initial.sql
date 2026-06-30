CREATE TABLE IF NOT EXISTS developers (
  id VARCHAR(32) PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  avatar_url TEXT NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  location VARCHAR(128) NOT NULL DEFAULT '',
  contributions INTEGER NOT NULL DEFAULT 0,
  repo_count INTEGER NOT NULL DEFAULT 0,
  star_count INTEGER NOT NULL DEFAULT 0,
  followers INTEGER NOT NULL DEFAULT 0,
  joined_date DATE NOT NULL,
  building_position_x INTEGER NOT NULL,
  building_position_y INTEGER NOT NULL,
  building_color VARCHAR(16) NOT NULL,
  is_online BOOLEAN NOT NULL DEFAULT false,
  customization JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS top_repos (
  id SERIAL PRIMARY KEY,
  developer_id VARCHAR(32) NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL,
  stars INTEGER NOT NULL DEFAULT 0,
  language VARCHAR(64) NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS achievements (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  icon VARCHAR(8) NOT NULL
);

CREATE TABLE IF NOT EXISTS developer_achievements (
  developer_id VARCHAR(32) NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  achievement_id VARCHAR(64) NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at DATE NOT NULL,
  PRIMARY KEY (developer_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS shop_items (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  description TEXT NOT NULL,
  price VARCHAR(16) NOT NULL,
  category VARCHAR(32) NOT NULL,
  preview_color VARCHAR(16),
  aura_type VARCHAR(16)
);

CREATE TABLE IF NOT EXISTS city_stats (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  total_developers INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_developers_username ON developers(username);
CREATE INDEX IF NOT EXISTS idx_top_repos_developer ON top_repos(developer_id);
