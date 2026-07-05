import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class GetCoachDashboardSessionsQueryDto {
  @IsOptional()
  @IsString()
  date?: string;
}

export class CoachActivityQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class CoachInsightQueryDto {
  @IsOptional()
  @IsIn(['month'])
  period?: 'month';
}

export class ScheduleSessionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  date!: string;

  @IsString()
  @IsNotEmpty()
  startTime!: string;

  @IsString()
  @IsNotEmpty()
  endTime!: string;

  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  notify?: boolean;
}

export class RescheduleSessionDto {
  @IsString()
  @IsNotEmpty()
  date!: string;

  @IsString()
  @IsNotEmpty()
  startTime!: string;

  @IsString()
  @IsNotEmpty()
  endTime!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  notify?: boolean;
}

export class CancelSessionDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsBoolean()
  notify?: boolean;
}

export class AvailabilityRangeDto {
  @IsString()
  @IsNotEmpty()
  start!: string;

  @IsString()
  @IsNotEmpty()
  end!: string;
}

export class AvailabilityDayDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsBoolean()
  enabled!: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityRangeDto)
  ranges!: AvailabilityRangeDto[];
}

export class UpdateCoachAvailabilityDto {
  @IsString()
  @IsNotEmpty()
  timezone!: string;

  @Type(() => Number)
  @IsInt()
  @Min(15)
  defaultSessionLengthMins!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  bufferMins!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityDayDto)
  days!: AvailabilityDayDto[];
}

export class CoachSessionsQueryDto {
  @IsOptional()
  @IsIn(['upcoming', 'past'])
  scope?: 'upcoming' | 'past';
}

export class CoachCalendarQueryDto {
  @IsIn(['week', 'month'])
  view!: 'week' | 'month';

  @IsString()
  @IsNotEmpty()
  start!: string;
}

export class CoachSessionRequestsQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;
}

export class UpdateSessionNotesDto {
  @IsString()
  @IsNotEmpty()
  notes!: string;
}

export class SessionRequestSlotsDto {
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  proposedSlots!: string[];
}

export class SessionRequestCancelDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
