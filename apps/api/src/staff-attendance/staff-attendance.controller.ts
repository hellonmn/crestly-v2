import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UsePipes } from "@nestjs/common";
import { StaffAttendanceService } from "./staff-attendance.service";
import { RequirePerm } from "../auth/require-perm.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { ZodPipe } from "../common/zod.pipe";
import { PunchCreateSchema, StaffPunchListQuerySchema } from "@crestly/shared";
import type { PunchCreateInput, StaffPunchListQuery, CurrentUser as User } from "@crestly/shared";
import type { Request } from "express";

@Controller()
export class StaffAttendanceController {
  constructor(private readonly sa: StaffAttendanceService) {}

  @Get("staff-attendance")
  @RequirePerm("staff.view_team")
  list(@Query(new ZodPipe(StaffPunchListQuerySchema)) query: StaffPunchListQuery) {
    return this.sa.list(query);
  }

  @Get("staff-attendance/:id")
  @RequirePerm("staff.view_team")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.sa.findOne(id);
  }

  @Post("punch")
  @RequirePerm("staff.punch")
  @UsePipes(new ZodPipe(PunchCreateSchema))
  punch(@Body() body: PunchCreateInput, @CurrentUser() user: User, @Req() req: Request) {
    const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
      ?? req.socket.remoteAddress ?? null;
    const ua = req.headers["user-agent"] ?? null;
    return this.sa.punch(body, user, ip, ua);
  }
}
