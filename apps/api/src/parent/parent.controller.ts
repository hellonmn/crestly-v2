import { Body, Controller, Get, Post, UsePipes } from "@nestjs/common";
import { ParentService } from "./parent.service";
import { ZodPipe } from "../common/zod.pipe";
import { Public } from "../auth/public.decorator";
import { ParentLoginInputSchema } from "@crestly/shared";
import type { ParentLoginInput } from "@crestly/shared";

@Controller("parent")
export class ParentController {
  constructor(private readonly parent: ParentService) {}

  /** Public — used by the parent login page to render "School name" in
   *  the header before any token exists. Returns only the school name,
   *  nothing else, so it's safe to expose unauthenticated. */
  @Public()
  @Get("school-info")
  schoolInfo() {
    return this.parent.schoolInfo();
  }

  /** Public login route — parent has no token yet at this point. */
  @Public()
  @Post("login")
  @UsePipes(new ZodPipe(ParentLoginInputSchema))
  login(@Body() body: ParentLoginInput) {
    return this.parent.login(body);
  }
}
