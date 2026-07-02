import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GetCompanyController } from './get-company.controller';
import {
  UpdateCompanyStep1Dto,
  UpsertCompanyPlanSeatDto,
  UpsertCompanyConfigurationDto,
  UpsertCompanyKeyContactsDto,
} from './dto';
import { CompanyService } from './company.service';
import { AuthorizationGuard, CognitoAuthGuard, SuperAdminGuard } from '../auth';

describe('GetCompanyController', () => {
  let controller: GetCompanyController;
  let findOneForRequesterMock: jest.Mock;
  let findActiveCompaniesForRequesterMock: jest.Mock;
  let findAllCompaniesForRequesterMock: jest.Mock;
  let updateCompanyStep1Mock: jest.Mock;
  let upsertCompanyPlanSeatMock: jest.Mock;
  let upsertCompanyConfigurationMock: jest.Mock;
  let upsertKeyContactsMock: jest.Mock;
  let deleteCompanyBrandLogoMock: jest.Mock;
  let confirmCompanyMock: jest.Mock;
  let suspendCompanyMock: jest.Mock;
  let reinstateCompanyMock: jest.Mock;
  let getDashboardAnalyticsForCompanyAdminMock: jest.Mock;

  const mockCompanyData = {
    id: 'company-uuid-1',
    corporationId: 'corp-uuid-1',
    legalName: 'Acme Company Inc.',
    companyType: 'LLC',
    officeType: 'Headquarters',
    industry: 'Technology',
    sameAsCorpAdmin: false,
    planId: '61fa4369-6fe6-4b35-8825-bcadcc8efac8',
    securityPosture: 'High',
    plan: {
      id: 'plan-uuid',
      planTypeId: 'type-1',
      employeeRangeMin: 1,
      employeeRangeMax: 100,
    },
  };

  const mockFindOneResponse = {
    success: true,
    message: 'Company details fetched successfully',
    data: mockCompanyData,
  };

  const mockActiveCompaniesResponse = {
    success: true,
    message: 'Active companies fetched successfully',
    data: {
      items: [
        {
          id: 'company-uuid-1',
          corporationId: 'corp-uuid-1',
          legalName: 'Acme Company Inc.',
        },
      ],
    },
  };

  const mockStep1Dto: UpdateCompanyStep1Dto = { legalName: 'Updated' };

  const mockUpdateStep1Response = {
    success: true,
    message: 'Company updated successfully',
    data: { id: 'company-uuid-1', legalName: 'Updated' },
  };

  const mockPlanSeatDto: UpsertCompanyPlanSeatDto = {
    zeroTrial: false,
    planLevel: '61fa4369-6fe6-4b35-8825-bcadcc8efac8',
    trialStartDate: '2025-01-01',
    trialEndDate: '2025-01-15',
    planPrice: 99.99,
    invoiceAmount: 99.99,
  };

  const mockPlanSeatResponse = {
    success: true,
    message: 'Company plan seat saved successfully',
    data: { id: 'seat-uuid-1' },
  };

  const mockConfigurationDto: UpsertCompanyConfigurationDto = {
    authMethod: 'Email & Password',
    passwordPolicy: 'Standard (8+ Characters & Mixed case)',
    mfa: 'Optional',
    sessionTimeout: '60 min',
    securityPosture: 'Standard',
    primaryLanguage: 'English (US)',
  };

  const mockConfigurationResponse = {
    success: true,
    message: 'Company configuration saved successfully',
    data: { id: 'config-uuid-1', companyId: 'company-uuid-1' },
  };

  const mockDeleteBrandLogoResponse = {
    success: true,
    message: 'Company brand logo deleted successfully',
    data: undefined,
  };

  const mockConfirmationResponse = {
    success: true,
    message: 'Company confirmation completed successfully',
    data: {
      id: 'company-uuid-1',
      status: 'ACTIVE',
      submittedSteps: 5,
    },
  };

  const mockSuspendResponse = {
    success: true,
    message: 'Company suspended successfully',
    data: {
      id: 'company-uuid-1',
      status: 'SUSPENDED',
    },
  };

  const mockReinstateResponse = {
    success: true,
    message: 'Company reinstated successfully',
    data: {
      id: 'company-uuid-1',
      status: 'ACTIVE',
    },
  };

  const mockKeyContactsBody: UpsertCompanyKeyContactsDto = {
    keyContacts: [
      {
        contactType: 'finance_billing_contact',
        available: true,
        firstName: 'Jane',
        lastName: 'Doe',
        nickname: undefined,
        jobRole: 'Billing lead',
        email: 'jane.doe@example.com',
        workPhone: '+1-555-123-4567',
        cellPhone: '+1-555-987-6543',
      },
    ],
  };

  const mockKeyContactsResponse = {
    success: true,
    message: 'Company key contacts updated successfully',
    data: {},
  };

  beforeEach(async () => {
    findOneForRequesterMock = jest.fn();
    findActiveCompaniesForRequesterMock = jest.fn();
    findAllCompaniesForRequesterMock = jest.fn();
    updateCompanyStep1Mock = jest.fn();
    upsertCompanyPlanSeatMock = jest.fn();
    upsertCompanyConfigurationMock = jest.fn();
    upsertKeyContactsMock = jest.fn();
    deleteCompanyBrandLogoMock = jest.fn();
    confirmCompanyMock = jest.fn();
    suspendCompanyMock = jest.fn();
    reinstateCompanyMock = jest.fn();
    getDashboardAnalyticsForCompanyAdminMock = jest.fn();
    const mockCompanyService = {
      findOneForRequester: findOneForRequesterMock,
      findActiveCompaniesForRequester: findActiveCompaniesForRequesterMock,
      findAllCompaniesForRequester: findAllCompaniesForRequesterMock,
      updateCompanyStep1: updateCompanyStep1Mock,
      upsertCompanyPlanSeat: upsertCompanyPlanSeatMock,
      upsertCompanyConfiguration: upsertCompanyConfigurationMock,
      upsertKeyContacts: upsertKeyContactsMock,
      deleteCompanyBrandLogo: deleteCompanyBrandLogoMock,
      confirmCompany: confirmCompanyMock,
      suspendCompany: suspendCompanyMock,
      reinstateCompany: reinstateCompanyMock,
      getDashboardAnalyticsForCompanyAdmin:
        getDashboardAnalyticsForCompanyAdminMock,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GetCompanyController],
      providers: [
        {
          provide: CompanyService,
          useValue: mockCompanyService,
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

    controller = module.get<GetCompanyController>(GetCompanyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listActiveCompanies', () => {
    const authUser = { sub: 'cognito-sub-1', groups: ['SuperAdmin'] };

    it('should return active company id, corporationId, and legalName', async () => {
      findActiveCompaniesForRequesterMock.mockResolvedValue(
        mockActiveCompaniesResponse as Awaited<
          ReturnType<CompanyService['findActiveCompaniesForRequester']>
        >,
      );

      const result = await controller.listActiveCompanies(authUser);

      expect(findActiveCompaniesForRequesterMock).toHaveBeenCalledWith(
        authUser.sub,
        authUser.groups,
      );
      expect(result).toMatchObject(mockActiveCompaniesResponse as object);
    });
  });

  describe('getDashboardAnalytics', () => {
    const authUser = {
      sub: 'cognito-sub-co',
      groups: ['CompanyAdmin'],
    };

    it('should return dashboard analytics for CompanyAdmin', async () => {
      const mockResponse = {
        success: true,
        message: 'Company dashboard analytics fetched successfully.',
        data: {
          users: {
            total: 2,
            active: 1,
            pending: 1,
            blocked: 0,
            cancelled: 0,
            expired: 0,
            deleted: 0,
          },
          assessments: {
            completed: 1,
            inprogress: 0,
            avgTimeToComplete: 1.5,
          },
        },
      };
      getDashboardAnalyticsForCompanyAdminMock.mockResolvedValue(mockResponse);

      const result = await controller.getDashboardAnalytics(
        { timeFilter: 'last7Days' },
        authUser,
      );

      expect(getDashboardAnalyticsForCompanyAdminMock).toHaveBeenCalledWith(
        authUser.sub,
        authUser.groups,
        { timeFilter: 'last7Days' },
      );
      expect(result).toMatchObject(mockResponse);
    });
  });

  describe('listAll', () => {
    const authUser = { sub: 'cognito-sub-1', groups: ['SuperAdmin'] };
    const corporationId = '550e8400-e29b-41d4-a716-446655440000';
    const mockAllCompaniesResponse = {
      success: true,
      message: 'All companies fetched successfully',
      data: [
        {
          id: 'company-uuid-1',
          legalName: 'Acme Company Inc.',
        },
      ],
    };

    it('should return all companies for authorized caller', async () => {
      findAllCompaniesForRequesterMock.mockResolvedValue(
        mockAllCompaniesResponse as Awaited<
          ReturnType<CompanyService['findAllCompaniesForRequester']>
        >,
      );

      const result = await controller.listAll({ corporationId }, authUser);

      expect(findAllCompaniesForRequesterMock).toHaveBeenCalledWith(
        corporationId,
        authUser.sub,
        authUser.groups,
      );
      expect(result).toMatchObject(mockAllCompaniesResponse);
    });

    it('should rethrow error from service', async () => {
      findAllCompaniesForRequesterMock.mockRejectedValue(new Error('DB error'));

      await expect(
        controller.listAll({ corporationId }, authUser),
      ).rejects.toThrow('DB error');
    });
  });

  describe('findOne', () => {
    const authUser = { sub: 'cognito-sub-1', groups: ['SuperAdmin'] };

    it('should return company details when found', async () => {
      const companyId = 'company-uuid-1';
      findOneForRequesterMock.mockResolvedValue(
        mockFindOneResponse as Awaited<
          ReturnType<CompanyService['findOneForRequester']>
        >,
      );

      const result = await controller.findOne(companyId, authUser);

      expect(findOneForRequesterMock).toHaveBeenCalledWith(
        companyId,
        authUser.sub,
        authUser.groups,
      );
      expect(result).toMatchObject(mockFindOneResponse as object);
    });

    it('should throw NotFoundException when company not found', async () => {
      findOneForRequesterMock.mockRejectedValue(
        new NotFoundException('Company with ID "company-uuid-1" not found'),
      );

      await expect(
        controller.findOne('company-uuid-1', authUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when companyId is missing', async () => {
      findOneForRequesterMock.mockRejectedValue(
        new BadRequestException('Company ID is required'),
      );

      await expect(controller.findOne('', authUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('upsertKeyContacts (POST .../corporations/companies/:companyId/key-contacts)', () => {
    it('should call upsertKeyContacts with companyId and body.keyContacts', async () => {
      upsertKeyContactsMock.mockResolvedValue(
        mockKeyContactsResponse as Awaited<
          ReturnType<CompanyService['upsertKeyContacts']>
        >,
      );

      const result = await controller.upsertKeyContacts(
        'company-uuid-1',
        mockKeyContactsBody,
      );

      expect(upsertKeyContactsMock).toHaveBeenCalledWith(
        'company-uuid-1',
        mockKeyContactsBody.keyContacts,
      );
      expect(result).toMatchObject(mockKeyContactsResponse as object);
    });

    it('should throw NotFoundException when company not found', async () => {
      upsertKeyContactsMock.mockRejectedValue(
        new NotFoundException('Company with ID "company-uuid-1" not found'),
      );

      await expect(
        controller.upsertKeyContacts('company-uuid-1', mockKeyContactsBody),
      ).rejects.toThrow(NotFoundException);
    });

    it('should rethrow error from service', async () => {
      upsertKeyContactsMock.mockRejectedValue(new Error('DB error'));

      await expect(
        controller.upsertKeyContacts('company-uuid-1', mockKeyContactsBody),
      ).rejects.toThrow('DB error');
    });
  });

  describe('upsertPlanSeat', () => {
    it('should call upsertCompanyPlanSeat and return response', async () => {
      upsertCompanyPlanSeatMock.mockResolvedValue(
        mockPlanSeatResponse as Awaited<
          ReturnType<CompanyService['upsertCompanyPlanSeat']>
        >,
      );

      const result = await controller.upsertPlanSeat(
        'company-uuid-1',
        mockPlanSeatDto,
      );

      expect(upsertCompanyPlanSeatMock).toHaveBeenCalledWith(
        'company-uuid-1',
        mockPlanSeatDto,
      );
      expect(result).toMatchObject(mockPlanSeatResponse as object);
    });
  });

  describe('confirmCompany', () => {
    it('should call confirmCompany and return response', async () => {
      confirmCompanyMock.mockResolvedValue(
        mockConfirmationResponse as Awaited<
          ReturnType<CompanyService['confirmCompany']>
        >,
      );

      const result = await controller.confirmCompany('company-uuid-1');

      expect(confirmCompanyMock).toHaveBeenCalledWith('company-uuid-1');
      expect(result).toMatchObject(mockConfirmationResponse as object);
    });
  });

  describe('suspendCompany', () => {
    it('should call suspendCompany and return response', async () => {
      suspendCompanyMock.mockResolvedValue(
        mockSuspendResponse as Awaited<
          ReturnType<CompanyService['suspendCompany']>
        >,
      );

      const body = {
        suspendReason: 'Contract ended',
        suspendAdditionalNotes: 'Follow up in 30 days',
      };
      const result = await controller.suspendCompany('company-uuid-1', body);

      expect(suspendCompanyMock).toHaveBeenCalledWith('company-uuid-1', body);
      expect(result).toMatchObject(mockSuspendResponse as object);
    });
  });

  describe('reinstateCompany', () => {
    it('should call reinstateCompany and return response', async () => {
      reinstateCompanyMock.mockResolvedValue(
        mockReinstateResponse as Awaited<
          ReturnType<CompanyService['reinstateCompany']>
        >,
      );

      const result = await controller.reinstateCompany('company-uuid-1');

      expect(reinstateCompanyMock).toHaveBeenCalledWith('company-uuid-1');
      expect(result).toMatchObject(mockReinstateResponse as object);
    });
  });

  describe('deleteBrandLogo', () => {
    it('should call deleteCompanyBrandLogo and return response', async () => {
      deleteCompanyBrandLogoMock.mockResolvedValue(
        mockDeleteBrandLogoResponse as Awaited<
          ReturnType<CompanyService['deleteCompanyBrandLogo']>
        >,
      );

      const result = await controller.deleteBrandLogo('company-uuid-1');

      expect(deleteCompanyBrandLogoMock).toHaveBeenCalledWith('company-uuid-1');
      expect(result).toMatchObject(mockDeleteBrandLogoResponse as object);
    });
  });

  describe('upsertConfiguration', () => {
    it('should call upsertCompanyConfiguration and return response', async () => {
      upsertCompanyConfigurationMock.mockResolvedValue(
        mockConfigurationResponse as Awaited<
          ReturnType<CompanyService['upsertCompanyConfiguration']>
        >,
      );

      const result = await controller.upsertConfiguration(
        'company-uuid-1',
        mockConfigurationDto,
        undefined,
      );

      expect(upsertCompanyConfigurationMock).toHaveBeenCalledWith(
        'company-uuid-1',
        mockConfigurationDto,
        undefined,
      );
      expect(result).toMatchObject(mockConfigurationResponse as object);
    });
  });

  describe('updateCompanyStep1', () => {
    it('should call updateCompanyStep1 and return response', async () => {
      updateCompanyStep1Mock.mockResolvedValue(
        mockUpdateStep1Response as Awaited<
          ReturnType<CompanyService['updateCompanyStep1']>
        >,
      );

      const result = await controller.updateCompanyStep1(
        'company-uuid-1',
        mockStep1Dto,
      );

      expect(updateCompanyStep1Mock).toHaveBeenCalledWith(
        'company-uuid-1',
        mockStep1Dto,
      );
      expect(result).toMatchObject(mockUpdateStep1Response as object);
    });
  });
});
