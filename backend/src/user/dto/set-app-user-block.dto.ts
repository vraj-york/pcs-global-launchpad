import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/** Body for block / unblock: `true` sets status to Blocked, `false` to Active. */
export class SetAppUserBlockDto {
  @ApiProperty({
    description:
      'If true, sets app user status to Blocked; if false, sets status to Active.',
    example: true,
  })
  @IsBoolean()
  blocked!: boolean;
}
