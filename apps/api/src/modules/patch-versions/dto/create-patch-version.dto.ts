import { IsString, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';
import { PatchMode } from '@gamehub/shared';

export class CreatePatchVersionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  version!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  changelog?: string;

  @IsOptional()
  @IsEnum(PatchMode)
  mode?: PatchMode;
}
