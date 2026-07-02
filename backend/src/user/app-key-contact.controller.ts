import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  Param,
  ParseUUIDPipe,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { AppKeyContactService } from './app-key-contact.service';
import { CreateAppKeyContactDto } from './dto/create-app-key-contact.dto';
import { ListAppKeyContactsQueryDto } from './dto/list-app-key-contacts-query.dto';
import { UpdateAppKeyContactDto } from './dto/update-app-key-contact.dto';
import { SendKeyContactInviteDto } from './dto/send-key-contact-invite.dto';
import { type ApiResponse } from '../common';
import {
  AuthorizationGuard,
  CognitoAuthGuard,
  CurrentUser,
  RequireSubmodule,
  SUBMODULE_KEYS,
} from '../auth';
import {
  KEY_CONTACT_BULK_CSV_MAX_BYTES,
  KEY_CONTACT_BULK_CSV_MISSING_FILE_MSG,
  KEY_CONTACT_BULK_CSV_SIZE_REJECT_MSG,
  KEY_CONTACT_BULK_CSV_TYPE_REJECT_MSG,
  KEY_CONTACT_BULK_FILE_FIELD,
  KEY_CONTACT_BULK_CSV_MIME_ALLOWLIST,
} from './constants/app-key-contact-bulk.constants';

@ApiTags('Key contacts')
@Controller('key-contacts')
export class AppKeyContactController {
  private readonly logger = new Logger(AppKeyContactController.name);

  constructor(private readonly appKeyContactService: AppKeyContactService) {}

