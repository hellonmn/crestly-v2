import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  TimetableGridQuery,
  TimetableGridResponse,
  TimetablePeriod,
  WorkloadRow,
} from "@crestly/shared";

export function useTimetable(query: TimetableGridQuery | null) {
  return useQuery({
    queryKey: ["timetable", "grid", query],
    enabled: !!query && (!!query.teacherUserId || (!!query.class && !!query.section)),
    queryFn: async () => (await api.get<TimetableGridResponse>("/timetable", { params: query })).data,
  });
}

export function useTimetablePeriods() {
  return useQuery({
    queryKey: ["timetable", "periods"],
    queryFn: async () => (await api.get<TimetablePeriod[]>("/timetable/periods")).data,
  });
}

export function useWorkload() {
  return useQuery({
    queryKey: ["timetable", "workload"],
    queryFn: async () => (await api.get<WorkloadRow[]>("/timetable/workload")).data,
  });
}
