import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class SetForceUpdateDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }
    return value;
  })
  @IsBoolean()
  forceUpdate?: boolean;
}
