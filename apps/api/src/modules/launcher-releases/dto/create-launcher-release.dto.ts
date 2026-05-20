import { IsString, IsEnum, IsOptional, MinLength, Matches } from 'class-validator';
import { LauncherPlatform } from '@gamehub/shared';

export class CreateLauncherReleaseDto {
  @IsString()
  @Matches(/^\d+\.\d+\.\d+/, { message: 'version must be semantic (e.g., 1.0.0)' })
  version!: string;

  @IsEnum(LauncherPlatform)
  platform!: LauncherPlatform;

  @IsOptional()
  @IsString()
  releaseNotes?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+\.\d+\.\d+/, {
    message: 'minSupportedVersion must be semantic (e.g., 1.0.0)',
  })
  minSupportedVersion?: string;
}
