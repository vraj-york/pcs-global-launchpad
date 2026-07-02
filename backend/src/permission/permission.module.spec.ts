import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PermissionModule } from './permission.module';
import { PermissionController } from './permission.controller';
import { PermissionService } from './permission.service';
import { PrismaService } from '../prisma';
import { AuthorizationGuard, CognitoAuthGuard, SuperAdminGuard } from '../auth';

describe('PermissionModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    const mockPrisma = {
      module: { findMany: jest.fn() },
    };

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        PermissionModule,
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

  it('should provide PermissionController', () => {
    const controller = module.get<PermissionController>(PermissionController);
    expect(controller).toBeDefined();
  });

  it('should provide PermissionService', () => {
    const service = module.get<PermissionService>(PermissionService);
    expect(service).toBeDefined();
  });

  it('should export PermissionService', () => {
    const permissionModule = module.get(PermissionModule);
    const exports = Reflect.getMetadata(
      'exports',
      permissionModule.constructor,
    ) as unknown[] | undefined;
    expect(exports).toContain(PermissionService);
  });
});
