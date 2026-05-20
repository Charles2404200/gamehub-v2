import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsUrl,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { GameStatus } from '@gamehub/shared';

export class CreateGameDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  /** URL-safe slug: lowercase letters, digits, hyphens */
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must contain only lowercase letters, digits, and hyphens' })
  @MinLength(2)
  @MaxLength(80)
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(GameStatus)
  status?: GameStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  executableNames?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  installPathHints?: string[];

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  youtubeDemoUrl?: string;
}
