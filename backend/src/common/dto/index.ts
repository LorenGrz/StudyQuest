import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsNumber,
  IsInt,
  IsIn,
  IsArray,
  IsOptional,
  IsBoolean,
  IsUUID,
  Matches,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CAREERS } from '../careers';

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

  @ApiProperty({ example: 'Ciencias de la Computación', enum: CAREERS })
  @IsIn(CAREERS)
  career: string;

  @ApiProperty({
    example: 2,
    minimum: 1,
    maximum: 7,
    description: 'Año actual',
  })
  @IsInt()
  @Min(1)
  @Max(7)
  year: number;
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
  @IsOptional() @IsString() @MinLength(3) @MaxLength(30) username?: string;
  @IsOptional() @IsString() @MaxLength(500) bio?: string;
  @IsOptional() @IsString() @MaxLength(60) displayName?: string;
  // Only a server-produced avatar path is accepted here; real uploads go
  // through POST /users/me/avatar.
  @IsOptional()
  @IsString()
  @Matches(/^\/uploads\/avatars\/[\w.-]+$/)
  avatarUrl?: string;
  @IsOptional() @IsString() university?: string;
  @IsOptional() @IsIn(CAREERS) career?: string;
  @IsOptional() @IsInt() @Min(1) @Max(7) year?: number;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  availability?: AvailabilitySlotDto[];
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  currentPassword: string;
  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  newPassword: string;
}

export class EnrollSubjectDto {
  @ApiProperty() @IsUUID() subjectId: string;
}

export class SetActiveCosmeticsDto {
  @IsOptional() @IsString() @MaxLength(60) titleCode?: string | null;
  @IsOptional() @IsString() @MaxLength(60) borderCode?: string | null;
}

// ─── Subjects ─────────────────────────────────────────────────────────────────

export class CreateSubjectDto {
  @IsString() @MinLength(3) name: string;
  @IsString() @MinLength(2) @MaxLength(20) code: string;
  @IsOptional() @IsString() description?: string;
  @IsString() university: string;
  @IsIn(CAREERS) career: string;
  @IsInt() @Min(1) @Max(7) year: number;
}

export class SubjectQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() university?: string;
  @IsOptional() @IsIn(CAREERS) career?: string;
  @IsOptional() @IsNumber() @Min(1) @Max(7) year?: number;
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
  // Optional focus/topic guidance for the questions ("only chapter 3", "harder,
  // exam-level", "skip definitions"). NOT the study source — that is the uploaded
  // file. No minimum length; 1500 is a hard ceiling, the per-plan limit is
  // enforced in QuestsService.
  @IsOptional()
  @IsString()
  @MaxLength(1500)
  instructions?: string;
}

export class SubmitAnswerDto {
  @IsUUID() questId: string;
  @IsOptional() @IsUUID() attemptId?: string;
  @IsNumber() @Min(0) questionIndex: number;
  // -1 = sin respuesta (se agotó el tiempo); cuenta como incorrecta.
  @IsNumber() @Min(-1) @Max(3) selectedOption: number;
  @IsNumber() @Min(0) timeSpentMs: number;
}

// ─── Recommendations ──────────────────────────────────────────────────────────

export class RecommendedQuestsQueryDto {
  @IsOptional() @IsNumber() @Min(1) page?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(50) limit?: number;
  @IsOptional() @IsUUID() subjectId?: string;
}

export class RecommendedQuestDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  subjectId: string;

  @ApiProperty()
  subjectName: string;

  @ApiProperty()
  partyId: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  playCount: number;
}

export class RecommendedQuestsResponseDto {
  @ApiProperty({ type: [RecommendedQuestDto] })
  items: RecommendedQuestDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

// ─── Global Search ────────────────────────────────────────────────────────────

export class GlobalSearchQueryDto {
  @ApiProperty({ example: 'cálculo', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  q: string;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class SearchResultUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty({ nullable: true })
  avatarUrl: string | null;

  @ApiProperty()
  university: string;

  @ApiProperty()
  career: string;
}

export class SearchResultSubjectDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  university: string;

  @ApiProperty()
  career: string;

  @ApiProperty()
  year: number;

  @ApiProperty()
  enrolledCount: number;
}

export class SearchResultQuestDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  subjectId: string;

  @ApiProperty()
  subjectName: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;
}

export class GlobalSearchResponseDto {
  @ApiProperty({ type: [SearchResultUserDto] })
  users: SearchResultUserDto[];

  @ApiProperty({ type: [SearchResultSubjectDto] })
  subjects: SearchResultSubjectDto[];

  @ApiProperty({ type: [SearchResultQuestDto] })
  quests: SearchResultQuestDto[];

  @ApiProperty()
  totalResults: number;
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
