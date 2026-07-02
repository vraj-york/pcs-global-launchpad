import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import {
  MAX_ONE_TIME_ASSESSMENT_QUANTITY,
  MIN_ONE_TIME_ASSESSMENT_QUANTITY,
} from '../constants/assessment-quantity.constants';

/** Body for checkout when the admin has access to more than one company. */
export class CreateCompanyAdminCheckoutDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsIn(['off', '1_day', '2_days'])
  onsiteTrainingOption?: string;

  /** Required for `one_time` plans: number of assessments to purchase (min 1). */
  @IsOptional()
  @IsInt()
  @Min(MIN_ONE_TIME_ASSESSMENT_QUANTITY)
  @Max(MAX_ONE_TIME_ASSESSMENT_QUANTITY)
  assessmentQuantity?: number;
}
