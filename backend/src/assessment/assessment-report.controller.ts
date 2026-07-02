import {
  Body,
  Controller,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AuthorizationGuard,
  CognitoAuthGuard,
  CurrentUser,
  RequireSubmodule,
  SUBMODULE_KEYS,
} from '../auth';
import { ResponseHelper, type ApiResponse } from '../common';
import { ASSESSMENT_REPORT_SHARE_SENT_MSG } from './assessment.constants';
import { AssessmentReportService } from './assessment-report.service';
import { ShareAssessmentReportDto } from './dto/share-assessment-report.dto';

@ApiTags('Assessment Reports')
@Controller('assessment-reports')
@UseGuards(CognitoAuthGuard, AuthorizationGuard)
@ApiBearerAuth()
export class AssessmentReportController {
  private readonly logger = new Logger(AssessmentReportController.name);

  constructor(
    private readonly assessmentReportService: AssessmentReportService,
  ) {}

  @Post(':assessmentId/share')
  @RequireSubmodule(SUBMODULE_KEYS.ASSESSMENT_VIEW_RESULT)
  @ApiOperation({
    summary: 'Share assessment result PDF',
    description:
      'Sends the generated assessment report PDF to the given recipient emails via SES. The authenticated user must own the assessment and its status must be report_generated.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Assessment belongs to another user',
  })
  async shareAssessmentReport(
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Body() body: ShareAssessmentReportDto,
    @CurrentUser() user: { sub: string },
  ): Promise<ApiResponse<{ sent: true }>> {
    try {
      await this.assessmentReportService.shareReportWithRecipients(
        assessmentId,
        user.sub,
        body.recipients,
      );
      return ResponseHelper.success(ASSESSMENT_REPORT_SHARE_SENT_MSG, {
        sent: true,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error ? err.stack : undefined;
      this.logger.error(
        `Error in shareAssessmentReport: ${errorMessage}`,
        errorStack,
      );
      throw err;
    }
  }
}
