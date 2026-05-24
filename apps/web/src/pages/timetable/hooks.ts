import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  TimetableCellUpsert,
  TimetableGridQuery,
  TimetableGridResponse,
  TimetablePeriod,
  TimetablePeriodUpsert,
  WorkloadRow,
} from "@crestly/shared";

const KEY = ["timetable"] as const;

export function useTimetable(query: TimetableGridQuery | null) {
  return useQuery({
    queryKey: [...KEY, "grid", query],
    enabled: !!query && (!!query.teacherUserId || (!!query.class && !!query.section)),
    queryFn: async () => (await api.get<TimetableGridResponse>("/timetable", { params: query })).data,
  });
}

export function useTimetablePeriods() {
  return useQuery({
    queryKey: [...KEY, "periods"],
    queryFn: async () => (await api.get<TimetablePeriod[]>("/timetable/periods")).data,
  });
}

export function useWorkload() {
  return useQuery({
    queryKey: [...KEY, "workload"],
    queryFn: async () => (await api.get<WorkloadRow[]>("/timetable/workload")).data,
  });
}

/* ─── Mutations ──────────────────────────────────────────── */

export function useSavePeriod(id?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TimetablePeriodUpsert) => {
      if (id) return (await api.put<TimetablePeriod>(`/timetable/periods/${id}`, input)).data;
      return (await api.post<TimetablePeriod>("/timetable/periods", input)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, "periods"] });
      qc.invalidateQueries({ queryKey: [...KEY, "grid"] });
    },
  });
}

export function useDeletePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      (await api.delete<{ ok: true }>(`/timetable/periods/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, "periods"] });
      qc.invalidateQueries({ queryKey: [...KEY, "grid"] });
    },
  });
}

export function useSaveCell() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TimetableCellUpsert) =>
      (await api.post<{ ok: true; id: number }>("/timetable/cells", input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, "grid"] });
      qc.invalidateQueries({ queryKey: [...KEY, "workload"] });
    },
  });
}

export function useDeleteCell() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      (await api.delete<{ ok: true }>(`/timetable/cells/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, "grid"] });
      qc.invalidateQueries({ queryKey: [...KEY, "workload"] });
    },
  });
}
