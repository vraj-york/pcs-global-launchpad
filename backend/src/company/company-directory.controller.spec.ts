/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { CompanyDirectoryController } from './company-directory.controller';
import { CompanyService } from './company.service';
import { ListCompanyDirectoryQueryDto } from './dto';
import { AuthorizationGuard, CognitoAuthGuard } from '../auth';

describe('CompanyDirectoryController', () => {
  let controller: CompanyDirectoryController;
  let companyService: jest.Mocked<CompanyService>;

  const mockFilterOptionsResponse = {
    success: true,
    message: 'Company directory filter options fetched successfully',
    data: {
      statuses: [
        { value: 'ACTIVE', label: 'Active' },
        { value: 'SUSPENDED', label: 'Suspended' },
        { value: 'INCOMPLETE', label: 'Incomplete' },
        { value: 'CLOSED', label: 'Closed' },
      ],
      corporations: [
        { id: 'corp-uuid-1', label: 'Acme Corporation (CORP-001)' },
      ],
      plans: [
        { value: 'monthly', label: 'BSPBlueprint' },
        { value: 'annual', label: 'BSP Assessment' },
      ],
    },
  };

  const mockDirectoryResponse = {
    success: true,
    message: 'Company directory list fetched successfully',
    data: {
      items: [
        {
          id: 'company-uuid-1',
          companyId: 'COMP-001',
          name: 'New York HQ',
          location: 'New York, North America',
          status: 'ACTIVE',
          assignedCorporation: { id: 'corp-uuid-1', name: 'Acme Corporation' },
          plan: {
            id: 'plan-uuid-1',
            planTypeId: 'monthly',
            name: 'BSPBlueprint',
            customerType: 'Monthly',
          },
          createdAt: new Date('2025-01-15'),
          updatedAt: new Date('2025-01-20'),
        },
      ],
      pagination: { total: 14, page: 1, pageSize: 10, totalPages: 2 },
    },
  };

  beforeEach(async () => {
    const mockCompanyService = {
      findAllPaginatedForRequester: jest.fn(),
      findAllPaginated: jest.fn(),
      getDirectoryFilterOptionsForRequester: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyDirectoryController],
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
      .compile();

    controller = module.get<CompanyDirectoryController>(
      CompanyDirectoryController,
    );
    companyService = module.get<CompanyService>(
      CompanyService,
    ) as jest.Mocked<CompanyService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getFilterOptions', () => {
    const filterUser = { sub: 'sub-1', groups: ['CompanyAdmin'] };

    it('should return filter dropdown options for status, corporations, and plans', async () => {
      companyService.getDirectoryFilterOptionsForRequester.mockResolvedValue(
        mockFilterOptionsResponse as Awaited<
          ReturnType<CompanyService['getDirectoryFilterOptionsForRequester']>
        >,
      );

      const result = await controller.getFilterOptions(filterUser);

      expect(
        companyService.getDirectoryFilterOptionsForRequester,
      ).toHaveBeenCalledWith(filterUser.groups);
      expect(result).toMatchObject(mockFilterOptionsResponse as object);
      expect(result.success).toBe(true);
      const data = result.data as {
        statuses: unknown[];
        corporations: unknown[];
        plans: unknown[];
      };
      expect(data.statuses).toHaveLength(4);
      expect(data.corporations).toHaveLength(1);
      expect(data.plans).toHaveLength(2);
    });

    it('should rethrow error from service', async () => {
      companyService.getDirectoryFilterOptionsForRequester.mockRejectedValue(
        new InternalServerErrorException(
          'Failed to fetch company directory filter options. Please try again later.',
        ),
      );

      await expect(controller.getFilterOptions(filterUser)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
  describe('getFormOptions', () => {
    it('should return ownership types, company types, and office types for Add Company form', () => {
      const result = controller.getFormOptions();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Form options fetched successfully');
      expect(result.data).toHaveProperty('ownershipTypes');
      expect(result.data).toHaveProperty('companyTypes');
      expect(result.data).toHaveProperty('officeTypes');
      expect(
        (result.data as { ownershipTypes: string[] }).ownershipTypes,
      ).toEqual(['Wholly Owned', 'Majority', 'Affiliate', 'Franchise']);
      expect((result.data as { companyTypes: string[] }).companyTypes).toEqual([
        'Operating Company',
        'Subsidiary',
        'Franchise',
        'Division',
      ]);
      expect((result.data as { officeTypes: string[] }).officeTypes).toEqual([
        'HQ',
        'Regional',
        'Field',
        'Virtual',
      ]);
    });
  });

  describe('list', () => {
    const listUser = { sub: 'sub-1', groups: ['SuperAdmin'] };

    it('should return company directory list with pagination', async () => {
      companyService.findAllPaginatedForRequester.mockResolvedValue(
        mockDirectoryResponse as Awaited<
          ReturnType<CompanyService['findAllPaginatedForRequester']>
        >,
      );

      const query: ListCompanyDirectoryQueryDto = { page: 1, limit: 10 };
      const result = await controller.list(query, listUser);

      expect(companyService.findAllPaginatedForRequester).toHaveBeenCalledWith(
        query,
        listUser.sub,
        listUser.groups,
      );
      expect(result).toMatchObject(mockDirectoryResponse as object);
      expect(result.success).toBe(true);
      expect(
        (result.data as { pagination: { total: number } }).pagination.total,
      ).toBe(14);
    });

    it('should call service with search and filters', async () => {
      companyService.findAllPaginatedForRequester.mockResolvedValue(
        mockDirectoryResponse as Awaited<
          ReturnType<CompanyService['findAllPaginatedForRequester']>
        >,
      );

      const query: ListCompanyDirectoryQueryDto = {
        search: 'Acme',
        page: 2,
        limit: 5,
        status: 'active',
        corporationId: 'corp-uuid-1',
      };
      await controller.list(query, listUser);

      expect(companyService.findAllPaginatedForRequester).toHaveBeenCalledWith(
        query,
        listUser.sub,
        listUser.groups,
      );
    });

    it('should rethrow InternalServerErrorException from service', async () => {
      companyService.findAllPaginatedForRequester.mockRejectedValue(
        new InternalServerErrorException(
          'Failed to fetch company directory list. Please try again later.',
        ),
      );

      await expect(controller.list({}, listUser)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(controller.list({}, listUser)).rejects.toThrow(
        'Failed to fetch company directory list. Please try again later.',
      );
    });

    it('should rethrow generic error from service', async () => {
      companyService.findAllPaginatedForRequester.mockRejectedValue(
        new Error('Unexpected error'),
      );

      await expect(controller.list({}, listUser)).rejects.toThrow(
        'Unexpected error',
      );
    });
  });
});
