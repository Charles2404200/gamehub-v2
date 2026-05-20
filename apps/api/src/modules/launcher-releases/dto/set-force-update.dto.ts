import { IsBoolean } from 'class-validator';

export class SetForceUpdateDto {
  @IsBoolean()
  forceUpdate!: boolean;
}
