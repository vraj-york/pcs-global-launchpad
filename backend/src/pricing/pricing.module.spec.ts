import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PricingModule } from './pricing.module';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { PrismaService } from '../prisma';
import { StripeService } from '../stripe';
import { AuthorizationGuard, CognitoAuthGuard } from '../auth';

describe('PricingModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    const mockPrisma = {
      planType: { findMany: jest.fn() },
    };
    const mockStripe = {
      retrieveConfiguredPrice: jest.fn(),
    };

    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true })],
      controllers: [PricingController],
      providers: [
        PricingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StripeService, useValue: mockStripe },
      ],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn((key: string) => {
          if (key === 'COGNITO_USER_POOL_ID') return 'us-east-1_testPool';
          return undefined;
        }),
      })
      .overrideGuard(CognitoAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthorizationGuard)
      .useValue({ canActivate: () => true })
      .compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide PricingController', () => {
    const controller = module.get<PricingController>(PricingController);
    expect(controller).toBeDefined();
  });

  it('should provide PricingService', () => {
    const service = module.get<PricingService>(PricingService);
    expect(service).toBeDefined();
  });

  it('should export PricingService', () => {
    const exports = Reflect.getMetadata('exports', PricingModule) as
      | unknown[]
      | undefined;
    expect(exports).toContain(PricingService);
  });
});
