/* eslint-disable @typescript-eslint/unbound-method */
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppKeyContactController } from './app-key-contact.controller';
import { AppKeyContactService } from './app-key-contact.service';
import { CreateAppKeyContactDto } from './dto/create-app-key-contact.dto';
import { ListAppKeyContactsQueryDto } from './dto/list-app-key-contacts-query.dto';
import { UpdateAppKeyContactDto } from './dto/update-app-key-contact.dto';
import { SendKeyContactInviteDto } from './dto/send-key-contact-invite.dto';
import { AuthorizationGuard, CognitoAuthGuard } from '../auth';
import { COGNITO_GROUP_NAMES } from './cognito-groups.constants';

describe('AppKeyContactController', () => {
  let controller: AppKeyContactController;
  let appKeyContactService: jest.Mocked<AppKeyContactService>;

  const mockApiResponse = {
    success: true,
    message: 'ok',
    data: {},
  };

  const sampleContactId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
  const sampleRoleId = '8f7e6d5c-4b3a-2918-7f6e-5d4c3b2a1908';

  beforeEach(async () => {
    const mockService = {
      findAllPaginated: jest.fn(),
      findAllPaginatedForRequester: jest.fn(),
      createForRequester: jest.fn(),
      importFromCsvFile: jest.fn(),
      sendInviteForRequester: jest.fn(),
      findById: jest.fn(),
      findByIdForRequester: jest.fn(),
      updateForRequester: jest.fn(),
      softDeleteForRequester: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppKeyContactController],
      providers: [
        {
          provide: AppKeyContactService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(CognitoAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthorizationGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AppKeyContactController>(AppKeyContactController);
    appKeyContactService = module.get(AppKeyContactService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    const listUser = { sub: 'cognito-sub-1', groups: ['SuperAdmin'] };

    it('should call findAllPaginatedForRequester with query and user', async () => {
      const query: ListAppKeyContactsQueryDto = { page: 1, limit: 10 };
      appKeyContactService.findAllPaginatedForRequester.mockResolvedValue(
        mockApiResponse as Awaited<
          ReturnType<AppKeyContactService['findAllPaginatedForRequester']>
        >,
      );

      const result = await controller.list(query, listUser);

      expect(
        appKeyContactService.findAllPaginatedForRequester,
      ).toHaveBeenCalledWith(query, listUser.sub, listUser.groups);
      expect(result).toMatchObject(mockApiResponse);
    });
  });

  describe('create', () => {
    it('should call createForRequester with DTO and user groups', async () => {
      const dto: CreateAppKeyContactDto = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        workPhone: '+1 555-0100',
        contactType: 'exec_sponsor',
      } as CreateAppKeyContactDto;
      const user = {
        sub: 'cognito-sub-1',
        groups: [COGNITO_GROUP_NAMES.CORPORATION_ADMIN],
      };

      appKeyContactService.createForRequester.mockResolvedValue(
        mockApiResponse as Awaited<
          ReturnType<AppKeyContactService['createForRequester']>
        >,
      );

      const result = await controller.create(dto, user);

      expect(appKeyContactService.createForRequester).toHaveBeenCalledWith(
        dto,
        user.sub,
        user.groups,
      );
      expect(result).toMatchObject(mockApiResponse);
    });
  });

  describe('importCsv', () => {
    it('should call importFromCsvFile with file, requester sub, and user groups', async () => {
      const file = {
        buffer: Buffer.from('x'),
        size: 1,
      } as Express.Multer.File;
      const user = { sub: 'cognito-sub-1', groups: ['SuperAdmin'] };
      appKeyContactService.importFromCsvFile.mockResolvedValue(
        mockApiResponse as Awaited<
          ReturnType<AppKeyContactService['importFromCsvFile']>
        >,
      );

      const result = await controller.importCsv(file, user);

      expect(appKeyContactService.importFromCsvFile).toHaveBeenCalledWith(
        file,
        user.sub,
        user.groups,
      );
      expect(result).toMatchObject(mockApiResponse);
    });
  });

  describe('sendInvite', () => {
    it('should call sendInviteForRequester with id, DTO, requester sub, and user groups', async () => {
      const dto: SendKeyContactInviteDto = { roleId: sampleRoleId };
      const user = {
        sub: 'cognito-sub-1',
        groups: [COGNITO_GROUP_NAMES.COMPANY_ADMIN],
      };
      appKeyContactService.sendInviteForRequester.mockResolvedValue(
        mockApiResponse as Awaited<
          ReturnType<AppKeyContactService['sendInviteForRequester']>
        >,
      );

      const result = await controller.sendInvite(sampleContactId, dto, user);

      expect(appKeyContactService.sendInviteForRequester).toHaveBeenCalledWith(
        sampleContactId,
        dto,
        user.sub,
        user.groups,
      );
      expect(result).toMatchObject(mockApiResponse);
    });
  });

  describe('getById', () => {
    it('should call findByIdForRequester', async () => {
      const detail = {
        success: true,
        message: 'm',
        data: { id: sampleContactId },
      };
      const user = {
        sub: 'cognito-sub-1',
        groups: [COGNITO_GROUP_NAMES.CORPORATION_ADMIN],
      };
      appKeyContactService.findByIdForRequester.mockResolvedValue(
        detail as Awaited<
          ReturnType<AppKeyContactService['findByIdForRequester']>
        >,
      );

      const result = await controller.getById(sampleContactId, user);

      expect(appKeyContactService.findByIdForRequester).toHaveBeenCalledWith(
        sampleContactId,
        user.sub,
        user.groups,
      );
      expect(result).toEqual(detail);
    });

    it('should rethrow NotFoundException from service', async () => {
      const user = { sub: 'cognito-sub-1', groups: ['SuperAdmin'] };
      appKeyContactService.findByIdForRequester.mockRejectedValue(
        new NotFoundException('Key contact not found'),
      );

      await expect(controller.getById(sampleContactId, user)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should call updateForRequester with id, DTO, and user groups', async () => {
      const dto: UpdateAppKeyContactDto = { firstName: 'Updated' };
      const user = {
        sub: 'cognito-sub-1',
        groups: [COGNITO_GROUP_NAMES.SUPER_ADMIN],
      };
      appKeyContactService.updateForRequester.mockResolvedValue(
        mockApiResponse as Awaited<
          ReturnType<AppKeyContactService['updateForRequester']>
        >,
      );

      const result = await controller.update(sampleContactId, dto, user);

      expect(appKeyContactService.updateForRequester).toHaveBeenCalledWith(
        sampleContactId,
        dto,
        user.sub,
        user.groups,
      );
      expect(result).toMatchObject(mockApiResponse);
    });
  });

  describe('softDelete', () => {
    it('should call softDeleteForRequester with id, requester sub, and user groups', async () => {
      const user = {
        sub: 'cognito-sub-1',
        groups: [COGNITO_GROUP_NAMES.COMPANY_ADMIN],
      };
      appKeyContactService.softDeleteForRequester.mockResolvedValue(
        mockApiResponse as Awaited<
          ReturnType<AppKeyContactService['softDeleteForRequester']>
        >,
      );

      const result = await controller.softDelete(sampleContactId, user);

      expect(appKeyContactService.softDeleteForRequester).toHaveBeenCalledWith(
        sampleContactId,
        user.sub,
        user.groups,
      );
      expect(result).toMatchObject(mockApiResponse);
    });
  });
});
