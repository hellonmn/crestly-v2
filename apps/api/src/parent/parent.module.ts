import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ParentController } from "./parent.controller";
import { ParentService } from "./parent.service";

@Module({
  imports: [
    // Sign parent tokens with the same secret as the staff side — one
    // JwtService instance per module is the Nest-blessed pattern, since
    // the core AuthModule doesn't re-export its JwtModule.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        // Parent sessions can be longer-lived than staff sessions — most
        // parents log in once and stay logged in for the term.
        signOptions: { expiresIn: config.get<string>("PARENT_JWT_EXPIRES_IN", "30d") },
      }),
    }),
  ],
  controllers: [ParentController],
  providers: [ParentService],
})
export class ParentModule {}
