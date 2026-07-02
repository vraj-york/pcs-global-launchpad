import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** Query for GET corporations/companies/all — companies under one corporation. */
export class ListAllCompaniesQueryDto {
  @ApiProperty({
    description: 'Corporation UUID whose non-deleted companies are returned.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4')
  corporationId!: string;
}
