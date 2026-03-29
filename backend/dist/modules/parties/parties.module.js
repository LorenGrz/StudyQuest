"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartiesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const party_entity_1 = require("./party.entity");
const party_member_entity_1 = require("./party-member.entity");
const chat_message_entity_1 = require("./chat-message.entity");
const parties_service_1 = require("./parties.service");
const parties_controller_1 = require("./parties.controller");
let PartiesModule = class PartiesModule {
};
exports.PartiesModule = PartiesModule;
exports.PartiesModule = PartiesModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([party_entity_1.Party, party_member_entity_1.PartyMember, chat_message_entity_1.ChatMessage])],
        controllers: [parties_controller_1.PartiesController],
        providers: [parties_service_1.PartiesService],
        exports: [parties_service_1.PartiesService, typeorm_1.TypeOrmModule],
    })
], PartiesModule);
//# sourceMappingURL=parties.module.js.map