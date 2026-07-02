import { AssessmentScoreStyleContext } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { ChatbotGrowthSparkGenerateRequest } from '../chatbot';
import { ChatbotHttpClient } from '../chatbot';
import { PrismaService } from '../prisma';
import { GrowthSparkService } from './growth-spark.service';
import {
  GROWTH_SPARK_FETCHED_SUCCESS_MSG,
  GROWTH_SPARK_NO_ASSESSMENT_MSG,
} from './constants/growth-spark.constants';

describe('GrowthSparkService', () => {
  let service: GrowthSparkService;
  let prisma: {
    appUser: { findFirst: jest.Mock };
    assessment: { findFirst: jest.Mock };
    userGrowthSparkIntro: { findUnique: jest.Mock; create: jest.Mock };
    growthSparkTemplate: { findFirst: jest.Mock };
  };
  let chatbotClient: { generateGrowthSpark: jest.Mock };

  const assessmentRow = {
    id: 'assessment-1',
    assessmentScore: {
      scoreBreakdown: { cred: 100, cgreen: 200, cgrey: 50 },
      styles: [
        {
          bspStyle: {
            styleNumber: 1,
            title: 'Pioneer',
            description: 'Ambitious and forward-looking.',
          },
        },
      ],
    },
  };

  beforeEach(async () => {
    prisma = {
      appUser: { findFirst: jest.fn() },
      assessment: { findFirst: jest.fn() },
      userGrowthSparkIntro: { findUnique: jest.fn(), create: jest.fn() },
      growthSparkTemplate: { findFirst: jest.fn() },
    };
    chatbotClient = { generateGrowthSpark: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GrowthSparkService,
        { provide: PrismaService, useValue: prisma },
        { provide: ChatbotHttpClient, useValue: chatbotClient },
      ],
    }).compile();

    service = module.get(GrowthSparkService);
  });

  it('returns template on first intro for assessment cycle', async () => {
    prisma.appUser.findFirst.mockResolvedValue({
      firstName: 'Alex',
      nickname: null,
      timezone: 'UTC',
    });
    prisma.assessment.findFirst.mockResolvedValue(assessmentRow);
    prisma.userGrowthSparkIntro.findUnique.mockResolvedValue(null);
    prisma.growthSparkTemplate.findFirst.mockResolvedValue({
      title: 'Daily Growth Spark',
      body: '{{firstName}}, welcome.\n{{teamContext}} need clarity.',
    });
    prisma.userGrowthSparkIntro.create.mockResolvedValue({ id: 'intro-1' });

    const result = await service.getMyGrowthSpark('user-1', 'token-1');

    expect(result.success).toBe(true);
    expect(result.message).toBe(GROWTH_SPARK_FETCHED_SUCCESS_MSG);
    expect(result.data?.source).toBe('template');
    expect(result.data?.body).toContain('Alex');
    expect(result.data?.body).toContain('some people on your team');
    expect(prisma.userGrowthSparkIntro.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', assessmentId: 'assessment-1' },
    });
    expect(chatbotClient.generateGrowthSpark).not.toHaveBeenCalled();
  });

  it('calls chatbot when intro was shown on a prior calendar day', async () => {
    prisma.appUser.findFirst.mockResolvedValue({
      firstName: 'Alex',
      nickname: null,
      timezone: 'UTC',
    });
    prisma.assessment.findFirst.mockResolvedValue(assessmentRow);
    prisma.userGrowthSparkIntro.findUnique.mockResolvedValue({
      id: 'intro-1',
      shownAt: new Date('2020-01-01T12:00:00Z'),
    });
    chatbotClient.generateGrowthSpark.mockResolvedValue({
      title: 'Daily Growth Spark',
      body: 'LLM spark body',
      source: 'llm',
      spark_date: '2026-06-15',
    });

    const result = await service.getMyGrowthSpark('user-1', 'token-1');

    expect(result.data?.source).toBe('llm');
    expect(result.data?.body).toBe('LLM spark body');
    expect(chatbotClient.generateGrowthSpark).toHaveBeenCalledTimes(1);
    const chatbotCalls = chatbotClient.generateGrowthSpark.mock.calls as Array<
      [string, ChatbotGrowthSparkGenerateRequest]
    >;
    const chatbotPayload = chatbotCalls[0]?.[1];
    expect(chatbotCalls[0]?.[0]).toBe('token-1');
    expect(chatbotPayload.display_name).toBe('Alex');
    expect(chatbotPayload.style_title).toBe('Pioneer');
    expect(chatbotPayload.dominant_mind_state).toBe('Affiliate');
    expect(chatbotPayload.spark_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns template again when intro was shown earlier the same day', async () => {
    prisma.appUser.findFirst.mockResolvedValue({
      firstName: 'Alex',
      nickname: null,
      timezone: 'UTC',
    });
    prisma.assessment.findFirst.mockResolvedValue(assessmentRow);
    prisma.userGrowthSparkIntro.findUnique.mockResolvedValue({
      id: 'intro-1',
      shownAt: new Date(),
    });
    prisma.growthSparkTemplate.findFirst.mockResolvedValue({
      title: 'Daily Growth Spark',
      body: '{{firstName}}, welcome.\n{{teamContext}} need clarity.',
    });

    const result = await service.getMyGrowthSpark('user-1', 'token-1');

    expect(result.data?.source).toBe('template');
    expect(result.data?.body).toContain('Alex');
    expect(chatbotClient.generateGrowthSpark).not.toHaveBeenCalled();
    expect(prisma.userGrowthSparkIntro.create).not.toHaveBeenCalled();
  });

  it('throws NotFound when no report-ready assessment exists', async () => {
    prisma.appUser.findFirst.mockResolvedValue({
      firstName: 'Alex',
      nickname: null,
      timezone: 'UTC',
    });
    prisma.assessment.findFirst.mockResolvedValue(null);

    await expect(service.getMyGrowthSpark('user-1', 'token-1')).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.getMyGrowthSpark('user-1', 'token-1')).rejects.toThrow(
      GROWTH_SPARK_NO_ASSESSMENT_MSG,
    );
  });

  it('queries overall style context for latest assessment', async () => {
    prisma.appUser.findFirst.mockResolvedValue({
      firstName: 'Alex',
      nickname: null,
      timezone: 'UTC',
    });
    prisma.assessment.findFirst.mockResolvedValue(assessmentRow);
    prisma.userGrowthSparkIntro.findUnique.mockResolvedValue({
      id: 'intro-1',
      shownAt: new Date('2020-01-01T12:00:00Z'),
    });
    chatbotClient.generateGrowthSpark.mockResolvedValue({
      title: 'Daily Growth Spark',
      body: 'Cached spark',
      source: 'cache',
      spark_date: '2026-06-15',
    });

    const result = await service.getMyGrowthSpark('user-1', 'token-1');

    type AssessmentFindFirstArgs = {
      select?: {
        assessmentScore?: {
          select?: {
            styles?: {
              where?: { context?: AssessmentScoreStyleContext };
            };
          };
        };
      };
    };

    const assessmentCalls = prisma.assessment.findFirst.mock.calls as Array<
      [AssessmentFindFirstArgs]
    >;
    const assessmentQuery = assessmentCalls[0]?.[0];

    expect(result.data?.source).toBe('cache');
    expect(
      assessmentQuery?.select?.assessmentScore?.select?.styles?.where?.context,
    ).toBe(AssessmentScoreStyleContext.overall);
  });
});
