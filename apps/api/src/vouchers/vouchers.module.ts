import { Module } from "@nestjs/common";
import { VouchersController } from "./vouchers.controller";
import { VouchersService } from "./vouchers.service";
import { UploadsModule } from "../uploads/uploads.module";

@Module({
  imports: [UploadsModule],
  controllers: [VouchersController],
  providers: [VouchersService],
  exports: [VouchersService],
})
export class VouchersModule {}
