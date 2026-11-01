import { useEffect, useState } from "react";

export const PAGE_SIZE = 50;

export function usePage<T>(items: T[], resetKey: string) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  useEffect(() => {
    setPage((current) => Math.min(current, pages));
  }, [pages]);

  const safe = Math.min(page, pages);
  const start = (safe - 1) * PAGE_SIZE;

  return {
    page: safe,
    pages,
    setPage,
    slice: items.slice(start, start + PAGE_SIZE),
    total: items.length,
    from: items.length === 0 ? 0 : start + 1,
    to: Math.min(start + PAGE_SIZE, items.length),
  };
}

function pageWindow(page: number, pages: number): Array<number | "gap"> {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);
  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);
  const items: Array<number | "gap"> = [1];
  if (start > 2) items.push("gap");
  for (let number = start; number <= end; number += 1) items.push(number);
  if (end < pages - 1) items.push("gap");
  items.push(pages);
  return items;
}

type PagerProps = {
  id?: string;
  page: number;
  pages: number;
  total: number;
  from: number;
  to: number;
  onPage: (page: number) => void;
};

export function Pager({ id, page, pages, total, from, to, onPage }: PagerProps) {
  if (total === 0) return null;
  return (
    <nav id={id} className="pager" aria-label="Halaman">
      <p>
        {from}–{to} dari {total}
      </p>
      {pages > 1 && (
        <div className="pages">
          <button type="button" className="btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            Sebelumnya
          </button>
          {pageWindow(page, pages).map((item, index) =>
            item === "gap" ? (
              <span key={`gap-${index}`} aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className="btn"
                aria-current={item === page ? "page" : undefined}
                aria-label={`Halaman ${item}`}
                onClick={() => onPage(item)}
              >
                {item}
              </button>
            ),
          )}
          <button type="button" className="btn" disabled={page >= pages} onClick={() => onPage(page + 1)}>
            Berikutnya
          </button>
        </div>
      )}
    </nav>
  );
}

export function goToListPage(setPage: (page: number) => void, page: number) {
  setPage(page);
  document.getElementById("list-top")?.scrollIntoView({ block: "start" });
}

export function SkeletonRows({ rows = 8, cols }: { rows?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row} aria-hidden="true">
          {Array.from({ length: cols }, (_, col) => (
            <td key={col}>
              <span
                className="skel"
                style={{
                  width: col === 0 ? "72%" : "46%",
                  marginLeft: col === 0 ? 0 : "auto",
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function TableSkeleton({
  cols,
  label,
  rows = 8,
}: {
  cols: number;
  label: string;
  rows?: number;
}) {
  return (
    <div className="panel" role="status" aria-label={label} style={{ overflowX: "auto" }}>
      <p className="sr-only">{label}</p>
      <table className="ledger" aria-hidden="true">
        <tbody>
          <SkeletonRows rows={rows} cols={cols} />
        </tbody>
      </table>
    </div>
  );
}

export function KpiSkeleton({
  cells,
  label,
  quiet = false,
}: {
  cells: number;
  label: string;
  quiet?: boolean;
}) {
  return (
    <div
      className="kpi"
      role={quiet ? undefined : "status"}
      aria-label={quiet ? undefined : label}
      aria-hidden={quiet ? true : undefined}
      style={{ gridTemplateColumns: `repeat(${cells}, minmax(0, 1fr))` }}
    >
      {!quiet && <p className="sr-only">{label}</p>}
      {Array.from({ length: cells }, (_, index) => (
        <div key={index} aria-hidden="true">
          <span className="skel" style={{ width: "46%" }} />
          <span className="skel skel-lg" style={{ width: index === 0 ? "68%" : "52%" }} />
        </div>
      ))}
    </div>
  );
}

export function TallySkeleton() {
  return (
    <div className="tally" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <div className="skel-tally" key={index}>
          <span className="skel" style={{ width: "52%" }} />
          <span className="skel skel-lg" style={{ width: "28%" }} />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="order-grid" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <article className="order-card skel-card" key={index}>
          <header>
            <span className="skel" style={{ width: "48%" }} />
            <span className="skel" style={{ width: 72 }} />
          </header>
          <div className="body">
            <span className="skel" />
            <span className="skel" style={{ width: "74%" }} />
            <span className="skel" style={{ width: "56%" }} />
          </div>
          <footer>
            <span className="skel" style={{ width: 96 }} />
            <span className="skel" style={{ width: 128 }} />
          </footer>
        </article>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  const heights = [38, 70, 24, 88, 52, 30, 76, 44, 62, 28, 80, 46];
  return (
    <div className="chart-skel" aria-hidden="true">
      {heights.map((height, index) => (
        <span key={index} style={{ height: `${height}%` }} />
      ))}
    </div>
  );
}
