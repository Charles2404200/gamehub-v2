import { IsString, IsEnum, IsOptional, MinLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { LauncherPlatform } from '@gamehub/shared';

export class CreateLauncherReleaseDto {
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.trim().replace(/^v/i, '');
  })
  @IsString()
  @Matches(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/, {
    message: 'version must be semantic (e.g., 1.0.0)',
  })
  version!: string;

  @IsEnum(LauncherPlatform)
  platform!: LauncherPlatform;

  @IsOptional()
  @IsString()
  releaseNotes?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim().replace(/^v/i, '');
    return trimmed.length > 0 ? trimmed : undefined;
  })
  @IsString()
  @Matches(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/, {
    message: 'minSupportedVersion must be semantic (e.g., 1.0.0)',
  })
  minSupportedVersion?: string;
}
