import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { RequestPrismaService } from "../prisma/request-prisma.service";
import { UploadsService } from "../uploads/uploads.service";
import type {
  PunchCreateInput,
  StaffPunch,
  StaffPunchListQuery,
  StaffPunchListResponse,
} from "@crestly/shared";
import type { CurrentUser } from "@crestly/shared";

@Injectable()
export class StaffAttendanceService {
  constructor(
    private readonly prisma: RequestPrismaService,
    private readonly uploads: UploadsService,
  ) {}

  async list(query: StaffPunchListQuery): Promise<StaffPunchListResponse> {
    const where: Prisma.staff_attendanceWhereInput = {
      ...(query.userId && { user_id: query.userId }),
      ...(query.punchType && { punch_type: query.punchType }),
      ...(query.zone === "outside" && { is_outside: true }),
      ...(query.zone === "in" && { is_outside: false }),
      ...((query.from || query.to) && {
        punched_at: {
          ...(query.from && { gte: new Date(`${query.from}T00:00:00`) }),
          ...(query.to && { lte: new Date(`${query.to}T23:59:59`) }),
        },
      }),
    };

    const [total, rows, ins, outs, outside] = await Promise.all([
      this.prisma.db.staff_attendance.count({ where }),
      this.prisma.db.staff_attendance.findMany({
        where,
        include: { users: { select: { id: true, name: true, designation: true, department: true } } },
        orderBy: { punched_at: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.db.staff_attendance.count({ where: { ...where, punch_type: "in" } }),
      this.prisma.db.staff_attendance.count({ where: { ...where, punch_type: "out" } }),
      this.prisma.db.staff_attendance.count({ where: { ...where, is_outside: true } }),
    ]);

    return {
      items: rows.map(toDto),
      total,
      page: query.page,
      pageSize: query.pageSize,
      punchIns: ins,
      punchOuts: outs,
      outsideCount: outside,
    };
  }

  async findOne(id: number): Promise<StaffPunch> {
    const row = await this.prisma.db.staff_attendance.findUnique({
      where: { id },
      include: { users: { select: { id: true, name: true, designation: true, department: true } } },
    });
    if (!row) throw new NotFoundException(`Punch #${id} not found`);
    return toDto(row);
  }

  /**
   * Save a punch event. Selfie is accepted as a base64 string and written to
   * uploads/punch_selfies/. Distance calculation against the school geofence
   * is left for Phase F (cross-cutting) — for now we store lat/lng raw and
   * mark is_outside=false. The PHP punch endpoint had the same fallback in
   * its earliest revisions.
   */
  async punch(input: PunchCreateInput, user: CurrentUser, ipAddress: string | null, userAgent: string | null): Promise<StaffPunch> {
    let selfiePath: string | null = null;
    if (input.selfieBase64) {
      const saved = await this.uploads.saveBase64("punch", `${Date.now()}.jpg`, input.selfieBase64);
      selfiePath = saved.filePath;
    }

    const row = await this.prisma.db.staff_attendance.create({
      data: {
        user_id: user.id,
        punch_type: input.punchType,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy_m: input.accuracyM ?? null,
        geofence_type: "school",
        is_outside: false,
        notes: input.notes ?? null,
        ip_address: ipAddress,
        user_agent: userAgent,
        selfie_path: selfiePath,
      },
      include: { users: { select: { id: true, name: true, designation: true, department: true } } },
    });
    return toDto(row);
  }
}

function toDto(r: {
  id: number; user_id: number; punch_type: "in" | "out"; punched_at: Date;
  latitude: { toString: () => string }; longitude: { toString: () => string };
  accuracy_m: number | null; distance_m: number | null;
  geofence_type: "school" | "pickup"; geofence_pickup_id: number | null;
  is_outside: boolean; selfie_path: string | null; notes: string | null;
  users?: { id: number; name: string; designation: string | null; department: string | null };
}): StaffPunch {
  return {
    id: r.id,
    userId: r.user_id,
    userName: r.users?.name ?? `User #${r.user_id}`,
    designation: r.users?.designation ?? null,
    department: r.users?.department ?? null,
    punchType: r.punch_type,
    punchedAt: r.punched_at.toISOString(),
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    accuracyM: r.accuracy_m,
    distanceM: r.distance_m,
    geofenceType: r.geofence_type,
    geofencePickupId: r.geofence_pickup_id,
    isOutside: r.is_outside,
    selfiePath: r.selfie_path,
    notes: r.notes,
  };
}
