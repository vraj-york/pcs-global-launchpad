import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  AuthorizationGuard,
  CoachGuard,
  CognitoAuthGuard,
  SuperAdminGuard,
} from '../../src/auth';
import { GlobalExceptionFilter } from '../../src/common';
import { CoachController } from '../../src/coach-dashboard/coach.controller';
import { CoachDashboardController } from '../../src/coach-dashboard/coach-dashboard.controller';
import { CoachDashboardService } from '../../src/coach-dashboard/coach-dashboard.service';
import { CoachIntegrationsController } from '../../src/coach-integrations/coach-integrations.controller';
import { CoachIntegrationsService } from '../../src/coach-integrations/coach-integrations.service';
import { CoachResourcesController } from '../../src/coach-resources/coach-resources.controller';
import { CoachResourcesService } from '../../src/coach-resources/coach-resources.service';
import { EarlyAccessController } from '../../src/early-access/early-access.controller';
import { EarlyAccessService } from '../../src/early-access/early-access.service';
import { PrismaModule, PrismaService } from '../../src/prisma';
import { ProductUpdatesController } from '../../src/product-updates/product-updates.controller';
import { ProductUpdatesService } from '../../src/product-updates/product-updates.service';
import { S3Service } from '../../src/s3/s3.service';
import { COGNITO_GROUP_NAMES } from '../../src/user/cognito-groups.constants';

export type CoachTestUser = {
  sub: string;
  email?: string;
};

export type CoachPersonaTestContext = {
  app: INestApplication<App>;
  prisma: PrismaService;
  coach: CoachTestUser;
  clientId: string;
  http: ReturnType<typeof request>;
};

export function nextWeekdayIso(weekOffset = 2): string {
  const date = new Date();
  date.setDate(date.getDate() + weekOffset * 7);
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }
  return date.toISOString().slice(0, 10);
}

export function mondayOfWeekIso(reference = new Date()): string {
  const date = new Date(reference);
  const day = date.getDay() === 0 ? 7 : date.getDay();
  date.setDate(date.getDate() - (day - 1));
  return date.toISOString().slice(0, 10);
}

export function firstDayOfMonthIso(reference = new Date()): string {
  return new Date(reference.getFullYear(), reference.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

export async function cleanupCoachPersonaData(
  prisma: PrismaService,
  coachId: string,
): Promise<void> {
  await prisma.waitlistEntry.deleteMany({ where: { userId: coachId } });
  await prisma.coachClientActivity.deleteMany({ where: { coachId } });
  await prisma.sessionNote.deleteMany({ where: { coachId } });
  await prisma.coachingSession.deleteMany({ where: { coachId } });
  await prisma.sessionRequest.deleteMany({ where: { coachId } });

  const availability = await prisma.coachAvailability.findUnique({
    where: { coachId },
  });
  if (availability) {
    await prisma.coachAvailabilityWindow.deleteMany({
      where: { availabilityId: availability.id },
    });
    await prisma.coachAvailability.delete({ where: { id: availability.id } });
  }
}

export async function resolveCoachPersonaUsers(
  prisma: PrismaService,
): Promise<{ coach: CoachTestUser; clientId: string }> {
  const users = await prisma.appUser.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
    take: 6,
    select: { cognitoSub: true, email: true },
  });

  if (users.length < 2) {
    throw new Error(
      'Coach persona e2e tests require at least two app users in the database.',
    );
  }

  return {
    coach: {
      sub: users[0].cognitoSub,
      email: users[0].email ?? undefined,
    },
    clientId: users[1].cognitoSub,
  };
}

export async function createCoachPersonaTestApp(
  coach: CoachTestUser,
): Promise<{ app: INestApplication<App>; prisma: PrismaService }> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
    controllers: [
      CoachDashboardController,
      CoachController,
      CoachResourcesController,
      CoachIntegrationsController,
      EarlyAccessController,
      ProductUpdatesController,
    ],
    providers: [
      CoachDashboardService,
      CoachResourcesService,
      CoachIntegrationsService,
      EarlyAccessService,
      ProductUpdatesService,
      Reflector,
      {
        provide: S3Service,
        useValue: {
          getPublicUrl: (key: string) => `https://cdn.example.com/${key}`,
        },
      },
    ],
  })
    .overrideGuard(CognitoAuthGuard)
    .useValue({
      canActivate: (context: {
        switchToHttp: () => { getRequest: () => Record<string, unknown> };
      }) => {
        const req = context.switchToHttp().getRequest();
        req.user = {
          sub: coach.sub,
          email: coach.email,
          groups: [COGNITO_GROUP_NAMES.COACH],
        };
        return true;
      },
    })
    .overrideGuard(CoachGuard)
    .useValue({ canActivate: () => true })
    .overrideGuard(AuthorizationGuard)
    .useValue({ canActivate: () => true })
    .overrideGuard(SuperAdminGuard)
    .useValue({ canActivate: () => true })
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => new BadRequestException(errors),
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.init();

  return {
    app,
    prisma: moduleRef.get(PrismaService),
  };
}

export async function bootstrapCoachPersonaTests(): Promise<CoachPersonaTestContext> {
  const prismaProbe = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
  }).compile();
  const prisma = prismaProbe.get(PrismaService);
  const { coach, clientId } = await resolveCoachPersonaUsers(prisma);
  await cleanupCoachPersonaData(prisma, coach.sub);
  await prismaProbe.close();

  const { app, prisma: appPrisma } = await createCoachPersonaTestApp(coach);

  return {
    app,
    prisma: appPrisma,
    coach,
    clientId,
    http: request(app.getHttpServer()),
  };
}

export async function teardownCoachPersonaTests(
  context: CoachPersonaTestContext,
): Promise<void> {
  await cleanupCoachPersonaData(context.prisma, context.coach.sub);
  await context.app.close();
}
