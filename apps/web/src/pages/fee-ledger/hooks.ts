import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  FeeLedgerQuery,
  FeeLedgerResponse,
  RecordPaymentInput,
  StudentFeeDetail,
} from "@crestly/shared";

const KEY = ["fees"] as const;

export function useFeeLedger(query: Partial<FeeLedgerQuery>) {
  return useQuery({
    queryKey: [...KEY, "ledger", query],
    queryFn: async () => (await api.get<FeeLedgerResponse>("/fees", { params: query })).data,
  });
}

export function useStudentFee(srNumber: number | undefined) {
  return useQuery({
    queryKey: [...KEY, "student", srNumber],
    enabled: srNumber !== undefined && !Number.isNaN(srNumber),
    queryFn: async () => (await api.get<StudentFeeDetail>(`/fees/student/${srNumber}`)).data,
  });
}

export function useRecordPayment(srNumber: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RecordPaymentInput) =>
      (await api.post<StudentFeeDetail>(`/fees/student/${srNumber}/payment`, input)).data,
    onSuccess: (data) => {
      qc.setQueryData([...KEY, "student", srNumber], data);
      qc.invalidateQueries({ queryKey: [...KEY, "ledger"] });
    },
  });
}

export function useVoidPayment(srNumber: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: number; reason?: string }) =>
      (await api.post<StudentFeeDetail>(`/fees/payment/${paymentId}/void`, { reason })).data,
    onSuccess: (data) => {
      qc.setQueryData([...KEY, "student", srNumber], data);
      qc.invalidateQueries({ queryKey: [...KEY, "ledger"] });
    },
  });
}
