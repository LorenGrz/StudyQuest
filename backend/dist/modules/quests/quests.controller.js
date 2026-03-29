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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const quests_service_1 = require("./quests.service");
const dto_1 = require("../../common/dto");
let QuestsController = class QuestsController {
    questsService;
    constructor(questsService) {
        this.questsService = questsService;
    }
    create(req, dto, file) {
        return this.questsService.createQuest(dto, req.user.userId, file);
    }
    findByParty(partyId) {
        return this.questsService.findByParty(partyId);
    }
    getForPlay(id) {
        return this.questsService.getQuestForPlay(id);
    }
    start(id) {
        return this.questsService.startQuest(id);
    }
    submitAnswer(dto, req) {
        return this.questsService.submitAnswer(dto, req.user.userId);
    }
    complete(id) {
        return this.questsService.completeQuest(id);
    }
};
exports.QuestsController = QuestsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiConsumes)('multipart/form-data', 'application/json'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)(new common_1.ParseFilePipe({
        validators: [
            new common_1.FileTypeValidator({ fileType: 'application/pdf' }),
            new common_1.MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
        ],
        fileIsRequired: false,
    }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreateQuestDto, Object]),
    __metadata("design:returntype", void 0)
], QuestsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('party/:partyId'),
    __param(0, (0, common_1.Param)('partyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QuestsController.prototype, "findByParty", null);
__decorate([
    (0, common_1.Get)(':id/play'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QuestsController.prototype, "getForPlay", null);
__decorate([
    (0, common_1.Post)(':id/start'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QuestsController.prototype, "start", null);
__decorate([
    (0, common_1.Post)('answer'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.SubmitAnswerDto, Object]),
    __metadata("design:returntype", void 0)
], QuestsController.prototype, "submitAnswer", null);
__decorate([
    (0, common_1.Post)(':id/complete'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QuestsController.prototype, "complete", null);
exports.QuestsController = QuestsController = __decorate([
    (0, swagger_1.ApiTags)('quests'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('quests'),
    __metadata("design:paramtypes", [quests_service_1.QuestsService])
], QuestsController);
//# sourceMappingURL=quests.controller.js.map