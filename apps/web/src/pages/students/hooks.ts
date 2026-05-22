import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Student, StudentListQuery, StudentListResponse, StudentUpsert } from "@crestly/shared";

const KEY = ["students"] as const;

export function useStudents(query: Partial<StudentListQuery>) {
  return useQuery({
    queryKey: [...KEY, "list", query],
    queryFn: async () => {
      const { data } = await api.get<StudentListResponse>("/students", { params: query });
      return data;
    },
  });
}

export function useStudent(srNumber: number | undefined) {
  return useQuery({
    queryKey: [...KEY, "one", srNumber],
    enabled: srNumber !== undefined && !Number.isNaN(srNumber),
    queryFn: async () => {
      const { data } = await api.get<Student>(`/students/${srNumber}`);
      return data;
    },
  });
}

export function useSaveStudent(srNumber: number | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: StudentUpsert) => {
      if (srNumber !== undefined) {
        const { data } = await api.put<Student>(`/students/${srNumber}`, input);
        return data;
      }
      const { data } = await api.post<Student>("/students", input);
      return data;
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: [...KEY, "list"] });
      qc.setQueryData([...KEY, "one", saved.srNumber], saved);
    },
  });
}
