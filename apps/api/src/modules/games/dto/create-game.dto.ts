import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsUrl,
  MinLength,
  MaxLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GameStatus } from '@gamehub/shared';

export class GameCreditsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  production?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  technical?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  translation?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  testing?: string[];
}

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

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  installGuide?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => GameCreditsDto)
  credits?: GameCreditsDto;
}
