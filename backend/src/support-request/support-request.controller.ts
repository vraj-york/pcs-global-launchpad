import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiResponse } from '../common';
import { SupportRequestService } from './support-request.service';
import { CreateSupportRequestDto } from './dto';
import {
  SUPPORT_REQUEST_ATTACHMENTS_FIELD,
  SUPPORT_REQUEST_ATTACHMENTS_TOTAL_MAX_BYTES,
  SUPPORT_REQUEST_MAX_ATTACHMENTS,
  SUPPORT_REQUEST_TOO_MANY_ATTACHMENTS_MSG,
} from './constants';

@ApiTags('Support Request')
@Controller('support-requests')
export class SupportRequestController {
  private readonly logger = new Logger(SupportRequestController.name);

  constructor(private readonly supportRequestService: SupportRequestService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FilesInterceptor(
      SUPPORT_REQUEST_ATTACHMENTS_FIELD,
      SUPPORT_REQUEST_MAX_ATTACHMENTS,
      {
        storage: memoryStorage(),
        limits: { fileSize: SUPPORT_REQUEST_ATTACHMENTS_TOTAL_MAX_BYTES },
      },
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Submit a support request',
    description:
      'Public endpoint (no authentication). Accepts email and subject as required fields, optional message, and up to 3 image attachments (PNG or JPG, max 10 MB combined, same file types as corporation brand logo). Support email includes S3 download links.',
  })
  @ApiBody({
    description: 'Support request form fields and optional image attachments',
    schema: {
      type: 'object',
      required: ['email', 'subject'],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'user@example.com',
        },
        subject: {
          type: 'string',
          example: 'Unable to access my account',
        },
        message: {
          type: 'string',
          example: 'I have been unable to log in since yesterday.',
        },
        [SUPPORT_REQUEST_ATTACHMENTS_FIELD]: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Up to 3 image files (PNG or JPG, max 10 MB combined)',
        },
      },
    },
  })
  @SwaggerApiResponse({
    status: 201,
    description: 'Support request submitted successfully',
  })
  @SwaggerApiResponse({
    status: 400,
    description: 'Validation failed or invalid attachments',
  })
  async submit(
    @Body() body: CreateSupportRequestDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<ApiResponse<{ id: string }>> {
    const attachmentFiles = files ?? [];
    if (attachmentFiles.length > SUPPORT_REQUEST_MAX_ATTACHMENTS) {
      throw new BadRequestException(SUPPORT_REQUEST_TOO_MANY_ATTACHMENTS_MSG);
    }

    try {
      return await this.supportRequestService.submit(body, attachmentFiles);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in submit support request endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }
}
