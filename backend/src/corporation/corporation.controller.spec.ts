/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CorporationController } from './corporation.controller';
import { CorporationService } from './corporation.service';
import {
  CreateCorporationDto,
  ListCorporationQueryDto,
  SuspendCloseCorporationDto,
  UpdateCorporationDto,
  UpdateStepsDto,
  UpsertKeyContactDto,
} from './dto';
import { AuthorizationGuard, CognitoAuthGuard, SuperAdminGuard } from '../auth';
import {
  BRAND_LOGO_FILE_REQUIRED_MSG,
  BRAND_LOGO_SINGLE_FILE_ONLY_MSG,
} from './constants';

describe('CorporationController', () => {
  let controller: CorporationController;
  let corporationService: jest.Mocked<CorporationService>;

  const mockActiveListResponse = {
    success: true,
    message: 'Active corporation list fetched successfully',
    data: [
      {
        id: 'corp-uuid-1',
        legalName: 'Acme Corporation Inc.',
        ownershipType: 'Private',
        dataResidencyRegion: 'US-East',
        corporationAdmin: {
          id: 'admin-uuid-1',
          corporationId: 'corp-uuid-1',
          firstName: 'Jane',
          lastName: 'Smith',
          nickname: null,
          role: 'Administrator',
          email: 'jane.smith@example.com',
          workPhone: '+1-555-123-4567',
          cellPhone: null,
        },
      },
    ],
  };

  const mockListResponse = {
    success: true,
    message: 'Corporation list fetched successfully',
    data: {
      items: [
        {
          id: 'corp-uuid-1',
          corporationCode: 1,
          legalName: 'Acme Corporation Inc.',
          dataResidencyRegion: 'US-East',
          status: 'active',
          submittedSteps: 1,
          mode: 'quick',
          corporationAdminName: 'Jane Smith' as string | null,
          corporationAdminEmail: 'jane.smith@example.com' as string | null,
          noOfCompanies: 2,
          createdAt: '01-15-2025',
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  const mockFindOneResponse = {
    success: true,
    message: 'Corporation details fetched successfully',
    data: {
      id: 'corp-uuid-1',
      corporationCode: 1,
      legalName: 'Acme Corporation Inc.',
      address: {},
      companies: [],
      appKeyContacts: [],
      corporationAdminAppUser: null,
    },
  };

  const mockCreateResponse = {
    success: true,
    message: 'Corporation created successfully',
    data: { id: 'corp-uuid-1', legalName: 'Acme Corporation Inc.' },
  };

  const mockUpdateResponse = {
    success: true,
    message: 'Corporation updated successfully',
    data: { id: 'corp-uuid-1', legalName: 'Updated Acme Inc.' },
  };

  const mockUpdateStepsResponse = {
    success: true,
    message: 'Corporation steps updated successfully',
    data: { id: 'corp-uuid-1', submittedSteps: 3 },
  };

  const mockCreateDto: CreateCorporationDto = {
    legalName: 'Acme Corporation Inc.',
    website: 'https://www.acme.com',
    dataResidencyRegion: 'US-East',
    ownershipType: 'Private',
    industry: 'Technology',
    phoneNo: '+1-555-123-4567',
    mode: 'quick',
    address: {
      addressLine: '123 Main St',
      state: 'CA',
      city: 'San Francisco',
      country: 'US',
      zip: '94105',
      timezone: 'America/Los_Angeles',
    },
    executiveSponsor: {
      firstName: 'Jane',
      lastName: 'Doe',
      jobRole: 'CEO',
      email: 'jane@acme.com',
      workPhone: '+1-555-111-2222',
    },
    corporationAdmin: {
      firstName: 'Jane',
      lastName: 'Smith',
      jobRole: 'Administrator',
      email: 'jane.smith@example.com',
      workPhone: '+1-555-123-4567',
    },
  };

  beforeEach(async () => {
    const mockCorporationService = {
      findAll: jest.fn(),
      findActiveList: jest.fn(),
      findAllIdAndName: jest.fn(),
      findOne: jest.fn(),
      findOneForRequester: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateSteps: jest.fn(),
      upsertKeyContact: jest.fn(),
      suspendOrClose: jest.fn(),
      uploadBrandLogo: jest.fn(),
      reinstate: jest.fn(),
      deleteBrandLogo: jest.fn(),
      getDashboardAnalyticsForRequester: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CorporationController],
      providers: [
        {
          provide: CorporationService,
          useValue: mockCorporationService,
        },
      ],
    })
      .overrideGuard(CognitoAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthorizationGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SuperAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CorporationController>(CorporationController);
    corporationService = module.get(CorporationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    it('should return paginated corporation list', async () => {
      const query: ListCorporationQueryDto = { page: 1, limit: 10 };
      corporationService.findAll.mockResolvedValue(mockListResponse);

      const result = await controller.list(query);

      expect(corporationService.findAll).toHaveBeenCalledWith(query);
      expect(result).toMatchObject(mockListResponse);
    });

    it('should rethrow error from service', async () => {
      corporationService.findAll.mockRejectedValue(new Error('DB error'));

      await expect(controller.list({})).rejects.toThrow('DB error');
    });
  });

  describe('listActive (GET /corporations/list)', () => {
    it('should return active corporations minimal list', async () => {
      corporationService.findActiveList.mockResolvedValue(
        mockActiveListResponse as Awaited<
          ReturnType<CorporationService['findActiveList']>
        >,
      );

      const result = await controller.listActive();

      expect(corporationService.findActiveList).toHaveBeenCalledWith();
      expect(result).toMatchObject(mockActiveListResponse as object);
    });

    it('should rethrow error from service', async () => {
      corporationService.findActiveList.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(controller.listActive()).rejects.toThrow('DB error');
    });
  });

  describe('listAll (GET /corporations/all)', () => {
    const mockIdNameListResponse = {
      success: true,
      message: 'All corporations fetched successfully',
      data: [
        { id: 'corp-1', legalName: 'Alpha Corp' },
        { id: 'corp-2', legalName: 'Beta Corp' },
      ],
    };

    it('should return all corporations with id and name only', async () => {
      corporationService.findAllIdAndName.mockResolvedValue(
        mockIdNameListResponse as Awaited<
          ReturnType<CorporationService['findAllIdAndName']>
        >,
      );

      const result = await controller.listAll();

      expect(corporationService.findAllIdAndName).toHaveBeenCalledWith();
      expect(result).toMatchObject(mockIdNameListResponse);
    });

    it('should rethrow error from service', async () => {
      corporationService.findAllIdAndName.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(controller.listAll()).rejects.toThrow('DB error');
    });
  });

  describe('findOne', () => {
    const superAdminUser = { sub: 'admin-sub', groups: ['SuperAdmin'] };

    it('should return corporation by id', async () => {
      corporationService.findOneForRequester.mockResolvedValue(
        mockFindOneResponse as unknown as Awaited<
          ReturnType<CorporationService['findOneForRequester']>
        >,
      );

      const result = await controller.findOne('corp-uuid-1', superAdminUser);

      expect(corporationService.findOneForRequester).toHaveBeenCalledWith(
        'corp-uuid-1',
        'admin-sub',
        ['SuperAdmin'],
      );
      expect(result).toMatchObject(mockFindOneResponse as object);
    });

    it('should throw NotFoundException when corporation not found', async () => {
      corporationService.findOneForRequester.mockRejectedValue(
        new NotFoundException('Corporation with ID "bad-id" not found'),
      );

      await expect(
        controller.findOne('bad-id', superAdminUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create corporation and return success response', async () => {
      corporationService.create.mockResolvedValue(
        mockCreateResponse as Awaited<ReturnType<CorporationService['create']>>,
      );

      const result = await controller.create(mockCreateDto);

      expect(corporationService.create).toHaveBeenCalledWith(mockCreateDto);
      expect(result).toMatchObject(mockCreateResponse as object);
    });

    it('should throw ConflictException when legal name already exists', async () => {
      corporationService.create.mockRejectedValue(
        new ConflictException(
          'A corporation with the legal name "Acme Corporation Inc." already exists',
        ),
      );

      await expect(controller.create(mockCreateDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('should update corporation and return success response', async () => {
      const updateDto: UpdateCorporationDto = {
        ...mockCreateDto,
        legalName: 'Updated Acme Inc.',
      };
      corporationService.update.mockResolvedValue(
        mockUpdateResponse as Awaited<ReturnType<CorporationService['update']>>,
      );

      const result = await controller.update('corp-uuid-1', updateDto);

      expect(corporationService.update).toHaveBeenCalledWith(
        'corp-uuid-1',
        updateDto,
      );
      expect(result).toMatchObject(mockUpdateResponse as object);
    });

    it('should throw NotFoundException when corporation not found', async () => {
      const updateDto: UpdateCorporationDto = {
        ...mockCreateDto,
        legalName: 'Updated',
      };
      corporationService.update.mockRejectedValue(
        new NotFoundException('Corporation with ID "bad-id" not found'),
      );

      await expect(controller.update('bad-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateSteps', () => {
    it('should update steps and return success response', async () => {
      const updateStepsDto: UpdateStepsDto = { type: 'confirmation' };
      corporationService.updateSteps.mockResolvedValue(
        mockUpdateStepsResponse as Awaited<
          ReturnType<CorporationService['updateSteps']>
        >,
      );

      const result = await controller.updateSteps(
        'corp-uuid-1',
        updateStepsDto,
      );

      expect(corporationService.updateSteps).toHaveBeenCalledWith(
        'corp-uuid-1',
        updateStepsDto,
      );
      expect(result).toMatchObject(mockUpdateStepsResponse as object);
    });

    it('should throw NotFoundException when corporation not found', async () => {
      corporationService.updateSteps.mockRejectedValue(
        new NotFoundException('Corporation with ID "bad-id" not found'),
      );

      await expect(
        controller.updateSteps('bad-id', { type: 'confirmation' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('upsertKeyContact', () => {
    const mockUpsertKeyContactResponse = {
      success: true,
      message: 'Key contact updated successfully',
      data: {
        id: 'key-contact-uuid',
        contactType: 'legal_compliance_contact',
        firstName: 'Jane',
        lastName: 'Doe',
        nickname: null,
        jobRole: 'Compliance Officer',
        email: 'jane.doe@example.com',
        workPhone: '+1-555-000-0000',
        cellPhone: null,
      },
    };

    it('should upsert key contact and return success response', async () => {
      const dto: UpsertKeyContactDto = {
        complianceContact: true,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        workPhone: '+1-555-000-0000',
      };
      corporationService.upsertKeyContact.mockResolvedValue(
        mockUpsertKeyContactResponse as Awaited<
          ReturnType<CorporationService['upsertKeyContact']>
        >,
      );

      const result = await controller.upsertKeyContact('corp-uuid-1', dto);

      expect(corporationService.upsertKeyContact).toHaveBeenCalledWith(
        'corp-uuid-1',
        dto,
      );
      expect(result).toMatchObject(mockUpsertKeyContactResponse as object);
    });

    it('should rethrow error from service', async () => {
      const dto: UpsertKeyContactDto = {
        complianceContact: false,
      };
      corporationService.upsertKeyContact.mockRejectedValue(
        new NotFoundException('Corporation with ID "bad-id" not found'),
      );

      await expect(controller.upsertKeyContact('bad-id', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('suspendOrClose', () => {
    const mockUser = {
      sub: 'super-admin-sub',
      groups: ['SuperAdmin'],
    };

    const mockSuspendCloseResponse = {
      success: true,
      message: 'Corporation status updated successfully',
      data: { id: 'corp-uuid-1', status: 'SUSPENDED' },
    };

    it('should suspend or close corporation and return success response', async () => {
      const dto: SuspendCloseCorporationDto = {
        status: 'SUSPENDED',
        suspendCloseReason: 'Customer request',
        suspendCloseAdditionalNotes: 'Follow up in 30 days',
      };
      corporationService.suspendOrClose.mockResolvedValue(
        mockSuspendCloseResponse as Awaited<
          ReturnType<CorporationService['suspendOrClose']>
        >,
      );

      const result = await controller.suspendOrClose(
        'corp-uuid-1',
        dto,
        mockUser,
      );

      expect(corporationService.suspendOrClose).toHaveBeenCalledWith(
        'corp-uuid-1',
        dto,
        {
          cognitoSub: mockUser.sub,
          groups: mockUser.groups,
        },
      );
      expect(result).toMatchObject(mockSuspendCloseResponse as object);
    });

    it('should rethrow error from service', async () => {
      const dto: SuspendCloseCorporationDto = {
        status: 'CLOSED',
        suspendCloseReason: 'Contract ended',
      };
      corporationService.suspendOrClose.mockRejectedValue(
        new BadRequestException('Corporation is already closed'),
      );

      await expect(
        controller.suspendOrClose('corp-uuid-1', dto, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('uploadBrandLogo', () => {
    const mockMulterFile = {
      fieldname: 'logo',
      originalname: 'brand.png',
      encoding: '7bit',
      mimetype: 'image/png',
      buffer: Buffer.from('png-bytes'),
      size: 9,
    } as Express.Multer.File;

    const mockUploadBrandLogoResponse = {
      success: true,
      message: 'Brand logo uploaded successfully',
      data: {
        brandLogo:
          'https://example.s3.amazonaws.com/corporation-brand-logos/corp-uuid-1.png',
      },
    };

    it('should upload brand logo and return success response', async () => {
      corporationService.uploadBrandLogo.mockResolvedValue(
        mockUploadBrandLogoResponse as Awaited<
          ReturnType<CorporationService['uploadBrandLogo']>
        >,
      );

      const result = await controller.uploadBrandLogo('corp-uuid-1', [
        mockMulterFile,
      ]);

      expect(corporationService.uploadBrandLogo).toHaveBeenCalledWith(
        'corp-uuid-1',
        mockMulterFile,
      );
      expect(result).toMatchObject(mockUploadBrandLogoResponse as object);
    });

    it('should throw BadRequestException when no files uploaded', async () => {
      await expect(
        controller.uploadBrandLogo('corp-uuid-1', []),
      ).rejects.toThrow(BRAND_LOGO_FILE_REQUIRED_MSG);
      await expect(
        controller.uploadBrandLogo(
          'corp-uuid-1',
          undefined as unknown as Express.Multer.File[],
        ),
      ).rejects.toThrow(BRAND_LOGO_FILE_REQUIRED_MSG);
      expect(corporationService.uploadBrandLogo).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when more than one file uploaded', async () => {
      await expect(
        controller.uploadBrandLogo('corp-uuid-1', [
          mockMulterFile,
          mockMulterFile,
        ]),
      ).rejects.toThrow(BRAND_LOGO_SINGLE_FILE_ONLY_MSG);
      expect(corporationService.uploadBrandLogo).not.toHaveBeenCalled();
    });

    it('should rethrow error from service', async () => {
      corporationService.uploadBrandLogo.mockRejectedValue(
        new NotFoundException('Corporation with ID "bad-id" not found'),
      );

      await expect(
        controller.uploadBrandLogo('bad-id', [mockMulterFile]),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reinstate', () => {
    const mockReinstateResponse = {
      success: true,
      message: 'Corporation reinstated successfully',
      data: { id: 'corp-uuid-1' },
    };

    it('should reinstate corporation and return success response', async () => {
      corporationService.reinstate.mockResolvedValue(
        mockReinstateResponse as Awaited<
          ReturnType<CorporationService['reinstate']>
        >,
      );

      const result = await controller.reinstate('corp-uuid-1');

      expect(corporationService.reinstate).toHaveBeenCalledWith('corp-uuid-1');
      expect(result).toMatchObject(mockReinstateResponse as object);
    });

    it('should rethrow error from service', async () => {
      corporationService.reinstate.mockRejectedValue(
        new BadRequestException(
          'Corporation can only be reinstated when status is suspended',
        ),
      );

      await expect(controller.reinstate('corp-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteBrandLogo', () => {
    const mockDeleteBrandLogoResponse = {
      success: true,
      message: 'Brand logo deleted successfully',
      data: undefined,
    };

    it('should delete brand logo and return success response', async () => {
      corporationService.deleteBrandLogo.mockResolvedValue(
        mockDeleteBrandLogoResponse,
      );

      const result = await controller.deleteBrandLogo('corp-uuid-1');

      expect(corporationService.deleteBrandLogo).toHaveBeenCalledWith(
        'corp-uuid-1',
      );
      expect(result).toMatchObject(mockDeleteBrandLogoResponse);
    });

    it('should throw NotFoundException when corporation not found', async () => {
      corporationService.deleteBrandLogo.mockRejectedValue(
        new NotFoundException('Corporation with ID "bad-id" not found'),
      );

      await expect(controller.deleteBrandLogo('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getDashboardAnalytics', () => {
    const authUser = {
      sub: 'cognito-sub-corp',
      groups: ['CorporationAdmin'],
    };

    it('should return dashboard analytics for CorporationAdmin', async () => {
      const mockResponse = {
        success: true,
        message: 'Corporation dashboard analytics fetched successfully.',
        data: {
          companies: {
            total: 0,
            active: 0,
            incomplete: 0,
            suspended: 0,
            closed: 0,
          },
          users: {
            total: 0,
            active: 0,
            pending: 0,
            blocked: 0,
            cancelled: 0,
            expired: 0,
            deleted: 0,
          },
          assessments: {
            completed: 0,
            inprogress: 0,
            avgTimeToComplete: null,
          },
        },
      };
      corporationService.getDashboardAnalyticsForRequester.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getDashboardAnalytics({}, authUser);

      expect(
        corporationService.getDashboardAnalyticsForRequester,
      ).toHaveBeenCalledWith({}, authUser.sub, authUser.groups);
      expect(result).toMatchObject(mockResponse);
    });
  });
});
