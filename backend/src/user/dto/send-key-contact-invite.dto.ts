import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

/** Body for POST `key-contacts/:id/invite` (Super Admin). */
export class SendKeyContactInviteDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'End-user role to assign (validates same rules as app user invite).',
  })
  @IsNotEmpty()
  @IsUUID('4')
  roleId!: string;
}
