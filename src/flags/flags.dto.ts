import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CriarFlagDto {
  /** RN01: kebab-case, ex.: nova-tela-checkout */
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'chave deve estar em kebab-case, ex.: nova-tela-checkout' })
  @MaxLength(60)
  chave!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(200)
  descricao!: string;
}

/** RN03: toda mudança registra por quê. O autor vem do usuário logado (RN06). */
export class MudancaDto {
  @IsString()
  @MinLength(10)
  @MaxLength(250)
  motivo!: string;
}

export class AlterarFlagDto extends MudancaDto {
  @IsBoolean()
  ativa!: boolean;

  /** RF06: % de usuários que recebem a flag ligada. Padrão 100. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  percentual?: number;
}

export class RollbackDto extends MudancaDto {
  /** Versão (do mesmo ambiente) cujo estado será restaurado */
  @IsInt()
  @Min(1)
  versao!: number;
}
