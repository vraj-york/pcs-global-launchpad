import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RoleModule } from './role.module';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { PrismaService } from '../prisma';
import { S3Service } from '../s3';
import { AuthorizationGuard, CognitoAuthGuard, SuperAdminGuard } from '../auth';

describe('RoleModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    const mockPrisma = {
      role: { findMany: jest.fn(), count: jest.fn() },
      roleCategory: { findMany: jest.fn() },
    };

    const mockS3Service = {
      objectExists: jest.fn(),
      delete: jest.fn(),
      upload: jest.fn(),
      buildUserAvatarKey: jest.fn(),
      getUserAvatarsPrefix: jest.fn(),
      getPublicUrl: jest.fn(),
    };

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        RoleModule,
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

  it('should provide RoleController', async () => {
    const controller = await module.resolve<RoleController>(RoleController);
    expect(controller).toBeDefined();
  });

  it('should provide RoleService', async () => {
    const service = await module.resolve<RoleService>(RoleService);
    expect(service).toBeDefined();
  });

  it('should export RoleService', () => {
    const roleModule = module.get(RoleModule);
    const exports = Reflect.getMetadata('exports', roleModule.constructor) as
      | unknown[]
      | undefined;
    expect(exports).toContain(RoleService);
  });
});
