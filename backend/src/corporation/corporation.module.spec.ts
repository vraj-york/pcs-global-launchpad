import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CorporationModule } from './corporation.module';
import { CorporationController } from './corporation.controller';
import { CorporationService } from './corporation.service';
import { PrismaService } from '../prisma';
import { S3Service } from '../s3';
import { S3Module } from '../s3/s3.module';
import { AuthorizationGuard, CognitoAuthGuard, SuperAdminGuard } from '../auth';

describe('CorporationModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    const mockPrisma = {
      corporation: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockS3Service = {
      objectExists: jest.fn(),
      delete: jest.fn(),
      upload: jest.fn(),
      buildBrandLogoKey: jest.fn(),
      getBrandLogosPrefix: jest.fn(),
      getPublicUrl: jest.fn(),
    };

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        CorporationModule,
        S3Module,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn((key: string) => {
          if (key === 'COGNITO_USER_POOL_ID') return 'us-east-1_testPool';
          return undefined;
        }),
      })
      .overrideProvider(S3Service)
      .useValue(mockS3Service)
      .overrideGuard(CognitoAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthorizationGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SuperAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide CorporationController', () => {
    const controller = module.get<CorporationController>(CorporationController);
    expect(controller).toBeDefined();
  });

  it('should provide CorporationService', () => {
    const service = module.get<CorporationService>(CorporationService);
    expect(service).toBeDefined();
  });

  it('should export CorporationService', () => {
    const corporationModule = module.get(CorporationModule);
    const exports = Reflect.getMetadata(
      'exports',
      corporationModule.constructor,
    ) as unknown[] | undefined;
    expect(exports).toContain(CorporationService);
  });
});
