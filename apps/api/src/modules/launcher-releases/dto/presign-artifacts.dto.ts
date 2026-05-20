import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ArtifactPresignRequest {
  @IsString()
  filename!: string;

  @IsString()
  contentType!: string;
}

export class PresignArtifactsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArtifactPresignRequest)
  artifacts!: ArtifactPresignRequest[];
}
