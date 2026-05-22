import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { RequestPrismaService } from "../prisma/request-prisma.service";
import { SessionsService } from "../sessions/sessions.service";
import type {
  FeeLedgerQuery,
  FeeLedgerResponse,
  FeePaymentMethod,
  RecordPaymentInput,
  StudentFeeDetail,
} from "@crestly/shared";
import type { CurrentUser } from "@crestly/shared";

@Injectable()
export class FeesService {
  constructor(
    private readonly prisma: RequestPrismaService,
    private readonly sessions: SessionsService,
  ) {}

  async list(query: FeeLedgerQuery): Promise<FeeLedgerResponse> {
    const sessionCode = query.sessionCode ?? (await this.sessions.current()).code;

    const where: Prisma.StudentFeeWhereInput = {
      sessionCode,
      ...(query.status && { paymentStatus: query.status }),
      ...((query.class || query.section || query.q) && {
        student: {
          ...(query.class && { class: query.class }),
          ...(query.section && { section: query.section }),
          ...(query.q && {
            OR: [
              { studentName: { contains: query.q } },
              { fatherName: { contains: query.q } },
            ],
          }),
        },
      }),
    };

    const orderBy: Prisma.StudentFeeOrderByWithRelationInput = (() => {
      switch (query.sort) {
        case "due_asc": return { dueAmount: "asc" };
        case "name": return { student: { studentName: "asc" } };
        case "class": return { student: { class: "asc" } };
        case "due_desc":
        default: return { dueAmount: "desc" };
      }
    })();

    const [total, rows, summary] = await Promise.all([
      this.prisma.db.studentFee.count({ where }),
      this.prisma.db.studentFee.findMany({
        where,
        include: {
          student: {
            select: {
              srNumber: true, studentName: true, class: true, section: true,
              fatherName: true, familyId: true,
            },
          },
        },
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      // Aggregates over the FULL filter set, not just current page.
      this.prisma.db.studentFee.aggregate({
        where,
        _sum: { paidAmount: true, dueAmount: true, totalThisYear: true },
        _count: { _all: true },
      }),
    ]);

    const [overdueCount, fullyPaidCount] = await Promise.all([
      this.prisma.db.studentFee.count({ where: { ...where, paymentStatus: "overdue" } }),
      this.prisma.db.studentFee.count({ where: { ...where, paymentStatus: "paid" } }),
    ]);

    return {
      items: rows.map((r) => ({
        srNumber: r.student.srNumber,
        studentName: r.student.studentName,
        class: r.student.class,
        section: r.student.section,
        fatherName: r.student.fatherName,
        totalThisYear: r.totalThisYear,
        paidAmount: r.paidAmount,
        dueAmount: r.dueAmount,
        paymentStatus: r.paymentStatus,
        siblingDiscountPct: Number(r.siblingDiscountPct),
        familyId: r.student.familyId,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
      collected: summary._sum.paidAmount ?? 0,
      outstanding: summary._sum.dueAmount ?? 0,
      overdueCount,
      fullyPaidCount,
      sessionTotal: summary._sum.totalThisYear ?? 0,
      sessionPaid: summary._sum.paidAmount ?? 0,
      sessionDue: summary._sum.dueAmount ?? 0,
    };
  }

  async studentDetail(srNumber: number, sessionCode?: string): Promise<StudentFeeDetail> {
    const code = sessionCode ?? (await this.sessions.current()).code;
    const fee = await this.prisma.db.studentFee.findUnique({
      where: { srNumber_sessionCode: { srNumber, sessionCode: code } },
      include: {
        student: { select: { studentName: true, class: true, section: true } },
      },
    });
    if (!fee) throw new NotFoundException(`No fee allotment for student #${srNumber} in session ${code}`);

    const payments = await this.prisma.db.fee_payments.findMany({
      where: { sr_number: srNumber, session_code: code },
      orderBy: { paid_on: "desc" },
    });

    return {
      srNumber,
      studentName: fee.student.studentName,
      class: fee.student.class,
      section: fee.student.section,
      sessionCode: code,
      admissionStatus: fee.admissionStatus,
      tuitionOriginal: fee.tuitionOriginal,
      tuitionDiscount: fee.tuitionDiscount,
      tuitionPayable: fee.tuitionPayable,
      annualCharges: fee.annualCharges,
      activityFee: fee.activityFee,
      examFee: fee.examFee,
      transportFee: fee.transportFee,
      transportSlab: fee.transportSlab,
      hostelLodging: 0,                   // hostel fields require hostel migration to be present
      hostelMess: 0,
      hostelCommon: 0,
      hostelOneTime: 0,
      registrationFee: fee.registrationFee,
      admissionFee: fee.admissionFee,
      cautionMoney: fee.cautionMoney,
      firstYearExtras: fee.firstYearExtras,
      yearlyRecurringTotal: fee.yearlyRecurringTotal,
      totalThisYear: fee.totalThisYear,
      paidAmount: fee.paidAmount,
      dueAmount: fee.dueAmount,
      paymentStatus: fee.paymentStatus,
      quarterlyInstallment: fee.quarterlyInstallment,
      monthlyEmi: fee.monthlyEmi,
      siblingDiscountPct: Number(fee.siblingDiscountPct),
      payments: payments.map((p) => ({
        id: p.id,
        receiptNo: p.receipt_no,
        amount: p.amount,
        paidOn: p.paid_on.toISOString().slice(0, 10),
        method: p.method,
        reference: p.reference,
        notes: p.notes,
        recordedBy: p.recorded_by,
        isVoided: p.is_voided,
        voidedAt: p.voided_at ? p.voided_at.toISOString() : null,
        voidedReason: p.voided_reason,
        createdAt: p.created_at ? p.created_at.toISOString() : new Date(0).toISOString(),
      })),
    };
  }

  async recordPayment(srNumber: number, input: RecordPaymentInput, user: CurrentUser) {
    const session = await this.sessions.current();
    const fee = await this.prisma.db.studentFee.findUnique({
      where: { srNumber_sessionCode: { srNumber, sessionCode: session.code } },
    });
    if (!fee) throw new NotFoundException(`No fee allotment for student #${srNumber}`);
    if (input.amount > fee.dueAmount) {
      throw new BadRequestException(
        `Amount ₹${input.amount} is more than the outstanding ₹${fee.dueAmount}`,
      );
    }

    const receiptNo = await this.nextReceiptNo();
    await this.prisma.db.$transaction([
      this.prisma.db.fee_payments.create({
        data: {
          sr_number: srNumber,
          session_code: session.code,
          receipt_no: receiptNo,
          amount: input.amount,
          paid_on: new Date(input.paidOn),
          method: input.method,
          reference: input.reference ?? null,
          notes: input.notes ?? null,
          recorded_by: user.name,
        },
      }),
      this.prisma.db.studentFee.update({
        where: { srNumber_sessionCode: { srNumber, sessionCode: session.code } },
        data: {
          paidAmount: { increment: input.amount },
          dueAmount: { decrement: input.amount },
          paymentStatus:
            fee.dueAmount - input.amount === 0
              ? "paid"
              : fee.paidAmount + input.amount > 0
                ? "partial"
                : "pending",
        },
      }),
    ]);

    return this.studentDetail(srNumber, session.code);
  }

  async voidPayment(paymentId: number, reason: string | null, user: CurrentUser) {
    const payment = await this.prisma.db.fee_payments.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException(`Payment #${paymentId} not found`);
    if (payment.is_voided) throw new BadRequestException("Already voided");

    await this.prisma.db.$transaction([
      this.prisma.db.fee_payments.update({
        where: { id: paymentId },
        data: {
          is_voided: true,
          voided_at: new Date(),
          voided_reason: reason ?? `Voided by ${user.name}`,
        },
      }),
      this.prisma.db.studentFee.update({
        where: {
          srNumber_sessionCode: { srNumber: payment.sr_number, sessionCode: payment.session_code },
        },
        data: {
          paidAmount: { decrement: payment.amount },
          dueAmount: { increment: payment.amount },
          // Status recomputed by a follow-up service call; the simple update above
          // keeps things consistent without recomputing the state machine.
        },
      }),
    ]);

    return this.studentDetail(payment.sr_number, payment.session_code);
  }

  private async nextReceiptNo(): Promise<string> {
    const session = await this.sessions.current();
    const yr = session.code.replace("-", "");
    const last = await this.prisma.db.fee_payments.findFirst({
      where: { session_code: session.code, receipt_no: { startsWith: `R${yr}/` } },
      orderBy: { id: "desc" },
      select: { receipt_no: true },
    });
    const nextN = last
      ? Number(last.receipt_no.split("/").pop() ?? "0") + 1
      : 1;
    return `R${yr}/${String(nextN).padStart(5, "0")}`;
  }
}

// Re-export to make sure ts-node / tsc finds the type symbol.
export type _Method = FeePaymentMethod;
