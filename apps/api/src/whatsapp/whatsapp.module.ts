import { Module } from "@nestjs/common";
import { WhatsappController } from "./whatsapp.controller";
import { WhatsappService } from "./whatsapp.service";
import { WhatsappDispatcher } from "./dispatcher.service";

@Module({
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappDispatcher],
  exports: [WhatsappDispatcher],
})
export class WhatsappModule {}
