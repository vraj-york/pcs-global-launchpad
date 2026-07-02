export type ChatbotGrowthSparkGenerateRequest = {
  display_name?: string | null;
  style_title?: string | null;
  style_summary?: string | null;
  dominant_mind_state?: string | null;
  spark_date: string;
  timezone?: string | null;
  team_context?: string | null;
};

export type ChatbotGrowthSparkGenerateResponse = {
  title: string;
  body: string;
  source: 'llm' | 'cache';
  spark_date: string;
};
