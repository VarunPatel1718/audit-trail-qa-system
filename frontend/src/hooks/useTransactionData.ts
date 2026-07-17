import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAuditNote, fetchTransactionDetail, fetchTransactionFlags } from '../lib/transactions'

/** Shared read-only data-loading for Transaction Details and Audit
 * Workspace, which both display the same transaction/flags/audit-note trio.
 * Centralizing the query keys here (not just the fetch calls) matters: if
 * each page built its own key array, React Query would treat "the same
 * transaction's audit note" as two separate cache entries depending on
 * which page loaded it first, and a refetch on one page wouldn't update the
 * other. */
export function useTransactionData(transactionId: number, enabled: boolean) {
  const queryClient = useQueryClient()

  const detailQuery = useQuery({
    queryKey: ['transactions', transactionId, 'detail'],
    queryFn: () => fetchTransactionDetail(transactionId),
    enabled,
    retry: false,
  })

  const flagsQuery = useQuery({
    queryKey: ['transactions', transactionId, 'flags'],
    queryFn: () => fetchTransactionFlags(transactionId),
    enabled,
  })

  const auditNoteQueryKey = ['transactions', transactionId, 'audit-note']
  const auditNoteQuery = useQuery({
    queryKey: auditNoteQueryKey,
    queryFn: () => fetchAuditNote(transactionId),
    enabled,
  })

  const refetchAuditNote = () => queryClient.invalidateQueries({ queryKey: auditNoteQueryKey })

  return { detailQuery, flagsQuery, auditNoteQuery, refetchAuditNote }
}
