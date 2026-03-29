import { Subject } from '../subjects/subject.entity';
import { PartyMember } from '../parties/party-member.entity';
export interface AvailabilitySlot {
    day: number;
    hour: number;
}
export interface UserStats {
    xp: number;
    level: number;
    quizzesPlayed: number;
    quizzesWon: number;
    currentStreak: number;
    longestStreak: number;
    lastPlayedAt: string | null;
}
export declare class User {
    id: string;
    email: string;
    passwordHash: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    university: string;
    career: string;
    semester: number;
    enrolledSubjects: Subject[];
    partyMemberships: PartyMember[];
    availability: AvailabilitySlot[];
    stats: UserStats;
    refreshTokens: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
