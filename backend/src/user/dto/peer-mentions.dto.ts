import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const PEER_MENTION_MAX_SELECTED = 3;

export class ListPeerMentionsQueryDto {
  @ApiPropertyOptional({
    description:
      'Case-insensitive search over peer first name, last name, nickname, job role, and email.',
    example: 'Jane',
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  query?: string;
}

export class ResolvePeerMentionsDto {
  @ApiProperty({
    description:
      'Stable app user IDs selected from the peer mention picker. Duplicates are ignored.',
    type: [String],
    maxItems: PEER_MENTION_MAX_SELECTED,
    example: ['cognito-sub-1', 'cognito-sub-2'],
  })
  @IsArray()
  @ArrayMaxSize(PEER_MENTION_MAX_SELECTED)
  @IsString({ each: true })
  @MaxLength(128, { each: true })
  peerIds!: string[];
}
