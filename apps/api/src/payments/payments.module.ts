import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { SessionsModule } from "../sessions/sessions.module";
import { FeaturesModule } from "../features/features.module";

@Module({
  imports: [SessionsModule, FeaturesModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
