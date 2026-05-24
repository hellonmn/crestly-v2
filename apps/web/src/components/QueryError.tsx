import { Icon } from "@crestly/icons";
import { getErrorMessage } from "@/lib/api";

/**
 * Inline error banner for failed React Query reads.
 *
 * Distinguishes "API failed" from "no data exists" — without this,
 * pages render their empty-state for both, which looks identical
 * to the user and is the root cause of the "kabhi kabhi data 0
 * dikha raha hai" reports.
 *
 * Pass the query's `error` + `refetch` straight through. Renders
 * nothing when `error` is falsy so callers can drop it inline.
 *
 *   const q = useThing();
 *   <QueryError error={q.error} refetch={q.refetch} isFetching={q.isFetching} />
 *   {q.isLoading ? <Skeleton /> : q.error ? null : ...}
 */
export function QueryError({
  error, refetch, isFetching, label,
}: {
  error: unknown;
  refetch?: () => void;
  isFetching?: boolean;
  /** Optional context, e.g. "periods" → "Couldn't load periods." */
  label?: string;
}) {
  if (!error) return null;
  const detail = getErrorMessage(error, "");
  const head = label ? `Couldn't load ${label}.` : "Couldn't load.";
  return (
    <div className="banner banner--error" role="alert">
      <Icon name="alert" size={16} />
      <span>
        <b>{head}</b>
        {detail && <> {detail}</>}
      </span>
      {refetch && (
        <button
          type="button"
          className="banner__link"
          style={{ marginLeft: "auto", background: "transparent", border: 0, cursor: "pointer", font: "inherit", textDecoration: "underline" }}
          onClick={() => refetch()}
          disabled={!!isFetching}
        >
          {isFetching ? "Retrying…" : "Retry"}
        </button>
      )}
    </div>
  );
}
