import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import {
  APP_USER_ONBOARDING_STEP_TYPE,
  type AppUserOnboardingStepType,
} from '../constants/app-user.constants';

export class UpdateMyOnboardingStepDto {
  @ApiProperty({
    description:
      'Onboarding step type to mark complete for the logged-in user.',
    enum: Object.values(APP_USER_ONBOARDING_STEP_TYPE),
    example: APP_USER_ONBOARDING_STEP_TYPE.CONSENT,
  })
  @IsString()
  @IsIn(Object.values(APP_USER_ONBOARDING_STEP_TYPE))
  type!: AppUserOnboardingStepType;
}
