import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { S3Service } from './s3.service';

const mockS3Send = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  const actual =
    jest.requireActual<typeof import('@aws-sdk/client-s3')>(
      '@aws-sdk/client-s3',
    );
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({ send: mockS3Send })),
  };
});

describe('S3Service', () => {
  let service: S3Service;
  let configService: jest.Mocked<ConfigService>;

  const defaultConfig = (key: string): string | undefined => {
    const config: Record<string, string> = {
      AWS_REGION: 'us-east-1',
      NODE_ENV: 'test',
      AWS_ACCESS_KEY_ID: 'test-key',
      AWS_SECRET_ACCESS_KEY: 'test-secret',
    };
    return config[key];
  };

  beforeEach(async () => {
    mockS3Send.mockReset().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => defaultConfig(key)),
          },
        },
      ],
    }).compile();

    service = module.get<S3Service>(S3Service);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPublicUrl', () => {
    it('should return CloudFront URL when CLOUDFRONT_URL is set', () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'CLOUDFRONT_URL') return 'https://cdn.example.com';
        return defaultConfig(key);
      });
      const url = service.getPublicUrl('corporation-brand-logos/logo.png');
      expect(url).toBe(
        'https://cdn.example.com/corporation-brand-logos/logo.png',
      );
    });

    it('should strip trailing slash from CLOUDFRONT_URL', () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'CLOUDFRONT_URL') return 'https://cdn.example.com/';
        return defaultConfig(key);
      });
      const url = service.getPublicUrl('path/to/key');
      expect(url).toBe('https://cdn.example.com/path/to/key');
    });

    it('should return S3 URL when CLOUDFRONT_URL is not set', () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'CLOUDFRONT_URL') return undefined;
        return defaultConfig(key);
      });
      const url = service.getPublicUrl('my-key');
      expect(url).toBe(
        'https://bsp-blueprint-test-frontend.s3.us-east-1.amazonaws.com/my-key',
      );
    });
  });

  describe('upload', () => {
    it('should send PutObjectCommand with correct params', async () => {
      const body = Buffer.from('test');
      await service.upload('path/file.txt', body, 'text/plain');

      expect(mockS3Send).toHaveBeenCalledTimes(1);
      const cmd = (mockS3Send.mock.calls as Array<[PutObjectCommand]>)[0][0];
      expect(cmd).toBeInstanceOf(PutObjectCommand);
      expect(cmd.input).toEqual({
        Bucket: 'bsp-blueprint-test-frontend',
        Key: 'path/file.txt',
        Body: body,
        ContentType: 'text/plain',
      });
    });
  });

  describe('objectExists', () => {
    it('should return true when HeadObject succeeds', async () => {
      mockS3Send.mockResolvedValue(undefined);

      const result = await service.objectExists('some-key');

      expect(result).toBe(true);
      expect(mockS3Send).toHaveBeenCalledWith(expect.any(HeadObjectCommand));
    });

    it('should return false when HeadObject throws', async () => {
      mockS3Send.mockRejectedValue(new Error('Not found'));

      const result = await service.objectExists('missing-key');

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should send DeleteObjectCommand with correct key', async () => {
      await service.delete('path/to/object');

      expect(mockS3Send).toHaveBeenCalledTimes(1);
      const cmd = (mockS3Send.mock.calls as Array<[DeleteObjectCommand]>)[0][0];
      expect(cmd).toBeInstanceOf(DeleteObjectCommand);
      expect(cmd.input).toMatchObject({
        Bucket: 'bsp-blueprint-test-frontend',
        Key: 'path/to/object',
      });
    });
  });

  describe('getBrandLogosPrefix', () => {
    it('should return corporation-brand-logos/ prefix', () => {
      expect(service.getBrandLogosPrefix()).toBe('corporation-brand-logos/');
    });
  });

  describe('buildBrandLogoKey', () => {
    it('should return full key with prefix and filename', () => {
      expect(service.buildBrandLogoKey('uuid.png')).toBe(
        'corporation-brand-logos/uuid.png',
      );
    });
  });

  describe('getCompanyBrandLogosPrefix', () => {
    it('should return company-brand-logos/ prefix', () => {
      expect(service.getCompanyBrandLogosPrefix()).toBe('company-brand-logos/');
    });
  });

  describe('buildCompanyBrandLogoKey', () => {
    it('should return full key with company prefix and filename', () => {
      expect(service.buildCompanyBrandLogoKey('uuid.png')).toBe(
        'company-brand-logos/uuid.png',
      );
    });
  });

  describe('getUserAvatarsPrefix', () => {
    it('should return app-user-avatars/ prefix', () => {
      expect(service.getUserAvatarsPrefix()).toBe('app-user-avatars/');
    });
  });

  describe('buildUserAvatarKey', () => {
    it('should return full key with user avatar prefix and filename', () => {
      expect(service.buildUserAvatarKey('uuid.png')).toBe(
        'app-user-avatars/uuid.png',
      );
    });
  });
});
