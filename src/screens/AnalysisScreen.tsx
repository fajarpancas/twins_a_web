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
import { ChartColumn, RefreshCcw } from "lucide-react";
import FirestoreService, {
  type OrderDocument,
} from "../services/FirestoreService";

const STATUS_META: {
  key: "terjual" | "hnr";
  label: string;
  color: string;
}[] = [
  { key: "terjual", label: "Terjual", color: "#22c55e" },
  { key: "hnr", label: "HnR", color: "#ef4444" },
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
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Analisis Penjualan
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Grafik penjualan per status order
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {(["line", "bar"] as ChartType[]).map((c) => (
              <button
                key={c}
                onClick={() => setChartType(c)}
                className={`px-4 py-2 text-sm font-bold transition-colors ${
                  chartType === c
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {c === "line" ? "Garis" : "Batang"}
              </button>
            ))}
          </div>
          <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {(["daily", "monthly"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-2 text-sm font-bold transition-colors ${
                  mode === m
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {m === "daily" ? "Harian" : "Bulanan"}
              </button>
            ))}
          </div>
          <button
            onClick={fetchOrders}
            className="flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all shadow-sm text-sm"
          >
            <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
          </button>
        </div>
      </div>

      {/* Totals per status */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Total Semua
          </p>
          <p className="text-xl font-extrabold text-gray-900 mt-1">
            Rp {grandTotal.toLocaleString("id-ID")}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{orders.length} order</p>
        </div>
        {STATUS_META.map((meta) => (
          <div
            key={meta.key}
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"
          >
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: meta.color }}
              />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                {meta.label}
              </p>
            </div>
            <p className="text-xl font-extrabold text-gray-900 mt-1">
              Rp {(statusTotals.get(meta.key) || 0).toLocaleString("id-ID")}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {orders.filter((o) =>
                meta.key === "hnr"
                  ? o.status === "hnr"
                  : TERJUAL_STATUSES.includes(o.status || "pending"),
              ).length}{" "}
              order
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-72">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 text-gray-400">
            <ChartColumn className="w-10 h-10 mb-2" />
            <p className="text-sm font-medium">Tidak ada data order</p>
          </div>
        ) : (
          <div className="w-full h-[26rem]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "line" ? (
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
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
                      type="monotone"
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
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
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
