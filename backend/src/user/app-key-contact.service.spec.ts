import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppKeyContactService } from './app-key-contact.service';
import { PrismaService } from '../prisma';
import { EmailService } from '../email';
import {
  APP_KEY_CONTACTS_LIST_FETCHED_SUCCESS_MSG,
  APP_KEY_CONTACTS_LIST_FORBIDDEN_MSG,
  APP_KEY_CONTACT_CREATE_COMPANY_ADMIN_WRONG_COMPANY_MSG,
  APP_KEY_CONTACT_CREATE_CORP_ADMIN_WRONG_CORP_MSG,
  APP_KEY_CONTACT_CREATE_FORBIDDEN_MSG,
  APP_KEY_CONTACT_EMAIL_DUPLICATE_MSG,
  APP_KEY_CONTACT_NOT_FOUND_MSG,
  APP_KEY_CONTACT_INVITE_FORBIDDEN_MSG,
  APP_KEY_CONTACT_INVITE_CORP_ADMIN_WRONG_CORP_MSG,
  APP_KEY_CONTACT_INVITE_COMPANY_ADMIN_WRONG_COMPANY_MSG,
  APP_KEY_CONTACT_SOFT_DELETE_FORBIDDEN_MSG,
  APP_KEY_CONTACT_SOFT_DELETE_CORP_ADMIN_WRONG_CORP_MSG,
  APP_KEY_CONTACT_SOFT_DELETE_COMPANY_ADMIN_WRONG_COMPANY_MSG,
  APP_KEY_CONTACT_UPDATE_COMPANY_ADMIN_WRONG_COMPANY_MSG,
  APP_KEY_CONTACT_UPDATE_CORP_ADMIN_WRONG_CORP_MSG,
  APP_KEY_CONTACT_UPDATE_FORBIDDEN_MSG,
  APP_KEY_CONTACT_UPDATE_EMPTY_BODY_MSG,
  APP_KEY_CONTACT_VIEW_FETCHED_SUCCESS_MSG,
} from './constants/app-key-contact.constants';
import { KEY_CONTACT_BULK_IMPORT_FORBIDDEN_MSG } from './constants/app-key-contact-bulk.constants';
import { COGNITO_GROUP_NAMES } from './cognito-groups.constants';
import { CreateAppKeyContactDto } from './dto/create-app-key-contact.dto';
import { UpdateAppKeyContactDto } from './dto/update-app-key-contact.dto';

