type Level = 'debug' | 'info' | 'warn' | 'error';

const levels: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function currentLevel(): Level {
  const l = (process.env.LOG_LEVEL ?? 'info') as Level;
  return levels[l] !== undefined ? l : 'info';
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (levels[currentLevel()] <= levels.debug) console.debug('[debug]', ...args);
  },
  info: (...args: unknown[]) => {
    if (levels[currentLevel()] <= levels.info) console.info('[info]', ...args);
  },
  warn: (...args: unknown[]) => {
    if (levels[currentLevel()] <= levels.warn) console.warn('[warn]', ...args);
  },
  error: (...args: unknown[]) => {
    if (levels[currentLevel()] <= levels.error) console.error('[error]', ...args);
  },
};
