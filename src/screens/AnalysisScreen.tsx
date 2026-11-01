import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { RefreshCcw } from "lucide-react";
import FirestoreService, {
  type OrderDocument,
} from "../services/FirestoreService";
import { ChartSkeleton, KpiSkeleton } from "../components/ListPage.tsx";

const STATUS_META: {
  key: "terjual" | "hnr";
  label: string;
  color: string;
}[] = [
  { key: "terjual", label: "Terjual", color: "#1b6c80" },
  { key: "hnr", label: "HnR", color: "#c4242a" },
];

const TERJUAL_STATUSES: OrderDocument["status"][] = [
  "pending",
  "packing",
  "sent",
];

type Mode = "daily" | "monthly";
type ChartType = "line" | "bar";

const AnalysisScreen: React.FC = () => {
  const [orders, setOrders] = useState<OrderDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("daily");
  const [chartType, setChartType] = useState<ChartType>("line");

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await FirestoreService.getCollection(
        "orders",
        "created_at",
        "desc",
      );
      setOrders(data as OrderDocument[]);
    } catch (error) {
      console.error("Error fetching orders for analysis:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const chartData = useMemo(() => {
    const buckets = new Map<
      string,
      { label: string; orders: OrderDocument[] }
    >();

    for (const order of orders) {
      if (!order.created_at) continue;
      const d = new Date(order.created_at);
      let key: string;
      let label: string;
      if (mode === "daily") {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        label = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
      }
      if (!buckets.has(key)) buckets.set(key, { label, orders: [] });
      buckets.get(key)!.orders.push(order);
    }

    const total = (list: OrderDocument[]) =>
      list.reduce((sum, o) => {
        const items = o.orders?.reduce((s, i) => s + (i.price || 0), 0) || 0;
        const packing = o.is_packing_fee_applied ? 2000 : 0;
        return sum + items + packing;
      }, 0);

    const rows = Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, bucket]) => {
        const row: Record<string, string | number> = {
          key,
          label: bucket.label,
        };
        for (const meta of STATUS_META) {
          row[meta.key] = total(
            bucket.orders.filter((o) =>
              meta.key === "hnr"
                ? o.status === "hnr"
                : TERJUAL_STATUSES.includes(o.status || "pending"),
            ),
          );
        }
        return row;
      });

    // Most recent first for bars; chronological order for the line trend
    return chartType === "line" ? rows.slice(-60) : rows.slice(-60).reverse();
  }, [orders, mode, chartType]);

  const statusTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const meta of STATUS_META) {
      totals.set(
        meta.key,
        orders
          .filter((o) =>
            meta.key === "hnr"
              ? o.status === "hnr"
              : TERJUAL_STATUSES.includes(o.status || "pending"),
          )
          .reduce((sum, o) => {
            const items =
              o.orders?.reduce((s, i) => s + (i.price || 0), 0) || 0;
            const packing = o.is_packing_fee_applied ? 2000 : 0;
            return sum + items + packing;
          }, 0),
      );
    }
    return totals;
  }, [orders]);

  const grandTotal = useMemo(
    () => Array.from(statusTotals.values()).reduce((s, v) => s + v, 0),
    [statusTotals],
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Analisis</h1>
          <p className="page-note">Omzet terjual dibanding HnR, per hari atau per bulan.</p>
        </div>
        <div className="actions">
          <div className="seg" role="group" aria-label="Bentuk grafik">
            {(["line", "bar"] as ChartType[]).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={chartType === c}
                onClick={() => setChartType(c)}
              >
                {c === "line" ? "Garis" : "Batang"}
              </button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="Periode">
            {(["daily", "monthly"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
              >
                {m === "daily" ? "Harian" : "Bulanan"}
              </button>
            ))}
          </div>
          <button type="button" className="btn" onClick={fetchOrders}>
            <RefreshCcw aria-hidden="true" /> Muat lagi
          </button>
        </div>
      </div>

      {loading ? (
        <KpiSkeleton cells={3} label="Memuat analisis" quiet />
      ) : (
      <div className="kpi cols-3" style={{ gridTemplateColumns: "1.4fr 1fr 1fr" }}>
        <div>
          <p className="k">Semua pesanan</p>
          <p className="v lead num">Rp {grandTotal.toLocaleString("id-ID")}</p>
          <p className="s">{orders.length} pesanan</p>
        </div>
        {STATUS_META.map((meta) => (
          <div key={meta.key}>
            <p className="k">{meta.label}</p>
            <p className={`v num${meta.key === "hnr" ? " bad" : ""}`}>
              Rp {(statusTotals.get(meta.key) || 0).toLocaleString("id-ID")}
            </p>
            <p className="s">
              {orders.filter((o) =>
                meta.key === "hnr"
                  ? o.status === "hnr"
                  : TERJUAL_STATUSES.includes(o.status || "pending"),
              ).length}{" "}
              pesanan
            </p>
          </div>
        ))}
      </div>
      )}

      <div className="panel chart-card">
        {loading ? (
          <div role="status" aria-label="Memuat analisis. Omzet per periode sedang dihitung.">
            <p className="sr-only">Memuat analisis. Omzet per periode sedang dihitung.</p>
            <ChartSkeleton />
          </div>
        ) : chartData.length === 0 ? (
          <div className="state">
            <h2>Belum ada pesanan untuk digambar</h2>
            <p>Garis nol tampil setelah ada tanggal pesanan.</p>
          </div>
        ) : (
          <div className="w-full h-[26rem]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "line" ? (
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: "#5d5f60" }}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#5d5f60" }}
                    tickFormatter={(v: number) =>
                      v >= 1_000_000
                        ? `${(v / 1_000_000).toFixed(0)}jt`
                        : v >= 1_000
                          ? `${(v / 1_000).toFixed(0)}rb`
                          : String(v)
                    }
                  />
                  <Tooltip
                    formatter={(value) => [
                      `Rp ${Number(value).toLocaleString("id-ID")}`,
                    ]}
                    labelFormatter={(label) => `Periode: ${label}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {STATUS_META.map((meta) => (
                    <Line
                      key={meta.key}
                      type="linear"
                      dataKey={meta.key}
                      name={meta.label}
                      stroke={meta.color}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              ) : (
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: "#5d5f60" }}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#5d5f60" }}
                    tickFormatter={(v: number) =>
                      v >= 1_000_000
                        ? `${(v / 1_000_000).toFixed(0)}jt`
                        : v >= 1_000
                          ? `${(v / 1_000).toFixed(0)}rb`
                          : String(v)
                    }
                  />
                  <Tooltip
                    formatter={(value) => [
                      `Rp ${Number(value).toLocaleString("id-ID")}`,
                    ]}
                    labelFormatter={(label) => `Periode: ${label}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="terjual"
                    name="Terjual"
                    stackId="sales"
                    fill={STATUS_META[0].color}
                  />
                  <Bar
                    dataKey="hnr"
                    name="HnR"
                    stackId="sales"
                    fill={STATUS_META[1].color}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisScreen;
