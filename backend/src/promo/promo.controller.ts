import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse as SwaggerApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiResponse } from '../common';
import {
  AuthorizationGuard,
  CognitoAuthGuard,
  RequireSubmodule,
  SUBMODULE_KEYS,
  SuperAdminGuard,
} from '../auth';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { ListAvailablePromoCodesForSetupQueryDto } from './dto/list-available-promo-codes-for-setup-query.dto';
import { ListPromoCodeUsageQueryDto } from './dto/list-promo-code-usage-query.dto';
import { ListPromoCodesQueryDto } from './dto/list-promo-codes-query.dto';
import { PatchPromoCodePromotionActiveDto } from './dto/patch-promo-promotion-active.dto';
import { UpdatePromoCodeDto } from './dto/update-promo-code.dto';
import { PromoService } from './promo.service';
import type {
  PromoCodeCreatedData,
  PromoCodeDetailData,
  PromoCodeUsageListData,
  PromoCodeValidatedData,
  PromoCodesAvailableForCompanySetupData,
  PromoCodesListData,
} from './promo.types';

@ApiTags('Promo codes')
@Controller('promo-codes')
@UseGuards(CognitoAuthGuard, SuperAdminGuard, AuthorizationGuard)
@ApiBearerAuth()
export class PromoController {
  private readonly logger = new Logger(PromoController.name);

  constructor(private readonly promoService: PromoService) {}

