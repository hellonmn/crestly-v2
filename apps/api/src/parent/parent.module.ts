import { Module } from "@nestjs/common";
import { ParentController } from "./parent.controller";
import { ParentService } from "./parent.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],   // gives us JwtService for signing parent tokens
  controllers: [ParentController],
  providers: [ParentService],
})
export class ParentModule {}
