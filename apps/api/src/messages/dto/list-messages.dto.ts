import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class ListMessagesDto {
  /** Retorna mensagens criadas antes deste id (paginação por cursor). */
  @IsOptional()
  @IsString()
  before?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export class SearchMessagesDto {
  @IsString()
  @MinLength(1)
  q!: string;
}
