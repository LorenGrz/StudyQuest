"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subject = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../users/user.entity");
const party_entity_1 = require("../parties/party.entity");
let Subject = class Subject {
    id;
    name;
    code;
    description;
    university;
    career;
    semester;
    enrolledCount;
    isActive;
    enrolledUsers;
    parties;
    createdAt;
    updatedAt;
};
exports.Subject = Subject;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Subject.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], Subject.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20 }),
    __metadata("design:type", String)
], Subject.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, default: null }),
    __metadata("design:type", Object)
], Subject.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200 }),
    __metadata("design:type", String)
], Subject.prototype, "university", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200 }),
    __metadata("design:type", String)
], Subject.prototype, "career", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'smallint' }),
    __metadata("design:type", Number)
], Subject.prototype, "semester", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'enrolled_count', default: 0 }),
    __metadata("design:type", Number)
], Subject.prototype, "enrolledCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], Subject.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => user_entity_1.User, (u) => u.enrolledSubjects),
    __metadata("design:type", Array)
], Subject.prototype, "enrolledUsers", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => party_entity_1.Party, (p) => p.subject),
    __metadata("design:type", Array)
], Subject.prototype, "parties", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Subject.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Subject.prototype, "updatedAt", void 0);
exports.Subject = Subject = __decorate([
    (0, typeorm_1.Entity)('subjects'),
    (0, typeorm_1.Unique)(['code', 'university']),
    (0, typeorm_1.Index)(['university', 'career', 'semester'])
], Subject);
//# sourceMappingURL=subject.entity.js.map