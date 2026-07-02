import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail } from 'class-validator';
import { ASSESSMENT_REPORT_SHARE_MAX_RECIPIENTS } from '../assessment.constants';

export class ShareAssessmentReportDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ASSESSMENT_REPORT_SHARE_MAX_RECIPIENTS)
  @IsEmail({ require_tld: true }, { each: true })
  recipients!: string[];
}
