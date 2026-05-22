import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { RequestPrismaService } from "../prisma/request-prisma.service";
import { SessionsService } from "../sessions/sessions.service";
import type { ExamTerm, ExamTermUpsert } from "@crestly/shared";

@Injectable()
export class ExamTermsService {
  constructor(
    private readonly prisma: RequestPrismaService,
    private readonly sessions: SessionsService,
  ) {}

  async list(sessionCode?: string): Promise<ExamTerm[]> {
    const code = sessionCode ?? (await this.sessions.current()).code;
    const rows = await this.prisma.db.exam_terms.findMany({
      where: { session_code: code },
      orderBy: [{ sort_order: "asc" }, { id: "asc" }],
    });
    return rows.map(toDto);
  }

  async findOne(id: number): Promise<ExamTerm> {
    const row = await this.prisma.db.exam_terms.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Term #${id} not found`);
    return toDto(row);
  }

  async create(input: ExamTermUpsert): Promise<ExamTerm> {
    const session = await this.sessions.current();
    const row = await this.prisma.db.exam_terms.create({
      data: {
        session_code: session.code,
        slug: input.slug,
        name: input.name,
        short_code: input.shortCode,
        weight_percent: input.weightPercent,
        default_max_marks: input.defaultMaxMarks,
        sort_order: input.sortOrder,
      },
    });
    return toDto(row);
  }

  async update(id: number, input: ExamTermUpsert): Promise<ExamTerm> {
    const existing = await this.prisma.db.exam_terms.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Term #${id} not found`);
    if (existing.is_finalized) {
      throw new BadRequestException("Finalized terms cannot be edited. Un-finalize first.");
    }
    const row = await this.prisma.db.exam_terms.update({
      where: { id },
      data: {
        slug: input.slug,
        name: input.name,
        short_code: input.shortCode,
        weight_percent: input.weightPercent,
        default_max_marks: input.defaultMaxMarks,
        sort_order: input.sortOrder,
      },
    });
    return toDto(row);
  }

  async delete(id: number): Promise<{ ok: true }> {
    const existing = await this.prisma.db.exam_terms.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException();
    if (existing.is_finalized) throw new BadRequestException("Cannot delete a finalized term.");
    await this.prisma.db.exam_terms.delete({ where: { id } });
    return { ok: true };
  }

  async setFinalized(id: number, finalize: boolean): Promise<ExamTerm> {
    await this.findOne(id);
    const row = await this.prisma.db.exam_terms.update({
      where: { id },
      data: { is_finalized: finalize },
    });
    return toDto(row);
  }
}

function toDto(r: {
  id: number; session_code: string; slug: string; name: string;
  short_code: string; weight_percent: { toString(): string };
  default_max_marks: number; sort_order: number; is_finalized: boolean;
}): ExamTerm {
  return {
    id: r.id,
    sessionCode: r.session_code,
    slug: r.slug,
    name: r.name,
    shortCode: r.short_code,
    weightPercent: Number(r.weight_percent),
    defaultMaxMarks: r.default_max_marks,
    sortOrder: r.sort_order,
    isFinalized: r.is_finalized,
  };
}
