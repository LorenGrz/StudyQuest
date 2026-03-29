import { PartiesService } from './parties.service';
import { SendChatMessageDto } from '../../common/dto';
export declare class PartiesController {
    private readonly partiesService;
    constructor(partiesService: PartiesService);
    getMyParties(req: any): Promise<import("./party.entity").Party[]>;
    findOne(id: string): Promise<import("./party.entity").Party>;
    getChat(id: string, limit?: number): Promise<import("./chat-message.entity").ChatMessage[]>;
    sendMessage(id: string, req: any, dto: SendChatMessageDto): Promise<import("./chat-message.entity").ChatMessage>;
}