describe('AppKeyContactService', () => {
  let service: AppKeyContactService;
  let prisma: {
    appKeyContact: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    appUser: { findFirst: jest.Mock; findMany: jest.Mock };
    corporationCompany: { findFirst: jest.Mock; findMany: jest.Mock };
    corporation: { findUnique: jest.Mock; findFirst: jest.Mock };
    userCompanyAccess: { findMany: jest.Mock };
  };

  const configMock = {
    get: jest.fn((key: string) => {
      if (key === 'COGNITO_USER_POOL_ID') {
        return 'us-east-1_testPoolId';
      }
      if (key === 'AWS_REGION') {
        return 'us-east-1';
      }
      return undefined;
    }),
  };

  const contactId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

  beforeEach(async () => {
    prisma = {
      appKeyContact: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      appUser: { findFirst: jest.fn(), findMany: jest.fn() },
      corporationCompany: { findFirst: jest.fn(), findMany: jest.fn() },
      corporation: { findUnique: jest.fn(), findFirst: jest.fn() },
      userCompanyAccess: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppKeyContactService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configMock },
        { provide: EmailService, useValue: {} },
      ],
    }).compile();

    service = module.get(AppKeyContactService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should throw NotFound when contact is missing', async () => {
      prisma.appKeyContact.findFirst.mockResolvedValue(null);

      await expect(service.findById(contactId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById(contactId)).rejects.toThrow(
        APP_KEY_CONTACT_NOT_FOUND_MSG,
      );
    });

    it('should return key contact detail when found', async () => {
      const createdAt = new Date('2025-02-01T10:00:00.000Z');
      prisma.appKeyContact.findFirst.mockResolvedValue({
        id: contactId,
        contactCode: 1,
        status: 'Active',
        firstName: 'F',
        lastName: 'L',
        nickname: null,
        email: 'c@d.com',
        contactType: 'exec_sponsor',
        jobRole: null,
        workPhone: '1',
        cellPhone: null,
        timezone: 'UTC',
        createdAt,
        corporation: { legalName: 'Corp', corporationCode: 'C1' },
        company: { legalName: 'Co' },
      });

      const result = await service.findById(contactId);

      expect(result.success).toBe(true);
      expect(result.message).toBe(APP_KEY_CONTACT_VIEW_FETCHED_SUCCESS_MSG);
      expect(result.data).toMatchObject({
        id: contactId,
        email: 'c@d.com',
        corporation: { legalName: 'Corp', corporationCode: 'C1' },
        company: { legalName: 'Co' },
      });
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated list', async () => {
      prisma.appKeyContact.count.mockResolvedValue(0);
      prisma.appKeyContact.findMany.mockResolvedValue([]);

      const result = await service.findAllPaginated({ page: 1, limit: 10 });

      expect(result.success).toBe(true);
      expect(result.message).toBe(APP_KEY_CONTACTS_LIST_FETCHED_SUCCESS_MSG);
      expect(prisma.appKeyContact.count).toHaveBeenCalled();
      expect(prisma.appKeyContact.findMany).toHaveBeenCalled();
    });

    it('should map InternalServerError when count fails', async () => {
      prisma.appKeyContact.count.mockRejectedValue(new Error('db'));

      await expect(
        service.findAllPaginated({ page: 1, limit: 10 }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findAllPaginatedForRequester', () => {
    it('should forbid callers who are not admin roles', async () => {
      await expect(
        service.findAllPaginatedForRequester({}, 'sub-1', ['User']),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.findAllPaginatedForRequester({}, 'sub-1', ['User']),
      ).rejects.toThrow(APP_KEY_CONTACTS_LIST_FORBIDDEN_MSG);
    });

    it('should delegate to findAllPaginated for SuperAdmin', async () => {
      prisma.appKeyContact.count.mockResolvedValue(0);
      prisma.appKeyContact.findMany.mockResolvedValue([]);

      await service.findAllPaginatedForRequester(
        { page: 1, limit: 10 },
        'sub-sa',
        [COGNITO_GROUP_NAMES.SUPER_ADMIN],
      );

      expect(prisma.appKeyContact.count).toHaveBeenCalled();
    });

    it('should scope list to corporation for CorporationAdmin', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        corporationId: 'corp-1',
      });
      prisma.appKeyContact.count.mockResolvedValue(0);
      prisma.appKeyContact.findMany.mockResolvedValue([]);

      await service.findAllPaginatedForRequester(
        { page: 1, limit: 10 },
        'sub-corp',
        [COGNITO_GROUP_NAMES.CORPORATION_ADMIN],
      );

      expect(prisma.appKeyContact.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            corporationId: { in: ['corp-1'] },
          }) as Record<string, unknown>,
        }),
      );
    });

    it('should scope list to admin companies for CompanyAdmin', async () => {
      prisma.userCompanyAccess.findMany.mockResolvedValue([
        { companyId: 'co-1' },
        { companyId: 'co-2' },
      ]);
      prisma.appKeyContact.count.mockResolvedValue(0);
      prisma.appKeyContact.findMany.mockResolvedValue([]);

      await service.findAllPaginatedForRequester(
        { page: 1, limit: 10 },
        'sub-co',
        [COGNITO_GROUP_NAMES.COMPANY_ADMIN],
      );

      expect(prisma.appKeyContact.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: { in: ['co-1', 'co-2'] },
          }) as Record<string, unknown>,
        }),
      );
    });
  });

  describe('create', () => {
    it('should throw Conflict when email is used by another contact', async () => {
      prisma.appKeyContact.findFirst.mockResolvedValue({ id: 'other-id' });

      const dto: CreateAppKeyContactDto = {
        firstName: 'A',
        lastName: 'B',
        email: 'dup@example.com',
        workPhone: '1',
        contactType: 'exec_sponsor',
      } as CreateAppKeyContactDto;

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      await expect(service.create(dto)).rejects.toThrow(
        APP_KEY_CONTACT_EMAIL_DUPLICATE_MSG,
      );
    });
  });

  describe('createForRequester', () => {
    const baseDto: CreateAppKeyContactDto = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      workPhone: '+1 555-0100',
      contactType: 'exec_sponsor',
    } as CreateAppKeyContactDto;

    it('should forbid callers who are not SuperAdmin, CorporationAdmin, or CompanyAdmin', async () => {
      await expect(
        service.createForRequester(baseDto, 'sub-1', ['User']),
      ).rejects.toMatchObject({
        constructor: ForbiddenException,
        message: APP_KEY_CONTACT_CREATE_FORBIDDEN_MSG,
      });
    });

    it('should forbid CorporationAdmin when corporationId is outside their corporation', async () => {
      prisma.appUser.findFirst.mockResolvedValue({ corporationId: 'corp-1' });

      await expect(
        service.createForRequester(
          { ...baseDto, corporationId: 'corp-other' },
          'sub-corp-admin',
          [COGNITO_GROUP_NAMES.CORPORATION_ADMIN],
        ),
      ).rejects.toMatchObject({
        constructor: ForbiddenException,
        message: APP_KEY_CONTACT_CREATE_CORP_ADMIN_WRONG_CORP_MSG,
      });
    });

    it('should forbid CompanyAdmin when companyId is outside their admin companies', async () => {
      prisma.userCompanyAccess.findMany.mockResolvedValue([
        { companyId: 'company-1' },
      ]);

      await expect(
        service.createForRequester(
          { ...baseDto, companyId: 'company-other' },
          'sub-comp-admin',
          [COGNITO_GROUP_NAMES.COMPANY_ADMIN],
        ),
      ).rejects.toMatchObject({
        constructor: ForbiddenException,
        message: APP_KEY_CONTACT_CREATE_COMPANY_ADMIN_WRONG_COMPANY_MSG,
      });
    });
  });

  describe('sendInviteForRequester', () => {
    const inviteDto = { roleId: '8f7e6d5c-4b3a-2918-7f6e-5d4c3b2a1908' };

    it('should forbid callers who are not SuperAdmin, CorporationAdmin, or CompanyAdmin', async () => {
      await expect(
        service.sendInviteForRequester(contactId, inviteDto, 'sub-1', ['User']),
      ).rejects.toMatchObject({
        constructor: ForbiddenException,
        message: APP_KEY_CONTACT_INVITE_FORBIDDEN_MSG,
      });
    });

    it('should forbid CorporationAdmin when contact corporationId is outside their corporation', async () => {
      prisma.appKeyContact.findFirst.mockResolvedValue({
        corporationId: 'corp-other',
        companyId: null,
      });
      prisma.appUser.findFirst.mockResolvedValue({ corporationId: 'corp-1' });

      await expect(
        service.sendInviteForRequester(contactId, inviteDto, 'sub-corp-admin', [
          COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
        ]),
      ).rejects.toMatchObject({
        constructor: ForbiddenException,
        message: APP_KEY_CONTACT_INVITE_CORP_ADMIN_WRONG_CORP_MSG,
      });
    });

    it('should forbid CompanyAdmin when contact companyId is outside their admin companies', async () => {
      prisma.appKeyContact.findFirst.mockResolvedValue({
        corporationId: 'corp-1',
        companyId: 'company-other',
      });
      prisma.userCompanyAccess.findMany.mockResolvedValue([
        { companyId: 'company-1' },
      ]);

      await expect(
        service.sendInviteForRequester(contactId, inviteDto, 'sub-comp-admin', [
          COGNITO_GROUP_NAMES.COMPANY_ADMIN,
        ]),
      ).rejects.toMatchObject({
        constructor: ForbiddenException,
        message: APP_KEY_CONTACT_INVITE_COMPANY_ADMIN_WRONG_COMPANY_MSG,
      });
    });
  });

  describe('importFromCsvFile', () => {
    const csvHeader =
      'firstName,lastName,email,workPhone,contactType,corporationName,companyName\n';
    const baseRow =
      'Jane,Doe,jane@example.com,+1 555-0100,exec_sponsor,Other Corp,\n';

    it('should forbid callers who are not SuperAdmin, CorporationAdmin, or CompanyAdmin', async () => {
      const file = {
        buffer: Buffer.from('firstName,lastName\n'),
        size: 20,
      } as Express.Multer.File;

      await expect(
        service.importFromCsvFile(file, 'sub-1', ['User']),
      ).rejects.toMatchObject({
        constructor: ForbiddenException,
        message: KEY_CONTACT_BULK_IMPORT_FORBIDDEN_MSG,
      });
    });

    it('should fail BSP row when CorporationAdmin corporationName resolves outside their corporation', async () => {
      prisma.appKeyContact.findMany.mockResolvedValue([]);
      prisma.appUser.findMany.mockResolvedValue([]);
      prisma.corporation.findFirst.mockResolvedValue({ id: 'corp-other' });
      prisma.appUser.findFirst.mockResolvedValue({ corporationId: 'corp-1' });

      const file = {
        buffer: Buffer.from(csvHeader + baseRow),
        size: csvHeader.length + baseRow.length,
      } as Express.Multer.File;

      const result = await service.importFromCsvFile(file, 'sub-corp-admin', [
        COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
      ]);

      expect((result.data as { failed: any[] }).failed).toEqual([
        expect.objectContaining({
          row: 2,
          message: APP_KEY_CONTACT_CREATE_CORP_ADMIN_WRONG_CORP_MSG,
        }),
      ]);
      expect(prisma.appKeyContact.create).not.toHaveBeenCalled();
    });

    it('should fail BSP row when CompanyAdmin companyName resolves outside their admin companies', async () => {
      prisma.appKeyContact.findMany.mockResolvedValue([]);
      prisma.appUser.findMany.mockResolvedValue([]);
      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: 'company-other',
        corporationId: 'corp-1',
      });
      prisma.userCompanyAccess.findMany.mockResolvedValue([
        { companyId: 'company-1' },
      ]);

      const file = {
        buffer: Buffer.from(
          csvHeader +
            'Jane,Doe,jane@example.com,+1 555-0100,exec_sponsor,Acme Corp,Other Company\n',
        ),
        size: 200,
      } as Express.Multer.File;

      const result = await service.importFromCsvFile(file, 'sub-comp-admin', [
        COGNITO_GROUP_NAMES.COMPANY_ADMIN,
      ]);

      expect((result.data as { failed: any[] }).failed).toEqual([
        expect.objectContaining({
          row: 2,
          message: APP_KEY_CONTACT_CREATE_COMPANY_ADMIN_WRONG_COMPANY_MSG,
        }),
      ]);
      expect(prisma.appKeyContact.create).not.toHaveBeenCalled();
    });
  });

  describe('softDeleteForRequester', () => {
    it('should forbid callers who are not SuperAdmin, CorporationAdmin, or CompanyAdmin', async () => {
      await expect(
        service.softDeleteForRequester(contactId, 'sub-1', ['User']),
      ).rejects.toMatchObject({
        constructor: ForbiddenException,
        message: APP_KEY_CONTACT_SOFT_DELETE_FORBIDDEN_MSG,
      });
    });

    it('should forbid CorporationAdmin when contact corporationId is outside their corporation', async () => {
      prisma.appKeyContact.findFirst.mockResolvedValue({
        corporationId: 'corp-other',
        companyId: null,
      });
      prisma.appUser.findFirst.mockResolvedValue({ corporationId: 'corp-1' });

      await expect(
        service.softDeleteForRequester(contactId, 'sub-corp-admin', [
          COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
        ]),
      ).rejects.toMatchObject({
        constructor: ForbiddenException,
        message: APP_KEY_CONTACT_SOFT_DELETE_CORP_ADMIN_WRONG_CORP_MSG,
      });
    });

    it('should forbid CompanyAdmin when contact companyId is outside their admin companies', async () => {
      prisma.appKeyContact.findFirst.mockResolvedValue({
        corporationId: 'corp-1',
        companyId: 'company-other',
      });
      prisma.userCompanyAccess.findMany.mockResolvedValue([
        { companyId: 'company-1' },
      ]);

      await expect(
        service.softDeleteForRequester(contactId, 'sub-comp-admin', [
          COGNITO_GROUP_NAMES.COMPANY_ADMIN,
        ]),
      ).rejects.toMatchObject({
        constructor: ForbiddenException,
        message: APP_KEY_CONTACT_SOFT_DELETE_COMPANY_ADMIN_WRONG_COMPANY_MSG,
      });
    });
  });

  describe('updateForRequester', () => {
    it('should forbid callers who are not SuperAdmin, CorporationAdmin, or CompanyAdmin', async () => {
      await expect(
        service.updateForRequester(
          contactId,
          { firstName: 'Updated' },
          'sub-1',
          ['User'],
        ),
      ).rejects.toMatchObject({
        constructor: ForbiddenException,
        message: APP_KEY_CONTACT_UPDATE_FORBIDDEN_MSG,
      });
    });

    it('should forbid CorporationAdmin when corporationId is outside their corporation', async () => {
      prisma.appUser.findFirst.mockResolvedValue({ corporationId: 'corp-1' });

      await expect(
        service.updateForRequester(
          contactId,
          { corporationId: 'corp-other' },
          'sub-corp-admin',
          [COGNITO_GROUP_NAMES.CORPORATION_ADMIN],
        ),
      ).rejects.toMatchObject({
        constructor: ForbiddenException,
        message: APP_KEY_CONTACT_UPDATE_CORP_ADMIN_WRONG_CORP_MSG,
      });
    });

    it('should forbid CompanyAdmin when companyId is outside their admin companies', async () => {
      prisma.userCompanyAccess.findMany.mockResolvedValue([
        { companyId: 'company-1' },
      ]);

      await expect(
        service.updateForRequester(
          contactId,
          { companyId: 'company-other' },
          'sub-comp-admin',
          [COGNITO_GROUP_NAMES.COMPANY_ADMIN],
        ),
      ).rejects.toMatchObject({
        constructor: ForbiddenException,
        message: APP_KEY_CONTACT_UPDATE_COMPANY_ADMIN_WRONG_COMPANY_MSG,
      });
    });

    it('should allow CompanyAdmin when only corporationId is sent without companyId', async () => {
      prisma.userCompanyAccess.findMany.mockResolvedValue([
        { companyId: 'company-1' },
      ]);
      const updateSpy = jest
        .spyOn(service, 'update')
        .mockResolvedValue({ success: true, message: 'ok', data: {} });

      await service.updateForRequester(
        contactId,
        { corporationId: 'corp-outside-scope' },
        'sub-comp-admin',
        [COGNITO_GROUP_NAMES.COMPANY_ADMIN],
      );

      expect(updateSpy).toHaveBeenCalledWith(contactId, {
        corporationId: 'corp-outside-scope',
      });
      updateSpy.mockRestore();
    });
  });

  describe('update', () => {
    it('should throw BadRequest when body has no defined fields', async () => {
      const dto = {} as UpdateAppKeyContactDto;

      await expect(service.update(contactId, dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(contactId, dto)).rejects.toThrow(
        APP_KEY_CONTACT_UPDATE_EMPTY_BODY_MSG,
      );
    });
  });
});
