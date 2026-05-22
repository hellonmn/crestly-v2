import { Module } from "@nestjs/common";
import { ExamsController } from "./exams.controller";
import { ExamTermsService } from "./terms.service";
import { ExamSubjectsService } from "./subjects.service";
import { ExamDatesheetService } from "./datesheet.service";
import { ExamMarksService } from "./marks.service";
import { ExamCoScholasticService } from "./co-scholastic.service";
import { ExamResultsService } from "./results.service";
import { SessionsModule } from "../sessions/sessions.module";

@Module({
  imports: [SessionsModule],
  controllers: [ExamsController],
  providers: [
    ExamTermsService,
    ExamSubjectsService,
    ExamDatesheetService,
    ExamMarksService,
    ExamCoScholasticService,
    ExamResultsService,
  ],
})
export class ExamsModule {}
