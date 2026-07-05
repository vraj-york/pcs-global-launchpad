import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';

const DEFAULT_UPDATES = [
  { label: 'Session insights', href: '/support', sortOrder: 10 },
  { label: 'Client progress reports', href: '/support', sortOrder: 20 },
  { label: 'Smart scheduling', href: '/support', sortOrder: 30 },
] as const;

@Injectable()
export class ProductUpdatesService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureDefaults(): Promise<void> {
    const count = await this.prisma.productUpdate.count();
    if (count > 0) return;
    await this.prisma.productUpdate.createMany({
      data: DEFAULT_UPDATES.map((item) => ({
        ...item,
        status: 'RELEASED',
        audience: 'COACH',
      })),
    });
  }

  async list(audience = 'COACH', status = 'RELEASED') {
    await this.ensureDefaults();
    return this.prisma.productUpdate.findMany({
      where: { audience, status },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(data: {
    label: string;
    href: string;
    audience?: string;
    status?: string;
    sortOrder?: number;
  }) {
    return this.prisma.productUpdate.create({
      data: {
        audience: data.audience ?? 'COACH',
        status: data.status ?? 'RELEASED',
        sortOrder: data.sortOrder ?? 0,
        label: data.label,
        href: data.href,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      label: string;
      href: string;
      audience: string;
      status: string;
      sortOrder: number;
    }>,
  ) {
    const existing = await this.prisma.productUpdate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product update not found');
    return this.prisma.productUpdate.update({ where: { id }, data });
  }

  async remove(id: string) {
    const existing = await this.prisma.productUpdate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product update not found');
    await this.prisma.productUpdate.delete({ where: { id } });
    return { deleted: true };
  }
}
