import React, { useEffect, useMemo, useState } from "react";
import { apiGet } from "../api.js";
import { useMode } from "../context/ModeContext.jsx";
import { DashboardPanelCard } from "@/components/encounter/DashboardPanelCard.jsx";
import { cn } from "@/lib/utils";

const AUDIT_LIMIT = 5;

function lastFive(items) {
  const list = [...(items || [])];
  list.sort((a, b) => String(b.viewed_at || "").localeCompare(String(a.viewed_at || "")));
  return list.slice(0, AUDIT_LIMIT);
}

function fmtWhen(raw) {
  if (raw == null || raw === "") return "-";
  const s = String(raw);
  if (s.length <= 19) return s.replace("T", " ");
  return `${s.slice(0, 10)} ${s.slice(11, 16)}`;
}

function WalletSolHint({ status }) {
  if (!status || !status.configured || status.can_write_chain) return null;
  const pk = status.public_key;
  return (
    <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-2 text-[0.65rem] leading-snug text-amber-100 sm:text-xs">
      <p className="font-medium text-foreground">Signatures need devnet SOL</p>
      <p className="mt-1 text-muted-foreground">
        The signing wallet has no test SOL, so memo transactions cannot pay fees. Add devnet SOL to{" "}
        {pk ? (
          <span className="font-mono text-foreground" title={pk}>
            {pk.slice(0, 8)}…{pk.slice(-6)}
          </span>
        ) : (
          "the wallet"
        )}{" "}
        via{" "}
        <a
          href="https://faucet.solana.com/"
          target="_blank"
          rel="noreferrer"
          className="text-primary underline decoration-primary/50"
        >
          faucet.solana.com
        </a>
        , then open a patient again.
      </p>
      {status.hint ? <p className="mt-1 text-muted-foreground">{status.hint}</p> : null}
    </div>
  );
}

function AuditTable({ rows, compact }) {
  return (
    <div
      className={cn(
        "app-surface-inset overflow-hidden",
        compact ? "max-h-[220px] overflow-y-auto" : ""
      )}
    >
      <table className="w-full table-fixed border-collapse text-left text-[0.65rem] leading-tight sm:text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="w-[24%] px-2 py-1.5 font-semibold text-muted-foreground">Type</th>
            <th className="w-[36%] px-2 py-1.5 font-semibold text-muted-foreground">When</th>
            <th className="w-[40%] px-2 py-1.5 font-semibold text-muted-foreground">Signature</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-2 py-3 text-center text-muted-foreground">
                No access entries yet.
              </td>
            </tr>
          ) : (
            rows.map((x, i) => (
              <tr key={i} className="border-b border-border last:border-b-0">
                <td className="truncate px-2 py-1.5 align-middle" title={x.accessor_type || ""}>
                  {x.accessor_type || "-"}
                </td>
                <td className="truncate px-2 py-1.5 align-middle font-mono text-[0.6rem] sm:text-[0.7rem]" title={String(x.viewed_at || "")}>
                  {fmtWhen(x.viewed_at)}
                </td>
                <td className="truncate px-2 py-1.5 align-middle font-mono text-[0.6rem] sm:text-[0.7rem]">
                  {x.solana_signature ? (
                    <a
                      href={`https://explorer.solana.com/tx/${x.solana_signature}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline decoration-primary/40 underline-offset-2"
                      title={x.solana_signature}
                    >
                      {(x.solana_signature || "").slice(0, 10)}…
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * @param {object} props
 * @param {string} props.encounterId
 * @param {boolean} [props.embedded] — no outer panel card; for nesting inside another card
 */
export default function SolanaLog({ encounterId, embedded = false }) {
  const { isPatientMode } = useMode();
  const [items, setItems] = useState([]);
  const [walletStatus, setWalletStatus] = useState(null);
  const [logFetchError, setLogFetchError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      apiGet(`/solana/access-log/${encodeURIComponent(encounterId)}`)
        .then((d) => {
          if (!cancelled) {
            setItems(d.items || []);
            setLogFetchError("");
          }
        })
        .catch(() => {
          if (!cancelled) {
            setItems([]);
            setLogFetchError("Access log unavailable (API or database). Signatures may still appear after refresh.");
          }
        });
    };
    // Access rows are written in a FastAPI background task after GET /patient returns; refetch so the table fills in.
    load();
    const t1 = setTimeout(load, 600);
    const t2 = setTimeout(load, 2000);
    return () => {
      cancelled = true;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [encounterId]);

  useEffect(() => {
    apiGet("/solana/wallet-status")
      .then(setWalletStatus)
      .catch(() => setWalletStatus(null));
  }, []);

  const displayed = useMemo(() => lastFive(items), [items]);

  const caption = `Showing the ${AUDIT_LIMIT} most recent entries.`;

  if (isPatientMode) {
    const inner = (
      <div className="space-y-2">
        {logFetchError ? (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[0.65rem] text-amber-950 dark:text-amber-100">
            {logFetchError}
          </p>
        ) : null}
        <WalletSolHint status={walletStatus} />
        <p className="text-xs text-foreground">This list shows who opened your care summary.</p>
        <p className="text-[0.65rem] text-muted-foreground">{caption}</p>
        <AuditTable rows={displayed} compact />
      </div>
    );

    if (embedded) {
      return inner;
    }

    return (
      <DashboardPanelCard title="Your Care Record Access" contentClassName="!px-4 pb-4">
        {inner}
      </DashboardPanelCard>
    );
  }

  const clinicianInner = (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="risk-badge risk-mod inline-block max-w-full truncate text-[0.65rem] sm:text-xs">
          Verified access log
        </span>
      </div>
      {logFetchError ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[0.65rem] text-amber-950 dark:text-amber-100">
          {logFetchError}
        </p>
      ) : null}
      <WalletSolHint status={walletStatus} />
      <p className="text-[0.65rem] text-muted-foreground">{caption}</p>
      <AuditTable rows={displayed} compact />
    </div>
  );

  if (embedded) {
    return (
      <div className="app-surface-inset p-3">
        <p className="mb-2 text-sm font-semibold text-foreground">Blockchain Audit Trail</p>
        {clinicianInner}
      </div>
    );
  }

  return (
    <DashboardPanelCard title="Blockchain Audit Trail" contentClassName="!px-4 pb-4">
      {clinicianInner}
    </DashboardPanelCard>
  );
}
