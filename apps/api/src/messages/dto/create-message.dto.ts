import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class AttachmentDto {
  @IsUrl({ require_tld: false }, { message: 'URL do anexo inválida.' })
  url!: string;

  @IsString()
  @MaxLength(255)
  filename!: string;

  @IsInt()
  @Min(1)
  size!: number;

  @IsString()
  mimeType!: string;
}

export class CreateMessageDto {
  /** Opcional: uma mensagem pode ser só imagem, sem texto. */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  content?: string;

  @IsOptional()
  @IsString()
  replyToId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}
