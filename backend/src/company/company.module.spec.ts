import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CompanyModule } from './company.module';
import { CompanyController } from './company.controller';
import { CompanyDirectoryController } from './company-directory.controller';
import { GetCompanyController } from './get-company.controller';
import { CompanyService } from './company.service';
import { PrismaService } from '../prisma';
import { S3Service } from '../s3';
import { AuthorizationGuard, CognitoAuthGuard, SuperAdminGuard } from '../auth';

describe('CompanyModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    const mockPrisma = {
      corporation: { findUnique: jest.fn(), update: jest.fn() },
      corporationCompany: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        CompanyModule,
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
      .useValue({
        getPublicUrl: jest.fn(),
        upload: jest.fn(),
        delete: jest.fn(),
        objectExists: jest.fn(),
        getBrandLogosPrefix: jest.fn(),
        buildBrandLogoKey: jest.fn(),
        getCompanyBrandLogosPrefix: jest.fn(),
        buildCompanyBrandLogoKey: jest.fn(),
      })
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

  it('should provide CompanyController', () => {
    const controller = module.get<CompanyController>(CompanyController);
    expect(controller).toBeDefined();
  });

  it('should provide GetCompanyController', () => {
    const controller = module.get<GetCompanyController>(GetCompanyController);
    expect(controller).toBeDefined();
  });

  it('should provide CompanyDirectoryController', () => {
    const controller = module.get<CompanyDirectoryController>(
      CompanyDirectoryController,
    );
    expect(controller).toBeDefined();
  });

  it('should provide CompanyService', () => {
    const service = module.get<CompanyService>(CompanyService);
    expect(service).toBeDefined();
  });

  it('should export CompanyService', () => {
    const companyModule = module.get(CompanyModule);
    const exports = Reflect.getMetadata(
      'exports',
      companyModule.constructor,
    ) as unknown[] | undefined;
    expect(exports).toContain(CompanyService);
  });
});
