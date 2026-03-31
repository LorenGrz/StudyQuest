import { Injectable, Logger } from '@nestjs/common';

export interface QueueCandidate {
  userId: string;
  socketId: string;
  subjectIds: string[];
  availability: { day: number; hour: number }[];
  career: string;
  preferredPartySize: number;
  joinedAt: Date;
  threshold: number;
}

export interface MatchGroup {
  subjectId: string;
  members: QueueCandidate[];
}

@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name);
  private queue = new Map<string, QueueCandidate>();

  addToQueue(c: QueueCandidate): void {
    this.queue.set(c.userId, { ...c, threshold: 0.5 });
    this.logger.log(`[Queue] +${c.userId} | total: ${this.queue.size}`);
  }

  removeFromQueue(userId: string): void {
    this.queue.delete(userId);
  }

  isInQueue(userId: string): boolean {
    return this.queue.has(userId);
  }

  getQueueSize(): number {
    return this.queue.size;
  }

  computeScore(a: QueueCandidate, b: QueueCandidate): number {
    const common = a.subjectIds.filter((s) => b.subjectIds.includes(s));
    if (common.length === 0) return 0;

    const subjectScore = Math.min(common.length / 3, 1) * 0.5;
    const scheduleScore =
      this.overlapScore(a.availability, b.availability) * 0.3;
    const careerScore = (a.career === b.career ? 1 : 0) * 0.2;
    return subjectScore + scheduleScore + careerScore;
  }

  private overlapScore(
    a: { day: number; hour: number }[],
    b: { day: number; hour: number }[],
  ): number {
    if (!a.length || !b.length) return 0.5;
    const setB = new Set(b.map((s) => `${s.day}-${s.hour}`));
    const overlap = a.filter((s) => setB.has(`${s.day}-${s.hour}`)).length;
    return Math.min(overlap / Math.min(a.length, 6), 1);
  }

  findMatches(): MatchGroup[] {
    const candidates = Array.from(this.queue.values());
    if (candidates.length < 2) return [];

    const now = Date.now();
    for (const c of candidates) {
      const waitMs = now - c.joinedAt.getTime();
      if (waitMs > 120_000) c.threshold = 0.25;
      else if (waitMs > 60_000) c.threshold = 0.35;
    }

    const matched = new Set<string>();
    const groups: MatchGroup[] = [];
    const bySubject = this.groupBySubject(candidates);

    for (const [subjectId, group] of bySubject.entries()) {
      if (group.length < 2) continue;
      const partyGroup = this.findBestGroup(group, matched);
      if (partyGroup.length >= 2) {
        partyGroup.forEach((c) => matched.add(c.userId));
        groups.push({ subjectId, members: partyGroup });
      }
    }
    return groups;
  }

  private groupBySubject(
    candidates: QueueCandidate[],
  ): Map<string, QueueCandidate[]> {
    const map = new Map<string, QueueCandidate[]>();
    for (const c of candidates) {
      for (const sid of c.subjectIds) {
        if (!map.has(sid)) map.set(sid, []);
        map.get(sid)!.push(c);
      }
    }
    return map;
  }

  private findBestGroup(
    candidates: QueueCandidate[],
    alreadyMatched: Set<string>,
  ): QueueCandidate[] {
    const available = candidates
      .filter((c) => !alreadyMatched.has(c.userId))
      .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());

    if (available.length < 2) return [];

    const anchor = available[0];
    const group: QueueCandidate[] = [anchor];

    for (const candidate of available.slice(1)) {
      if (group.length >= anchor.preferredPartySize) break;
      const ok = group.every(
        (m) =>
          this.computeScore(m, candidate) >=
          Math.min(anchor.threshold, candidate.threshold),
      );
      if (ok) group.push(candidate);
    }

    return group.length >= 2 ? group : [];
  }

  private pending = new Map<
    string,
    {
      members: string[];
      accepted: Set<string>;
      subjectId: string;
      timeoutId: NodeJS.Timeout;
    }
  >();

  initConfirmation(
    matchId: string,
    members: string[],
    subjectId: string,
    onTimeout: () => void,
  ): void {
    const timeoutId = setTimeout(() => {
      this.pending.delete(matchId);
      onTimeout();
    }, 30_000);
    this.pending.set(matchId, {
      members,
      accepted: new Set(),
      subjectId,
      timeoutId,
    });
  }

  acceptConfirmation(
    matchId: string,
    userId: string,
  ): { allAccepted: boolean; subjectId: string } {
    const p = this.pending.get(matchId);
    if (!p) return { allAccepted: false, subjectId: '' };
    p.accepted.add(userId);
    if (p.accepted.size === p.members.length) {
      clearTimeout(p.timeoutId);
      this.pending.delete(matchId);
      return { allAccepted: true, subjectId: p.subjectId };
    }
    return { allAccepted: false, subjectId: p.subjectId };
  }

  rejectConfirmation(matchId: string): string[] {
    const p = this.pending.get(matchId);
    if (!p) return [];
    clearTimeout(p.timeoutId);
    this.pending.delete(matchId);
    return p.members;
  }
}
