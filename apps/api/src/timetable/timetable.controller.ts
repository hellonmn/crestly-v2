import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UsePipes } from "@nestjs/common";
import { TimetableService } from "./timetable.service";
import { RequirePerm } from "../auth/require-perm.decorator";
import { ZodPipe } from "../common/zod.pipe";
import {
  TimetableCellUpsertSchema,
  TimetableGridQuerySchema,
  TimetableMasterCellDeleteSchema,
  TimetableMasterCellWriteSchema,
  TimetablePeriodUpsertSchema,
} from "@crestly/shared";
import type {
  TimetableCellUpsert,
  TimetableGridQuery,
  TimetableMasterCellDelete,
  TimetableMasterCellWrite,
  TimetablePeriodUpsert,
} from "@crestly/shared";

@Controller()
export class TimetableController {
  constructor(private readonly tt: TimetableService) {}

  @Get("timetable")
  @RequirePerm("timetable.view")
  grid(@Query(new ZodPipe(TimetableGridQuerySchema)) query: TimetableGridQuery) {
    return this.tt.grid(query);
  }

  @Get("timetable/periods")
  @RequirePerm("timetable.view")
  periods() {
    return this.tt.periods();
  }

  @Get("timetable/workload")
  @RequirePerm("timetable.view")
  workload() {
    return this.tt.workload();
  }

  /**
   * Master grid — periods × every section, single day-agnostic cell.
   * For schools whose timetable doesn't change Mon–Sat.
   */
  @Get("timetable/master")
  @RequirePerm("timetable.view")
  master() {
    return this.tt.master();
  }

  @Post("timetable/master/cell")
  @RequirePerm("timetable.manage")
  @UsePipes(new ZodPipe(TimetableMasterCellWriteSchema))
  upsertMasterCell(@Body() body: TimetableMasterCellWrite) {
    return this.tt.upsertMasterCell(body);
  }

  @Post("timetable/master/cell/delete")
  @RequirePerm("timetable.manage")
  @UsePipes(new ZodPipe(TimetableMasterCellDeleteSchema))
  deleteMasterCell(@Body() body: TimetableMasterCellDelete) {
    return this.tt.deleteMasterCell(body);
  }

  @Post("timetable/cells")
  @RequirePerm("timetable.manage")
  @UsePipes(new ZodPipe(TimetableCellUpsertSchema))
  upsertCell(@Body() body: TimetableCellUpsert) {
    return this.tt.upsertCell(body);
  }

  @Delete("timetable/cells/:id")
  @RequirePerm("timetable.manage")
  deleteCell(@Param("id", ParseIntPipe) id: number) {
    return this.tt.deleteCell(id);
  }

  @Post("timetable/periods")
  @RequirePerm("timetable.manage")
  @UsePipes(new ZodPipe(TimetablePeriodUpsertSchema))
  createPeriod(@Body() body: TimetablePeriodUpsert) {
    return this.tt.upsertPeriod(body);
  }

  @Put("timetable/periods/:id")
  @RequirePerm("timetable.manage")
  updatePeriod(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodPipe(TimetablePeriodUpsertSchema)) body: TimetablePeriodUpsert,
  ) {
    return this.tt.upsertPeriod(body, id);
  }

  @Delete("timetable/periods/:id")
  @RequirePerm("timetable.manage")
  deletePeriod(@Param("id", ParseIntPipe) id: number) {
    return this.tt.deletePeriod(id);
  }
}
