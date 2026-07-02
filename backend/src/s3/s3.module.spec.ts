import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { S3Module } from './s3.module';
import { S3Service } from './s3.service';

describe('S3Module', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        S3Module,
      ],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide S3Service', () => {
    const service = module.get<S3Service>(S3Service);
    expect(service).toBeDefined();
  });

  it('should export S3Service', () => {
    const s3Module = module.get(S3Module);
    const exports = Reflect.getMetadata('exports', s3Module.constructor) as
      | unknown[]
      | undefined;
    expect(exports).toContain(S3Service);
  });
});
