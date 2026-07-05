import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';

const DEFAULT_RESOURCES = [
  {
    lead: 'Master your coaching workflow',
    connector: 'in',
    linkLabel: 'the Coach Playbook',
    href: '/support',
    icon: 'book-open',
    accent: 'green',
    sortOrder: 10,
  },
  {
    lead: 'Recap the latest platform updates',
    connector: 'on',
    linkLabel: 'Release notes',
    href: '/support',
    icon: 'sparkles',
    accent: 'blue',
    sortOrder: 20,
  },
  {
    lead: 'Learn coaching best practices',
    connector: 'in',
    linkLabel: 'the Help center',
    href: '/support',
    icon: 'life-buoy',
    accent: 'red',
    sortOrder: 30,
  },
] as const;

@Injectable()
export class CoachResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureDefaults(): Promise<void> {
    const count = await this.prisma.coachResource.count();
    if (count > 0) return;
    await this.prisma.coachResource.createMany({
      data: DEFAULT_RESOURCES.map((resource) => ({
        ...resource,
        audience: 'COACH',
        isPublished: true,
      })),
    });
  }

  async list(audience = 'COACH') {
    await this.ensureDefaults();
    return this.prisma.coachResource.findMany({
      where: {
        audience,
        isPublished: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(data: {
    lead: string;
    connector: string;
    linkLabel: string;
    href: string;
    icon: string;
    accent: string;
    audience?: string;
    isPublished?: boolean;
  }) {
    return this.prisma.coachResource.create({
      data: {
        ...data,
        audience: data.audience ?? 'COACH',
        isPublished: data.isPublished ?? true,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      lead: string;
      connector: string;
      linkLabel: string;
      href: string;
      icon: string;
      accent: string;
      audience: string;
      isPublished: boolean;
    }>,
  ) {
    const existing = await this.prisma.coachResource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Coach resource not found');
    return this.prisma.coachResource.update({ where: { id }, data });
  }

  async reorder(items: Array<{ id: string; sortOrder: number }>) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.coachResource.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
    return this.list();
  }

  async remove(id: string) {
    const existing = await this.prisma.coachResource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Coach resource not found');
    await this.prisma.coachResource.delete({ where: { id } });
    return { deleted: true };
  }
}
