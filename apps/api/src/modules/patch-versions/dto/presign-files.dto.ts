import { IsArray, ValidateNested, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PresignFileItemDto {
  @IsString()
  relativePath!: string;

  @IsNumber()
  @Min(1)
  size!: number;

  @IsString()
  sha256!: string;

  @IsString()
  contentType!: string;
}

export class PresignFilesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PresignFileItemDto)
  files!: PresignFileItemDto[];
}
