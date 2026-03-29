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
exports.PartiesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const parties_service_1 = require("./parties.service");
const dto_1 = require("../../common/dto");
let PartiesController = class PartiesController {
    partiesService;
    constructor(partiesService) {
        this.partiesService = partiesService;
    }
    getMyParties(req) {
        return this.partiesService.findByUser(req.user.userId);
    }
    findOne(id) {
        return this.partiesService.findById(id);
    }
    getChat(id, limit = 100) {
        return this.partiesService.getChatHistory(id, +limit);
    }
    sendMessage(id, req, dto) {
        return this.partiesService.addChatMessage(id, req.user.userId, dto.text);
    }
};
exports.PartiesController = PartiesController;
__decorate([
    (0, common_1.Get)('mine'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PartiesController.prototype, "getMyParties", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PartiesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/chat'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PartiesController.prototype, "getChat", null);
__decorate([
    (0, common_1.Post)(':id/chat'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, dto_1.SendChatMessageDto]),
    __metadata("design:returntype", void 0)
], PartiesController.prototype, "sendMessage", null);
exports.PartiesController = PartiesController = __decorate([
    (0, swagger_1.ApiTags)('parties'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('parties'),
    __metadata("design:paramtypes", [parties_service_1.PartiesService])
], PartiesController);
//# sourceMappingURL=parties.controller.js.map