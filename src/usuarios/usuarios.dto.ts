import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CriarUsuarioDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nome!: string;

  @IsEmail()
  @MaxLength(160)
  email!: string;
}
