import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsNumber,
  IsArray,
  IsOptional,
  IsBoolean,
  IsUUID,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export class RegisterDto {
  @ApiProperty({ example: 'juan@uba.ar' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @MinLength(8)
  @MaxLength(64)
  password: string;

  @ApiProperty({ example: 'juandev' })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  displayName: string;

  @ApiProperty({ example: 'Universidad de Buenos Aires' })
  @IsString()
  university: string;

  @ApiProperty({ example: 'Ciencias de la Computación' })
  @IsString()
  career: string;

  @ApiProperty({ example: 3, minimum: 1, maximum: 8 })
  @IsNumber()
  @Min(1)
  @Max(8)
  semester: number;
}

export class LoginDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() password: string;
}

export class RefreshTokenDto {
  @ApiProperty() @IsString() refreshToken: string;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export class AvailabilitySlotDto {
  @IsNumber() @Min(0) @Max(6) day: number;
  @IsNumber() @Min(0) @Max(23) hour: number;
}

export class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(60) displayName?: string;
  @IsOptional() @IsString() avatarUrl?: string;
  @IsOptional() @IsString() university?: string;
  @IsOptional() @IsString() career?: string;
  @IsOptional() @IsNumber() @Min(1) @Max(8) semester?: number;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  availability?: AvailabilitySlotDto[];
}

export class EnrollSubjectDto {
  @ApiProperty() @IsUUID() subjectId: string;
}

// ─── Subjects ─────────────────────────────────────────────────────────────────

export class CreateSubjectDto {
  @IsString() @MinLength(3) name: string;
  @IsString() @MinLength(2) @MaxLength(20) code: string;
  @IsOptional() @IsString() description?: string;
  @IsString() university: string;
  @IsString() career: string;
  @IsNumber() @Min(1) @Max(8) semester: number;
}

export class SubjectQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() university?: string;
  @IsOptional() @IsString() career?: string;
  @IsOptional() @IsNumber() @Min(1) @Max(8) semester?: number;
  @IsOptional() @IsNumber() @Min(1) page?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(50) limit?: number;
}

// ─── Matchmaking ──────────────────────────────────────────────────────────────

export class JoinQueueDto {
  @IsArray() @IsUUID('all', { each: true }) subjectIds: string[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  availability: AvailabilitySlotDto[];
  @IsNumber() @Min(2) @Max(6) preferredPartySize: number;
}

// ─── Parties ──────────────────────────────────────────────────────────────────

export class SendChatMessageDto {
  @IsString() @MinLength(1) @MaxLength(2000) text: string;
}

export class UploadAudioMessageDto {
  @IsNumber() @Min(1) @Max(120000) durationMs: number;
}

export class CreatePartyDto {
  @IsOptional() @IsUUID() subjectId?: string;
  @IsOptional() @IsNumber() @Min(2) @Max(8) maxMembers?: number;
  @IsOptional() @IsBoolean() isPrivate?: boolean;
}

export class UpdatePartyVisibilityDto {
  @IsBoolean() isPrivate: boolean;
}

// ─── Quests ───────────────────────────────────────────────────────────────────

export class CreateQuestDto {
  @IsUUID() partyId: string;
  @IsString() @MinLength(3) @MaxLength(100) title: string;
  @IsOptional()
  @IsString()
  @MinLength(100)
  @MaxLength(50_000)
  textContent?: string;
}

export class SubmitAnswerDto {
  @IsUUID() questId: string;
  @IsOptional() @IsUUID() attemptId?: string;
  @IsNumber() @Min(0) questionIndex: number;
  @IsNumber() @Min(0) @Max(3) selectedOption: number;
  @IsNumber() @Min(0) timeSpentMs: number;
}

// ─── Skill Tree ───────────────────────────────────────────────────────────────

export class CreateSkillNodeDto {
  @ApiPropertyOptional({ example: 'f4f65fd7-f71c-4d66-aa5b-7d6f44ab34e8' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiProperty({ example: 'Derivadas' })
  @IsString()
  @MaxLength(200)
  topic: string;

  @ApiProperty({ example: 'Cálculo Diferencial' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Reglas de derivación y aplicaciones.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'sigma' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  iconKey?: string;

  @ApiProperty({ example: 150 })
  @IsNumber()
  @Min(1)
  xpThreshold: number;

  @ApiPropertyOptional({ type: [String], example: [] })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  prerequisiteIds?: string[];

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  col?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  row?: number;
}

export interface SkillNodeWithProgress {
  id: string;
  subjectId: string;
  topic: string;
  name: string;
  description: string | null;
  iconKey: string;
  xpThreshold: number;
  prerequisiteIds: string[];
  col: number;
  row: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  topicXp: number;
  unlocked: boolean;
  progressPercent: number;
  prerequisitesMet: boolean;
}
