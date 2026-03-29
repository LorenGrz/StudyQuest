export declare class RegisterDto {
    email: string;
    password: string;
    username: string;
    displayName: string;
    university: string;
    career: string;
    semester: number;
}
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class RefreshTokenDto {
    refreshToken: string;
}
export declare class AvailabilitySlotDto {
    day: number;
    hour: number;
}
export declare class UpdateProfileDto {
    displayName?: string;
    avatarUrl?: string;
    semester?: number;
    availability?: AvailabilitySlotDto[];
}
export declare class EnrollSubjectDto {
    subjectId: string;
}
export declare class CreateSubjectDto {
    name: string;
    code: string;
    description?: string;
    university: string;
    career: string;
    semester: number;
}
export declare class SubjectQueryDto {
    search?: string;
    university?: string;
    career?: string;
    semester?: number;
    page?: number;
    limit?: number;
}
export declare class JoinQueueDto {
    subjectIds: string[];
    availability: AvailabilitySlotDto[];
    preferredPartySize: number;
}
export declare class SendChatMessageDto {
    text: string;
}
export declare class CreateQuestDto {
    partyId: string;
    title: string;
    textContent?: string;
}
export declare class SubmitAnswerDto {
    questId: string;
    questionIndex: number;
    selectedOption: number;
    timeSpentMs: number;
}
