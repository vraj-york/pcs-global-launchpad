import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';

const DEFAULT_FEATURES = [
  {
    featureKey: 'ai-session-summaries',
    title: 'AI-assisted session summaries',
    description: 'Generate structured coaching summaries after each session.',
    sortOrder: 10,
  },
  {
    featureKey: 'client-progress-insights',
    title: 'Client progress insights',
    description: 'Surface momentum, goals, and follow-through at a glance.',
    sortOrder: 20,
  },
  {
    featureKey: 'smart-scheduling-reminders',
    title: 'Smart scheduling & reminders',
    description: 'Reduce back-and-forth with automated reminders and slot suggestions.',
    sortOrder: 30,
  },
] as const;

@Injectable()
export class EarlyAccessService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureDefaults(): Promise<void> {
    const count = await this.prisma.betaFeature.count();
    if (count > 0) return;
    await this.prisma.betaFeature.createMany({
      data: DEFAULT_FEATURES.map((feature) => ({
        ...feature,
        audience: 'COACH',
        isPublished: true,
      })),
    });
  }

  async listFeatures() {
    await this.ensureDefaults();
    return this.prisma.betaFeature.findMany({
      where: { audience: 'COACH', isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async joinWaitlist(userId: string, featureKey?: string) {
    await this.ensureDefaults();
    const feature =
      (featureKey
        ? await this.prisma.betaFeature.findUnique({ where: { featureKey } })
        : await this.prisma.betaFeature.findFirst({
            where: { audience: 'COACH', isPublished: true },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          })) ?? null;

    if (!feature) {
      throw new NotFoundException('Early-access feature not found');
    }

    return this.prisma.waitlistEntry.upsert({
      where: {
        featureId_userId: {
          featureId: feature.id,
          userId,
        },
      },
      update: { status: 'ACTIVE' },
      create: {
        featureId: feature.id,
        userId,
        status: 'ACTIVE',
      },
    });
  }

  async leaveWaitlist(userId: string, featureKey: string) {
    const feature = await this.prisma.betaFeature.findUnique({ where: { featureKey } });
    if (!feature) throw new NotFoundException('Early-access feature not found');
    const entry = await this.prisma.waitlistEntry.findUnique({
      where: {
        featureId_userId: {
          featureId: feature.id,
          userId,
        },
      },
    });
    if (!entry) throw new NotFoundException('Waitlist entry not found');
    await this.prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: { status: 'REMOVED' },
    });
    return { removed: true };
  }

  async listWaitlist() {
    await this.ensureDefaults();
    return this.prisma.waitlistEntry.findMany({
      include: {
        feature: true,
        user: {
          select: {
            cognitoSub: true,
            email: true,
            firstName: true,
            lastName: true,
            nickname: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateFeature(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      audience: string;
      sortOrder: number;
      isPublished: boolean;
    }>,
  ) {
    const existing = await this.prisma.betaFeature.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Early-access feature not found');
    return this.prisma.betaFeature.update({ where: { id }, data });
  }
}
