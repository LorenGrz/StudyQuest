"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const quest_entity_1 = require("./quest.entity");
const quiz_question_entity_1 = require("./quiz-question.entity");
const quiz_option_entity_1 = require("./quiz-option.entity");
const player_result_entity_1 = require("./player-result.entity");
const quests_service_1 = require("./quests.service");
const quests_controller_1 = require("./quests.controller");
const ai_module_1 = require("../ai/ai.module");
const parties_module_1 = require("../parties/parties.module");
const users_module_1 = require("../users/users.module");
let QuestsModule = class QuestsModule {
};
exports.QuestsModule = QuestsModule;
exports.QuestsModule = QuestsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([quest_entity_1.Quest, quiz_question_entity_1.QuizQuestion, quiz_option_entity_1.QuizOption, player_result_entity_1.PlayerResult]),
            ai_module_1.AiModule,
            parties_module_1.PartiesModule,
            users_module_1.UsersModule,
        ],
        controllers: [quests_controller_1.QuestsController],
        providers: [quests_service_1.QuestsService],
        exports: [quests_service_1.QuestsService],
    })
], QuestsModule);
//# sourceMappingURL=quests.module.js.map