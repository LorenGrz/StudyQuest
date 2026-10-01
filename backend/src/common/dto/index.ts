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
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PLANS } from '../plans';
import { toNormalizedUsername } from '../username';
import {
  SUBJECT_REPORT_REASONS,
  type SubjectReportReason,
} from '../../modules/subjects/subject-report-reasons';
import { SUBJECT_NAME_MAX, SUBJECT_NAME_MIN } from '../subject-name.validator';
import {
  CAREER_LEVELS,
  type CareerLevel,
} from '../../modules/universities/career.entity';
import {
  CAREER_REQUEST_STATUSES,
  type CareerRequestStatus,
} from '../../modules/universities/career-request.entity';
import {
  ADMIN_COMMUNITY_SUBJECT_TABS,
  type AdminCommunitySubjectTab,
} from '../../modules/admin/admin-community-subjects.tabs';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

/** "Otra" career typed by the user: letters/digits plus light punctuation. */
const CAREER_NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} .,:;()'’\-–/]*$/u;
const CAREER_NAME_MESSAGE =
  'El nombre de la carrera solo puede tener letras, números y puntuación simple';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export class RegisterDto {
  @ApiProperty({ example: 'juan@uba.ar' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @MinLength(8)
  @MaxLength(64)
  password: string;

  @ApiProperty({
    example: 'juandev',
    description: 'Stored lowercase, without @',
  })
  @Transform(toNormalizedUsername)
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  displayName: string;

  @ApiPropertyOptional({ description: 'GET /universities id' })
  @IsOptional()
  @IsUUID()
  universityId?: string;

  @ApiPropertyOptional({
    example: 'Universidad de Buenos Aires',
    deprecated: true,
    description: 'Legacy: university name; required only without universityId',
  })
  @ValidateIf((o: RegisterDto) => !o.universityId)
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  university?: string;

  @ApiPropertyOptional({ description: 'GET /universities/:id/careers id' })
  @IsOptional()
  @IsUUID()
  careerId?: string;

  @ApiPropertyOptional({
    example: 'Licenciatura en Arte Digital',
    description:
      'Career not in the list ("Otra"): creates a pending career request',
  })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  @Matches(CAREER_NAME_PATTERN, { message: CAREER_NAME_MESSAGE })
  careerName?: string;

  @ApiPropertyOptional({
    example: 'Ciencias de la Computación',
    deprecated: true,
    description: 'Legacy: career name; required without careerId/careerName',
  })
  @ValidateIf((o: RegisterDto) => !o.careerId && !o.careerName)
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  career?: string;

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
  @IsOptional()
  @Transform(toNormalizedUsername)
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username?: string;
  @IsOptional() @IsString() @MaxLength(500) bio?: string;
  @IsOptional() @IsString() @MaxLength(60) displayName?: string;
  // Only a server-produced avatar path is accepted here; real uploads go
  // through POST /users/me/avatar. Keys are `avatars/<userId>/<uuid>.<ext>`.
  @IsOptional()
  @IsString()
  @Matches(/^\/api\/v1\/files\/avatars\/[\w-]+\/[\w.-]+$/)
  avatarUrl?: string;
  @IsOptional() @IsUUID() universityId?: string;
  @IsOptional() @IsUUID() careerId?: string;
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  @Matches(CAREER_NAME_PATTERN, { message: CAREER_NAME_MESSAGE })
  careerName?: string;
  /** Deprecated: catalog name, validated against the DB. */
  @IsOptional() @IsString() @MaxLength(200) university?: string;
  /** Deprecated: catalog name, validated against the DB. */
  @IsOptional() @IsString() @MaxLength(200) career?: string;
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
  @IsString() @MaxLength(200) career: string;
  @IsInt() @Min(1) @Max(7) year: number;
}

export class SubjectQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsUUID() universityId?: string;
  /** Deprecated: catalog name, resolved to universityId (UTN alias included). */
  @IsOptional() @IsString() @MaxLength(200) university?: string;
  /** Exact legacy career string (a tag; filter by university instead). */
  @IsOptional() @IsString() @MaxLength(200) career?: string;
  @IsOptional() @IsNumber() @Min(1) @Max(7) year?: number;
  @IsOptional() @IsNumber() @Min(1) page?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(50) limit?: number;
}

export class SuggestSubjectsQueryDto {
  @ApiProperty({ example: 'analisis 1' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  q: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 20, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}

export class CreateCommunitySubjectDto {
  /** Validated by the 3 layers in CommunitySubjectsService (3–80 chars there). */
  @ApiProperty({ example: 'Taller de Tesis' })
  @IsString()
  @MaxLength(200)
  name: string;

  /** Career tag (active, of my university). Defaults to my career. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  careerId?: string;

  /** Create even if "¿Quisiste decir…?" found something. Never skips validation. */
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class ReportSubjectDto {
  @ApiPropertyOptional({ enum: SUBJECT_REPORT_REASONS, default: 'other' })
  @IsOptional()
  @IsIn(SUBJECT_REPORT_REASONS)
  reason?: SubjectReportReason;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(300)
  details?: string;
}

// ─── Universities / careers ───────────────────────────────────────────────────

export class CreateCareerRequestDto {
  @ApiProperty() @IsUUID() universityId: string;

  @ApiProperty({ example: 'Licenciatura en Arte Digital' })
  @Transform(trimString)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  @Matches(CAREER_NAME_PATTERN, { message: CAREER_NAME_MESSAGE })
  name: string;
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
  @IsOptional() @IsNumber() @Min(2) @Max(10) maxMembers?: number;
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

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export class GlobalLeaderboardQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsUUID() universityId?: string;
  /** Deprecated: catalog name, resolved to universityId (UTN alias included). */
  @IsOptional() @IsString() @MaxLength(200) university?: string;
  /** Catalog career id; takes precedence over the university scope. */
  @IsOptional() @IsUUID() careerId?: string;
}

export class LeaderboardMeQueryDto {
  @IsOptional() @IsUUID() universityId?: string;
  /** Deprecated: catalog name, resolved to universityId (UTN alias included). */
  @IsOptional() @IsString() @MaxLength(200) university?: string;
  /** Catalog career id; takes precedence over the university scope. */
  @IsOptional() @IsUUID() careerId?: string;
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

// ─── Billing / plans ─────────────────────────────────────────────────────────

export class RedeemPromoDto {
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  code: string;
}

export class GrantPlanDto {
  @IsUUID() userId: string;
  @IsIn(PLANS) plan: string;
  /** 0 (or omitted for a paid plan) → no expiry. */
  @IsOptional() @IsInt() @Min(0) @Max(3650) days?: number;
}

export class CreatePromoCodeDto {
  @IsString() @MinLength(3) @MaxLength(40) code: string;
  @IsIn(PLANS) @IsOptional() plan?: string;
  @IsInt() @Min(1) @Max(3650) durationDays: number;
  @IsOptional() @IsInt() @Min(1) @Max(100_000) maxRedemptions?: number;
  @IsOptional() @IsInt() @Min(1) @Max(3650) expiresInDays?: number;
}

// ─── Study bot (Pro) ────────────────────────────────────────────────────────

export class AskStudyBotDto {
  @IsString() @MinLength(3) @MaxLength(500) question: string;
}

// ─── Admin (W3) ───────────────────────────────────────────────────────────────

export class AdminCareerRequestsQueryDto {
  @ApiPropertyOptional({ enum: CAREER_REQUEST_STATUSES, default: 'pending' })
  @IsOptional()
  @IsIn(CAREER_REQUEST_STATUSES)
  status?: CareerRequestStatus;
}

export class ApproveCareerRequestDto {
  @ApiPropertyOptional({
    description: 'Link this existing career instead of creating one',
  })
  @IsOptional()
  @IsUUID()
  careerId?: string;

  @ApiPropertyOptional({ example: 'Licenciatura en Arte Digital' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  @Matches(CAREER_NAME_PATTERN, { message: CAREER_NAME_MESSAGE })
  name?: string;

  @ApiPropertyOptional({ example: 'Facultad de Ingeniería' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(200)
  faculty?: string;

  @ApiPropertyOptional({ enum: CAREER_LEVELS, default: 'grado' })
  @IsOptional()
  @IsIn(CAREER_LEVELS)
  level?: CareerLevel;
}

export class RejectCareerRequestDto {
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(500)
  adminNote?: string;
}

export class AdminCommunitySubjectsQueryDto {
  @ApiProperty({ enum: ADMIN_COMMUNITY_SUBJECT_TABS })
  @IsIn(ADMIN_COMMUNITY_SUBJECT_TABS)
  tab: AdminCommunitySubjectTab;
}

export class AdminRenameSubjectDto {
  @ApiProperty({ example: 'Análisis Matemático II' })
  @IsString()
  @MinLength(SUBJECT_NAME_MIN)
  @MaxLength(SUBJECT_NAME_MAX)
  name: string;
}

export class AdminMergeSubjectsDto {
  @ApiProperty({ description: 'Subject merged away (becomes status=merged)' })
  @IsUUID()
  fromId: string;

  @ApiProperty({ description: 'Subject that keeps receiving everything' })
  @IsUUID()
  toId: string;
}
