export interface QueueCandidate {
    userId: string;
    socketId: string;
    subjectIds: string[];
    availability: {
        day: number;
        hour: number;
    }[];
    career: string;
    preferredPartySize: number;
    joinedAt: Date;
    threshold: number;
}
export interface MatchGroup {
    subjectId: string;
    members: QueueCandidate[];
}
export declare class MatchmakingService {
    private readonly logger;
    private queue;
    addToQueue(c: QueueCandidate): void;
    removeFromQueue(userId: string): void;
    isInQueue(userId: string): boolean;
    getQueueSize(): number;
    computeScore(a: QueueCandidate, b: QueueCandidate): number;
    private overlapScore;
    findMatches(): MatchGroup[];
    private groupBySubject;
    private findBestGroup;
    private pending;
    initConfirmation(matchId: string, members: string[], subjectId: string, onTimeout: () => void): void;
    acceptConfirmation(matchId: string, userId: string): {
        allAccepted: boolean;
        subjectId: string;
    };
    rejectConfirmation(matchId: string): string[];
}