  @Get()
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.USER_DIRECTORY_VIEW)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List standalone app key contacts (paginated)',
    description:
      'Returns paginated rows from app_key_contacts where deleted_at is null and app_user_id is null (not linked to an app user). Query: page, limit, sortBy, sortOrder, optional search, contactType (single DB key, e.g. exec_sponsor), corporationIds, companyIds, timezones (see DTO). **SuperAdmin:** full list. **CorporationAdmin:** only contacts under their linked corporation (`corporationIds` / `companyIds` must stay within that corporation). **CompanyAdmin:** only contacts for companies where they have admin `user_company_access`. Each item includes id, contact code, name, email, corporation name and code, company name, corporation region (from app_key_contacts.corporation_id only), contactType (display label from util when key is known), job role, work phone, timezone, and created date.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Key contacts fetched successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin, or requested filters are outside their scope',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to fetch key contacts',
  })
  async list(
    @Query() query: ListAppKeyContactsQueryDto,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.appKeyContactService.findAllPaginatedForRequester(
        query,
        user.sub,
        user.groups ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in key contacts list endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Post()
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.USER_DIRECTORY_INVITE)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create standalone app key contact',
    description:
      'Creates a directory key contact (`app_user_id` null). Required: firstName, lastName, email, workPhone, contactType. Optional: nickname, timezone, cellPhone, corporationId, companyId, jobRole. If companyId is set, the company must exist; corporationId is optional and must match the company when both are sent. Email must not duplicate another contact or an app user. **SuperAdmin:** any payload. **CorporationAdmin** / **CompanyAdmin:** when `corporationId` or `companyId` is sent, the contact must belong to their linked corporation or admin companies.',
  })
  @ApiBody({ type: CreateAppKeyContactDto })
  @SwaggerApiResponse({
    status: 201,
    description: 'Key contact created successfully',
  })
  @ApiBadRequestResponse({
    description: 'Validation error or corporation/company mismatch',
  })
  @ApiConflictResponse({
    description: 'Email already used by another key contact or by an app user',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin, or scoped corporationId/companyId is outside their access',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to create key contact',
  })
  async create(
    @Body() dto: CreateAppKeyContactDto,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.appKeyContactService.createForRequester(
        dto,
        user.sub,
        user.groups ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in key contact create endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Post('bulk')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.USER_DIRECTORY_BULK_UPLOAD)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor(KEY_CONTACT_BULK_FILE_FIELD, {
      storage: memoryStorage(),
      limits: { fileSize: KEY_CONTACT_BULK_CSV_MAX_BYTES },
      fileFilter: (
        _req: Express.Request,
        file: Express.Multer.File,
        cb: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        if (!file.originalname.toLowerCase().endsWith('.csv')) {
          return cb(
            new BadRequestException(KEY_CONTACT_BULK_CSV_TYPE_REJECT_MSG),
            false,
          );
        }
        const mt = (file.mimetype || '').toLowerCase();
        if (!KEY_CONTACT_BULK_CSV_MIME_ALLOWLIST.includes(mt)) {
          return cb(
            new BadRequestException(KEY_CONTACT_BULK_CSV_TYPE_REJECT_MSG),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Single CSV (max 1 MB) with the same column layout as the key contact import template.',
    schema: {
      type: 'object',
      required: [KEY_CONTACT_BULK_FILE_FIELD],
      properties: {
        [KEY_CONTACT_BULK_FILE_FIELD]: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Bulk import key contacts from CSV',
    description:
      '**SuperAdmin**, **CorporationAdmin**, and **CompanyAdmin** only. Uploads a UTF-8 CSV (`file` field). Each row is processed like `POST /key-contacts` with `corporationName` and `companyName` resolved to IDs (insensitive name match; company unique when corporation omitted; optional corporation- or company-only as in the single create). When those names are present, **CorporationAdmin** may only import rows under their corporation; **CompanyAdmin** may only import rows for their assigned companies. Rejects non-CSV files, files over 1 MB, and enforces no duplicate email (within file, existing key contacts, and app users). Returns `createdIds` and a `failed` list with row numbers (header is row 1) and error messages; successful rows are not rolled back on partial failure.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Import finished; check `data.failed` for per-row issues',
  })
  @ApiBadRequestResponse({
    description: 'Invalid file, wrong type, size, or bad CSV header',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin',
  })
  @ApiInternalServerErrorResponse({ description: 'Import processing failed' })
  async importCsv(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    if (!file?.buffer) {
      throw new BadRequestException(KEY_CONTACT_BULK_CSV_MISSING_FILE_MSG);
    }
    if (file.size > KEY_CONTACT_BULK_CSV_MAX_BYTES) {
      throw new BadRequestException(KEY_CONTACT_BULK_CSV_SIZE_REJECT_MSG);
    }
    try {
      return await this.appKeyContactService.importFromCsvFile(
        file,
        user.sub,
        user.groups ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in key contact bulk import endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Post(':id/invite')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.USER_DIRECTORY_RESEND_INVITE)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Invite key contact as app user',
    description:
      'Requires `roleId`. Loads the key contact; ensures corporation and company are set and valid; rejects duplicate app user email; creates Cognito user, `app_users` row, company access, links `app_key_contacts.app_user_id`, and sends the same invitation email as POST /users/invite. **SuperAdmin:** any contact. **CorporationAdmin** / **CompanyAdmin:** when the contact has `corporationId` or `companyId`, it must belong to their linked corporation or admin companies.',
  })
  @ApiBody({ type: SendKeyContactInviteDto })
  @SwaggerApiResponse({
    status: 201,
    description: 'Key contact invited successfully',
  })
  @ApiBadRequestResponse({
    description:
      'Validation error, missing corporation/company on contact, duplicate email, seat limit, or invalid role',
  })
  @ApiNotFoundResponse({ description: 'Key contact not found' })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin, or target contact is outside their scope',
  })
  @ApiInternalServerErrorResponse({
    description: 'Provisioning or email failed',
  })
  async sendInvite(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendKeyContactInviteDto,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.appKeyContactService.sendInviteForRequester(
        id,
        dto,
        user.sub,
        user.groups ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in key contact invite endpoint (id=${id}): ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get(':id')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.USER_DIRECTORY_VIEW)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get app key contact by id',
    description:
      'Returns one standalone app key contact (not soft-deleted, app_user_id null — same scope as the list): id, contactCode, status, firstName, lastName, nickname, email, work and cell phone, timezone, contactType (display label from contact-type.util, same as list), jobRole, createdOn, corporation (legalName, corporationCode only), company (legalName only). No role or category fields. Contact code display formatting is client-side.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Key contact details fetched successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid id (not a UUID)' })
  @ApiNotFoundResponse({ description: 'Key contact not found' })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin, or target contact is outside their scope',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to fetch key contact details',
  })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.appKeyContactService.findByIdForRequester(
        id,
        user.sub,
        user.groups ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in key contact view endpoint (id=${id}): ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.USER_DIRECTORY_EDIT_CONTACT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update standalone app key contact',
    description:
      'Updates firstName, lastName, nickname, email, workPhone, cellPhone, timezone, contactType (stored key), jobRole, and optional `corporationId` / `companyId`. Same scope as list/view: row must not be soft-deleted and must not be linked to an app user (`app_user_id` null). Email must not duplicate another key contact or match a non-deleted app user email. **SuperAdmin:** any payload. **CorporationAdmin** / **CompanyAdmin:** when `corporationId` or `companyId` is sent, the contact must belong to their linked corporation or admin companies.',
  })
  @ApiBody({ type: UpdateAppKeyContactDto })
  @SwaggerApiResponse({
    status: 200,
    description: 'Key contact updated successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid id, validation error, or empty body',
  })
  @ApiNotFoundResponse({ description: 'Key contact not found' })
  @ApiConflictResponse({
    description: 'Email already used by another key contact or by an app user',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin, or scoped corporationId/companyId is outside their access',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to update key contact',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppKeyContactDto,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.appKeyContactService.updateForRequester(
        id,
        dto,
        user.sub,
        user.groups ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in key contact update endpoint (id=${id}): ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.USER_DIRECTORY_REMOVE_CONTACT)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Soft-delete app key contact',
    description:
      'Sets `app_key_contacts.deleted_at`. Only standalone directory contacts apply (not soft-deleted, `app_user_id` null). Rejects contacts already linked to an app user. **SuperAdmin:** any contact. **CorporationAdmin** / **CompanyAdmin:** when the contact has `corporationId` or `companyId`, it must belong to their linked corporation or admin companies.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Key contact soft-deleted successfully',
  })
  @ApiBadRequestResponse({
    description: 'Key contact is linked to an app user',
  })
  @ApiNotFoundResponse({ description: 'Key contact not found' })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin, or target contact is outside their scope',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to soft-delete key contact',
  })
  async softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.appKeyContactService.softDeleteForRequester(
        id,
        user.sub,
        user.groups ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in key contact soft-delete endpoint (id=${id}): ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }
}
