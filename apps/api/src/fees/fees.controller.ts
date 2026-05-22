import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UsePipes } from "@nestjs/common";
import { FeesService } from "./fees.service";
import { RequirePerm } from "../auth/require-perm.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { ZodPipe } from "../common/zod.pipe";
import { FeeLedgerQuerySchema, RecordPaymentSchema } from "@crestly/shared";
import type {
  FeeLedgerQuery,
  RecordPaymentInput,
  CurrentUser as User,
} from "@crestly/shared";
import { z } from "zod";

const VoidPaymentSchema = z.object({ reason: z.string().max(255).nullable().optional() });

@Controller("fees")
export class FeesController {
  constructor(private readonly fees: FeesService) {}

  @Get()
  @RequirePerm("fees.view")
  list(@Query(new ZodPipe(FeeLedgerQuerySchema)) query: FeeLedgerQuery) {
    return this.fees.list(query);
  }

  @Get("student/:srNumber")
  @RequirePerm("fees.view")
  studentDetail(@Param("srNumber", ParseIntPipe) srNumber: number) {
    return this.fees.studentDetail(srNumber);
  }

  @Post("student/:srNumber/payment")
  @RequirePerm("fees.manage")
  recordPayment(
    @Param("srNumber", ParseIntPipe) srNumber: number,
    @Body(new ZodPipe(RecordPaymentSchema)) body: RecordPaymentInput,
    @CurrentUser() user: User,
  ) {
    return this.fees.recordPayment(srNumber, body, user);
  }

  @Post("payment/:id/void")
  @RequirePerm("fees.manage")
  voidPayment(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodPipe(VoidPaymentSchema)) body: z.infer<typeof VoidPaymentSchema>,
    @CurrentUser() user: User,
  ) {
    return this.fees.voidPayment(id, body.reason ?? null, user);
  }
}
