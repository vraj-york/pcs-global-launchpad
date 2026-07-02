import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AssessmentScoreStyleContext, AssessmentStatus } from '@prisma/client';
import { ChatbotHttpClient } from '../chatbot';
import { PrismaService } from '../prisma';
import { ResponseHelper, type ApiResponse } from '../common';
import {
  GROWTH_SPARK_FETCH_ERROR_LOG_MSG,
  GROWTH_SPARK_FETCH_FAILED_MSG,
  GROWTH_SPARK_FETCHED_SUCCESS_MSG,
  GROWTH_SPARK_NO_ASSESSMENT_MSG,
  GROWTH_SPARK_TEMPLATE_MISSING_MSG,
} from './constants/growth-spark.constants';
import {
  resolveDominantMindState,
  resolveSparkDate,
  resolveSparkDateFromInstant,
  substituteGrowthSparkTemplate,
  truncateStyleSummary,
} from './growth-spark.util';

export type GrowthSparkResponseData = {
  title: string;
  body: string;
  source: 'template' | 'llm' | 'cache';
  sparkDate: string;
  styleTitle: string | null;
};

@Injectable()
export class GrowthSparkService {
  private readonly logger = new Logger(GrowthSparkService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatbotClient: ChatbotHttpClient,
  ) {}

  async getMyGrowthSpark(
    cognitoSub: string,
    accessToken: string,
  ): Promise<ApiResponse<GrowthSparkResponseData>> {
    const trimmedSub = cognitoSub?.trim();
    if (!trimmedSub) {
      throw new NotFoundException(GROWTH_SPARK_NO_ASSESSMENT_MSG);
    }

    try {
      const user = await this.prisma.appUser.findFirst({
        where: { cognitoSub: trimmedSub, deletedAt: null },
        select: {
          firstName: true,
          nickname: true,
          timezone: true,
        },
      });

      if (!user) {
        throw new NotFoundException(GROWTH_SPARK_NO_ASSESSMENT_MSG);
      }

      const assessment = await this.prisma.assessment.findFirst({
        where: {
          userId: trimmedSub,
          status: AssessmentStatus.report_generated,
          assessmentScore: { isNot: null },
        },
        orderBy: [{ completedAt: 'desc' }, { startedAt: 'desc' }],
        select: {
          id: true,
          assessmentScore: {
            select: {
              scoreBreakdown: true,
              styles: {
                where: { context: AssessmentScoreStyleContext.overall },
                take: 1,
                select: {
                  bspStyle: {
                    select: {
                      styleNumber: true,
                      title: true,
                      description: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!assessment?.assessmentScore) {
        throw new NotFoundException(GROWTH_SPARK_NO_ASSESSMENT_MSG);
      }

      const overallStyle =
        assessment.assessmentScore.styles[0]?.bspStyle ?? null;
      if (!overallStyle) {
        throw new NotFoundException(GROWTH_SPARK_NO_ASSESSMENT_MSG);
      }

      const sparkDate = resolveSparkDate(user.timezone);
      const displayName =
        user.firstName?.trim() || user.nickname?.trim() || null;
      const styleTitle = overallStyle.title?.trim() || null;
      const styleSummary = truncateStyleSummary(overallStyle.description);
      const dominantMindState = resolveDominantMindState(
        assessment.assessmentScore.scoreBreakdown as Record<string, unknown>,
      );

      const introShown = await this.prisma.userGrowthSparkIntro.findUnique({
        where: {
          userId_assessmentId: {
            userId: trimmedSub,
            assessmentId: assessment.id,
          },
        },
      });

      const introSparkDate = introShown
        ? resolveSparkDateFromInstant(introShown.shownAt, user.timezone)
        : null;
      const isTemplateDay =
        !introShown ||
        (introSparkDate !== null && introSparkDate === sparkDate);

      if (isTemplateDay) {
        const template = await this.prisma.growthSparkTemplate.findFirst({
          where: {
            styleNumber: overallStyle.styleNumber,
            isActive: true,
          },
        });

        if (!template) {
          throw new NotFoundException(GROWTH_SPARK_TEMPLATE_MISSING_MSG);
        }

        const body = substituteGrowthSparkTemplate(template.body, displayName);

        if (!introShown) {
          await this.prisma.userGrowthSparkIntro.create({
            data: {
              userId: trimmedSub,
              assessmentId: assessment.id,
            },
          });
        }

        return ResponseHelper.success(GROWTH_SPARK_FETCHED_SUCCESS_MSG, {
          title: template.title,
          body,
          source: 'template',
          sparkDate,
          styleTitle,
        });
      }

      const chatbotResult = await this.chatbotClient.generateGrowthSpark(
        accessToken,
        {
          display_name: displayName,
          style_title: styleTitle,
          style_summary: styleSummary,
          dominant_mind_state: dominantMindState,
          spark_date: sparkDate,
          timezone: user.timezone,
        },
      );

      const source =
        chatbotResult.source === 'cache' ? 'cache' : ('llm' as const);

      return ResponseHelper.success(GROWTH_SPARK_FETCHED_SUCCESS_MSG, {
        title: chatbotResult.title,
        body: chatbotResult.body,
        source,
        sparkDate: chatbotResult.spark_date,
        styleTitle,
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      this.logger.error(GROWTH_SPARK_FETCH_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(GROWTH_SPARK_FETCH_FAILED_MSG);
    }
  }
}
