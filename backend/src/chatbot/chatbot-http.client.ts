import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CHATBOT_API_URL,
  CHATBOT_API_URL_MISSING_LOG_MSG,
  CHATBOT_GROWTH_SPARK_GENERATE_PATH,
  CHATBOT_GROWTH_SPARK_HTTP_ERROR_LOG_MSG,
  CHATBOT_GROWTH_SPARK_TIMEOUT_MS,
} from './chatbot.constants';
import type {
  ChatbotGrowthSparkGenerateRequest,
  ChatbotGrowthSparkGenerateResponse,
} from './chatbot.types';
import { GROWTH_SPARK_CHATBOT_UNAVAILABLE_MSG } from '../user/constants/growth-spark.constants';

@Injectable()
export class ChatbotHttpClient {
  private readonly logger = new Logger(ChatbotHttpClient.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Calls the chatbot service Growth Spark endpoint with the caller's access
   * token and returns the generated title and body. Throws when
   * `CHATBOT_API_URL` is unset, the request times out, or the response is
   * empty or non-success.
   */
  async generateGrowthSpark(
    accessToken: string,
    payload: ChatbotGrowthSparkGenerateRequest,
  ): Promise<ChatbotGrowthSparkGenerateResponse> {
    const baseUrl = this.config
      .get<string>(CHATBOT_API_URL)
      ?.replace(/\/$/, '');
    if (!baseUrl) {
      this.logger.error(CHATBOT_API_URL_MISSING_LOG_MSG);
      throw new InternalServerErrorException(
        GROWTH_SPARK_CHATBOT_UNAVAILABLE_MSG,
      );
    }

    const url = `${baseUrl}${CHATBOT_GROWTH_SPARK_GENERATE_PATH}`;
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      CHATBOT_GROWTH_SPARK_TIMEOUT_MS,
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(CHATBOT_GROWTH_SPARK_HTTP_ERROR_LOG_MSG, {
          status: response.status,
          body: errorBody.slice(0, 500),
        });
        throw new InternalServerErrorException(
          GROWTH_SPARK_CHATBOT_UNAVAILABLE_MSG,
        );
      }

      const data =
        (await response.json()) as ChatbotGrowthSparkGenerateResponse;
      if (!data?.body?.trim()) {
        throw new InternalServerErrorException(
          GROWTH_SPARK_CHATBOT_UNAVAILABLE_MSG,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error(CHATBOT_GROWTH_SPARK_HTTP_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(
        GROWTH_SPARK_CHATBOT_UNAVAILABLE_MSG,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