  @Get()
  @RequireSubmodule(SUBMODULE_KEYS.PROMO_CODE_VIEW)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List promo codes',
    description:
      'Paginated Super Admin promo list with optional search, plan/discount filters, created-after filter, and sorting. Stripe redemption summaries are merged per row (best-effort).',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Paginated list of promo codes',
  })
  async list(
    @Query() query: ListPromoCodesQueryDto,
  ): Promise<ApiResponse<PromoCodesListData>> {
    try {
      return await this.promoService.listPromoCodes(query);
    } catch (err) {
      this.logger.warn(
        `listPromoCodes failed: ${err instanceof Error ? err.message : err}`,
      );
      throw err;
    }
  }

  @Get('available-for-company-setup')
  @RequireSubmodule(SUBMODULE_KEYS.PROMO_CODE_VIEW)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List promo codes available for company plan setup',
    description:
      'Returns active, non-expired, non-exhausted promos suitable for the Add Company → Plan & Seats flow. Optional `planTypeId` scopes to the selected pricing tab; optional `corporationId` includes corporation-scoped promos. Excludes company-specific assignments. Super Admin only.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Promo codes available for selection',
  })
  async listAvailableForCompanySetup(
    @Query() query: ListAvailablePromoCodesForSetupQueryDto,
  ): Promise<ApiResponse<PromoCodesAvailableForCompanySetupData>> {
    try {
      return await this.promoService.listAvailablePromoCodesForCompanySetup(
        query,
      );
    } catch (err) {
      this.logger.warn(
        `listAvailablePromoCodesForCompanySetup failed: ${err instanceof Error ? err.message : err}`,
      );
      throw err;
    }
  }

  @Post('validate')
  @RequireSubmodule(SUBMODULE_KEYS.PROMO_CODE_ADD)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate promo code before create',
    description:
      'Runs the same checks as create (including Stripe product scope for the plan) without creating a coupon or database row. Use so the client can enable Add only after a successful round-trip.',
  })
  @ApiBody({ type: CreatePromoCodeDto })
  @SwaggerApiResponse({ status: 200, description: 'Payload is valid' })
  async validateCreate(
    @Body() body: CreatePromoCodeDto,
  ): Promise<ApiResponse<PromoCodeValidatedData>> {
    try {
      return await this.promoService.validatePromoCodeCreate(body);
    } catch (err) {
      this.logger.warn(
        `validatePromoCodeCreate failed: ${err instanceof Error ? err.message : err}`,
      );
      throw err;
    }
  }

  @Get(':id/usage')
  @RequireSubmodule(SUBMODULE_KEYS.PROMO_CODE_VIEW)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List promo code usage history',
    description:
      'Paginated rows for the Usage History tab (filters + search). Data is built from Stripe completed subscription Checkout Sessions that applied this promotion code, then enriched from company metadata; very high checkout volume may require a capped Stripe scan (see implementation).',
  })
  @ApiParam({ name: 'id', description: 'Promo code row UUID' })
  @SwaggerApiResponse({ status: 200, description: 'Usage history page' })
  async listUsage(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListPromoCodeUsageQueryDto,
  ): Promise<ApiResponse<PromoCodeUsageListData>> {
    try {
      return await this.promoService.listPromoCodeUsage(id, query);
    } catch (err) {
      this.logger.warn(
        `listPromoCodeUsage failed: ${err instanceof Error ? err.message : err}`,
      );
      throw err;
    }
  }

  @Get(':id')
  @RequireSubmodule(SUBMODULE_KEYS.PROMO_CODE_VIEW)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get promo code details',
    description:
      'Returns one promo with plan/assignment context and Stripe redemption state.',
  })
  @ApiParam({ name: 'id', description: 'Promo code row UUID' })
  @SwaggerApiResponse({ status: 200, description: 'Promo code detail' })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<PromoCodeDetailData>> {
    try {
      return await this.promoService.getPromoCodeById(id);
    } catch (err) {
      this.logger.warn(
        `getPromoCodeById failed: ${err instanceof Error ? err.message : err}`,
      );
      throw err;
    }
  }

  @Post(':id/validate')
  @RequireSubmodule(SUBMODULE_KEYS.PROMO_CODE_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate promo code update payload',
    description:
      'Merges the PATCH body with the existing row and validates without writing to Stripe or the database.',
  })
  @ApiParam({ name: 'id', description: 'Promo code row UUID' })
  @ApiBody({ type: UpdatePromoCodeDto })
  @SwaggerApiResponse({ status: 200, description: 'Merged payload is valid' })
  async validateUpdate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdatePromoCodeDto,
  ): Promise<ApiResponse<PromoCodeValidatedData>> {
    try {
      return await this.promoService.validatePromoCodeUpdate(id, body);
    } catch (err) {
      this.logger.warn(
        `validatePromoCodeUpdate failed: ${err instanceof Error ? err.message : err}`,
      );
      throw err;
    }
  }

  @Post()
  @RequireSubmodule(SUBMODULE_KEYS.PROMO_CODE_ADD)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a promo code (synced to Stripe)',
    description:
      'Creates a Stripe Coupon and Promotion Code. Requires SuperAdmin.',
  })
  @ApiBody({ type: CreatePromoCodeDto })
  @SwaggerApiResponse({ status: 201, description: 'Promo created' })
  async create(
    @Body() body: CreatePromoCodeDto,
  ): Promise<ApiResponse<PromoCodeCreatedData>> {
    try {
      return await this.promoService.createPromoCode(body);
    } catch (err) {
      this.logger.warn(
        `createPromoCode failed: ${err instanceof Error ? err.message : err}`,
      );
      throw err;
    }
  }

  @Patch(':id/promotion-active')
  @RequireSubmodule(SUBMODULE_KEYS.PROMO_CODE_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enable or disable promo code redemption (Stripe)',
    description:
      'Updates the Stripe promotion code `active` flag. Does not delete the coupon or row.',
  })
  @ApiParam({ name: 'id', description: 'Promo code row UUID' })
  @ApiBody({ type: PatchPromoCodePromotionActiveDto })
  @SwaggerApiResponse({ status: 200, description: 'Activation updated' })
  async setPromotionActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: PatchPromoCodePromotionActiveDto,
  ): Promise<ApiResponse<PromoCodeCreatedData>> {
    try {
      return await this.promoService.setPromoStripePromotionActive(
        id,
        body.active,
      );
    } catch (err) {
      this.logger.warn(
        `setPromoStripePromotionActive failed: ${err instanceof Error ? err.message : err}`,
      );
      throw err;
    }
  }

  @Delete(':id')
  @RequireSubmodule(SUBMODULE_KEYS.PROMO_CODE_DELETE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft-delete a promo code',
    description:
      'Deactivates the Stripe promotion, deletes the Stripe coupon, and sets `deletedAt` on the row.',
  })
  @ApiParam({ name: 'id', description: 'Promo code row UUID' })
  @SwaggerApiResponse({ status: 200, description: 'Promo deleted' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<PromoCodeCreatedData>> {
    try {
      return await this.promoService.softDeletePromoCode(id);
    } catch (err) {
      this.logger.warn(
        `softDeletePromoCode failed: ${err instanceof Error ? err.message : err}`,
      );
      throw err;
    }
  }

  @Patch(':id')
  @RequireSubmodule(SUBMODULE_KEYS.PROMO_CODE_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a promo code (synced to Stripe)',
    description:
      'Updates stored fields and applies allowed Stripe changes (promotion schedule, new coupon pair when discount/duration changes, new promotion code when only the customer-facing code changes). SuperAdmin only.',
  })
  @ApiParam({ name: 'id', description: 'Promo code row UUID' })
  @ApiBody({ type: UpdatePromoCodeDto })
  @SwaggerApiResponse({ status: 200, description: 'Promo updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdatePromoCodeDto,
  ): Promise<ApiResponse<PromoCodeCreatedData>> {
    try {
      return await this.promoService.updatePromoCode(id, body);
    } catch (err) {
      this.logger.warn(
        `updatePromoCode failed: ${err instanceof Error ? err.message : err}`,
      );
      throw err;
    }
  }
}
