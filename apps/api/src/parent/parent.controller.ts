import { Body, Controller, Post, UsePipes } from "@nestjs/common";
import { ParentService } from "./parent.service";
import { ZodPipe } from "../common/zod.pipe";
import { Public } from "../auth/public.decorator";
import { ParentLoginInputSchema } from "@crestly/shared";
import type { ParentLoginInput } from "@crestly/shared";

@Controller("parent")
export class ParentController {
  constructor(private readonly parent: ParentService) {}

  /** Public login route — parent has no token yet at this point. */
  @Public()
  @Post("login")
  @UsePipes(new ZodPipe(ParentLoginInputSchema))
  login(@Body() body: ParentLoginInput) {
    return this.parent.login(body);
  }
}
