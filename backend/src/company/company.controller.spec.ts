/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto';
import { AuthorizationGuard, CognitoAuthGuard, SuperAdminGuard } from '../auth';
import { StripeService } from '../stripe';

describe('CompanyController', () => {
  let controller: CompanyController;
  let companyService: jest.Mocked<CompanyService>;

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
    submittedSteps: 1,
    status: 'INCOMPLETE',
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
    deletedAt: null as Date | null,
  };

  const mockCreateResponse = {
    success: true,
    message: 'Company created successfully',
    data: mockCompanyData,
  };

  const mockUpdateResponse = {
    success: true,
    message: 'Company updated successfully',
    data: { ...mockCompanyData, legalName: 'Updated Acme Company Inc.' },
  };

  const mockCreateDto: CreateCompanyDto = {
    legalName: 'Acme Company Inc.',
    companyType: 'Operating Company',
    officeType: 'Regional',
    industry: 'Technology',
    planId: '61fa4369-6fe6-4b35-8825-bcadcc8efac8',
    securityPosture: 'High',
    firstName: 'John',
    lastName: 'Doe',
    jobRole: 'Administrator',
    email: 'john.doe@example.com',
    workPhone: '+1-555-123-4567',
    phoneNo: '+1-555-999-0000',
    addressLine: '123 Main Street',
    state: 'California',
    city: 'San Francisco',
    country: 'United States',
    zip: '94105',
  };

  const mockUpdateDto: UpdateCompanyDto = {
    legalName: 'Updated Acme Company Inc.',
  };

  const mockListResponse = {
    success: true,
    message: 'Company list fetched successfully',
    data: { items: [mockCompanyData] },
  };

  const mockRemoveResponse = {
    success: true,
    message: 'Company deleted successfully',
    data: { ...mockCompanyData, deletedAt: new Date() },
  };

  beforeEach(async () => {
    const mockCompanyService = {
      findAllForRequester: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const mockStripeService = {
      createCheckoutSession: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyController],
      providers: [
        {
          provide: CompanyService,
          useValue: mockCompanyService,
        },
        {
          provide: StripeService,
          useValue: mockStripeService,
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

    controller = module.get<CompanyController>(CompanyController);
    companyService = module.get<CompanyService>(
      CompanyService,
    ) as jest.Mocked<CompanyService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    const listUser = { sub: 'sub-1', groups: ['SuperAdmin'] };

    it('should return company list for corporation', async () => {
      const corporationId = 'corp-uuid-1';
      companyService.findAllForRequester.mockResolvedValue(
        mockListResponse as Awaited<
          ReturnType<CompanyService['findAllForRequester']>
        >,
      );

      const result = await controller.list(corporationId, {}, listUser);

      expect(companyService.findAllForRequester).toHaveBeenCalledWith(
        corporationId,
        {},
        listUser.sub,
        listUser.groups,
      );
      expect(result).toMatchObject(mockListResponse as object);
    });

    it('should throw NotFoundException when corporation does not exist', async () => {
      companyService.findAllForRequester.mockRejectedValue(
        new NotFoundException(
          'Corporation with ID "non-existent-corp" not found',
        ),
      );

      await expect(
        controller.list('non-existent-corp', {}, listUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a company for a corporation and return success response', async () => {
      const corporationId = 'corp-uuid-1';
      companyService.create.mockResolvedValue(
        mockCreateResponse as unknown as Awaited<
          ReturnType<CompanyService['create']>
        >,
      );

      const result = await controller.create(corporationId, mockCreateDto);

      expect(companyService.create).toHaveBeenCalledWith(
        corporationId,
        mockCreateDto,
      );
      expect(result).toMatchObject(mockCreateResponse as object);
    });

    it('should throw NotFoundException when corporation does not exist', async () => {
      const corporationId = 'non-existent-corp-id';
      companyService.create.mockRejectedValue(
        new NotFoundException(
          `Corporation with ID "${corporationId}" not found`,
        ),
      );

      await expect(
        controller.create(corporationId, mockCreateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when legal name duplicate in corporation', async () => {
      companyService.create.mockRejectedValue(
        new ConflictException(
          'Company legal name must be unique within the corporation',
        ),
      );

      await expect(
        controller.create('corp-uuid-1', mockCreateDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when corporationId is missing', async () => {
      companyService.create.mockRejectedValue(
        new BadRequestException('Corporation ID is required'),
      );

      await expect(controller.create('', mockCreateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should rethrow error from service', async () => {
      companyService.create.mockRejectedValue(new Error('Create failed'));

      await expect(
        controller.create('corp-uuid-1', mockCreateDto),
      ).rejects.toThrow('Create failed');
    });
  });

  describe('update', () => {
    it('should update a company and return success response', async () => {
      const corporationId = 'corp-uuid-1';
      const companyId = 'company-uuid-1';
      companyService.update.mockResolvedValue(
        mockUpdateResponse as unknown as Awaited<
          ReturnType<CompanyService['update']>
        >,
      );

      const result = await controller.update(
        corporationId,
        companyId,
        mockUpdateDto,
      );

      expect(companyService.update).toHaveBeenCalledWith(
        corporationId,
        companyId,
        mockUpdateDto,
      );
      expect(result).toMatchObject(mockUpdateResponse as object);
    });

    it('should throw NotFoundException when company not found for corporation', async () => {
      const corporationId = 'corp-uuid-1';
      const companyId = 'non-existent-company-id';
      companyService.update.mockRejectedValue(
        new NotFoundException(
          `Company with ID "${companyId}" not found for corporation "${corporationId}"`,
        ),
      );

      await expect(
        controller.update(corporationId, companyId, mockUpdateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when legal name duplicate on update', async () => {
      companyService.update.mockRejectedValue(
        new ConflictException(
          'Company legal name must be unique within the corporation',
        ),
      );

      await expect(
        controller.update('corp-uuid-1', 'company-uuid-1', {
          ...mockUpdateDto,
          legalName: 'Duplicate Legal Name Inc.',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when corporationId or companyId missing', async () => {
      companyService.update.mockRejectedValue(
        new BadRequestException('Corporation ID is required'),
      );

      await expect(
        controller.update('', 'company-uuid-1', mockUpdateDto),
      ).rejects.toThrow(BadRequestException);

      companyService.update.mockRejectedValue(
        new BadRequestException('Company ID is required'),
      );

      await expect(
        controller.update('corp-uuid-1', '', mockUpdateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should rethrow error from service', async () => {
      companyService.update.mockRejectedValue(new Error('Update failed'));

      await expect(
        controller.update('corp-uuid-1', 'company-uuid-1', mockUpdateDto),
      ).rejects.toThrow('Update failed');
    });
  });

  describe('remove', () => {
    it('should soft-delete company and return success response', async () => {
      const corporationId = 'corp-uuid-1';
      const companyId = 'company-uuid-1';
      companyService.remove.mockResolvedValue(
        mockRemoveResponse as unknown as Awaited<
          ReturnType<CompanyService['remove']>
        >,
      );

      const result = await controller.remove(corporationId, companyId);

      expect(companyService.remove).toHaveBeenCalledWith(
        corporationId,
        companyId,
      );
      expect(result).toMatchObject(mockRemoveResponse as object);
    });

    it('should throw NotFoundException when company not found', async () => {
      companyService.remove.mockRejectedValue(
        new NotFoundException(
          'Company with ID "company-uuid-1" not found for corporation "corp-uuid-1"',
        ),
      );

      await expect(
        controller.remove('corp-uuid-1', 'company-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when cannot delete last company', async () => {
      companyService.remove.mockRejectedValue(
        new BadRequestException(
          'Cannot delete the only remaining company in the corporation',
        ),
      );

      await expect(
        controller.remove('corp-uuid-1', 'company-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
