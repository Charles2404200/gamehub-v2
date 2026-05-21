import { IsString, IsEnum, IsBoolean, IsOptional, IsArray } from 'class-validator';
import { LauncherPlatform } from '@gamehub/shared';

export class CreateLauncherReleaseDto {
  @IsString()
  version!: string;

  @IsEnum(LauncherPlatform)
  platform!: LauncherPlatform;

  @IsString()
  minSupportedVersion!: string;

  @IsString()
  releaseNotes!: string;

  @IsString()
  updateBaseUrl!: string;

  @IsBoolean()
  @IsOptional()
  forceUpdate?: boolean;
}

export class UpdateLauncherReleaseDto {
  @IsString()
  @IsOptional()
  minSupportedVersion?: string;

  @IsString()
  @IsOptional()
  releaseNotes?: string;

  @IsBoolean()
  @IsOptional()
  forceUpdate?: boolean;
}

export class PresignArtifactsDto {
  @IsArray()
  @IsString({ each: true })
  fileNames!: string[];
}
