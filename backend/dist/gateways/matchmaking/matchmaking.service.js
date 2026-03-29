"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MatchmakingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchmakingService = void 0;
const common_1 = require("@nestjs/common");
let MatchmakingService = MatchmakingService_1 = class MatchmakingService {
    logger = new common_1.Logger(MatchmakingService_1.name);
    queue = new Map();
    addToQueue(c) {
        this.queue.set(c.userId, { ...c, threshold: 0.5 });
        this.logger.log(`[Queue] +${c.userId} | total: ${this.queue.size}`);
    }
    removeFromQueue(userId) {
        this.queue.delete(userId);
    }
    isInQueue(userId) {
        return this.queue.has(userId);
    }
    getQueueSize() {
        return this.queue.size;
    }
    computeScore(a, b) {
        const common = a.subjectIds.filter((s) => b.subjectIds.includes(s));
        if (common.length === 0)
            return 0;
        const subjectScore = Math.min(common.length / 3, 1) * 0.5;
        const scheduleScore = this.overlapScore(a.availability, b.availability) * 0.3;
        const careerScore = (a.career === b.career ? 1 : 0) * 0.2;
        return subjectScore + scheduleScore + careerScore;
    }
    overlapScore(a, b) {
        if (!a.length || !b.length)
            return 0.5;
        const setB = new Set(b.map((s) => `${s.day}-${s.hour}`));
        const overlap = a.filter((s) => setB.has(`${s.day}-${s.hour}`)).length;
        return Math.min(overlap / Math.min(a.length, 6), 1);
    }
    findMatches() {
        const candidates = Array.from(this.queue.values());
        if (candidates.length < 2)
            return [];
        const now = Date.now();
        for (const c of candidates) {
            const waitMs = now - c.joinedAt.getTime();
            if (waitMs > 120_000)
                c.threshold = 0.25;
            else if (waitMs > 60_000)
                c.threshold = 0.35;
        }
        const matched = new Set();
        const groups = [];
        const bySubject = this.groupBySubject(candidates);
        for (const [subjectId, group] of bySubject.entries()) {
            if (group.length < 2)
                continue;
            const partyGroup = this.findBestGroup(group, matched);
            if (partyGroup.length >= 2) {
                partyGroup.forEach((c) => matched.add(c.userId));
                groups.push({ subjectId, members: partyGroup });
            }
        }
        return groups;
    }
    groupBySubject(candidates) {
        const map = new Map();
        for (const c of candidates) {
            for (const sid of c.subjectIds) {
                if (!map.has(sid))
                    map.set(sid, []);
                map.get(sid).push(c);
            }
        }
        return map;
    }
    findBestGroup(candidates, alreadyMatched) {
        const available = candidates
            .filter((c) => !alreadyMatched.has(c.userId))
            .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
        if (available.length < 2)
            return [];
        const anchor = available[0];
        const group = [anchor];
        for (const candidate of available.slice(1)) {
            if (group.length >= anchor.preferredPartySize)
                break;
            const ok = group.every((m) => this.computeScore(m, candidate) >=
                Math.min(anchor.threshold, candidate.threshold));
            if (ok)
                group.push(candidate);
        }
        return group.length >= 2 ? group : [];
    }
    pending = new Map();
    initConfirmation(matchId, members, subjectId, onTimeout) {
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
    acceptConfirmation(matchId, userId) {
        const p = this.pending.get(matchId);
        if (!p)
            return { allAccepted: false, subjectId: '' };
        p.accepted.add(userId);
        if (p.accepted.size === p.members.length) {
            clearTimeout(p.timeoutId);
            this.pending.delete(matchId);
            return { allAccepted: true, subjectId: p.subjectId };
        }
        return { allAccepted: false, subjectId: p.subjectId };
    }
    rejectConfirmation(matchId) {
        const p = this.pending.get(matchId);
        if (!p)
            return [];
        clearTimeout(p.timeoutId);
        this.pending.delete(matchId);
        return p.members;
    }
};
exports.MatchmakingService = MatchmakingService;
exports.MatchmakingService = MatchmakingService = MatchmakingService_1 = __decorate([
    (0, common_1.Injectable)()
], MatchmakingService);
//# sourceMappingURL=matchmaking.service.js.map