import React, { useState, useEffect, useCallback } from 'react';
import FirestoreService, { type HistoricalDataDocument } from '../services/FirestoreService';
import { Plus, Trash2, X } from "lucide-react";
import { KpiSkeleton, Pager, TableSkeleton, goToListPage, usePage } from "../components/ListPage.tsx";

const COLLECTION_NAME = 'sales_history';

const SalesHistoryScreen = () => {
  const [historyData, setHistoryData] = useState<HistoricalDataDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [description, setDescription] = useState('');
  const [capital, setCapital] = useState('');
  const [revenue, setRevenue] = useState('');
  const [totalBooks, setTotalBooks] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await FirestoreService.getCollection(COLLECTION_NAME);
      const sortedData = (data as HistoricalDataDocument[]).sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
      setHistoryData(sortedData);
    } catch (error) {
      console.error('Error fetching history data:', error);
      setLoadError("Riwayat gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totals = historyData.reduce(
    (acc, h) => {
      acc.capital += h.capital || 0;
      acc.revenue += h.revenue || 0;
      acc.profit += (h.revenue || 0) - (h.capital || 0);
      acc.books += h.total_books || 0;
      return acc;
    },
    { capital: 0, revenue: 0, profit: 0, books: 0 }
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !capital || !revenue || !totalBooks) return;

    setSubmitting(true);
    try {
      const capitalValue = parseInt(capital, 10);
      const revenueValue = parseInt(revenue, 10);
      const totalBooksValue = parseInt(totalBooks, 10);
      const profitValue = revenueValue - capitalValue;

      const newEntry = {
        description,
        capital: capitalValue,
        revenue: revenueValue,
        profit: profitValue,
        total_books: totalBooksValue,
      };

      await FirestoreService.addDocument(COLLECTION_NAME, newEntry);
      
      setDescription('');
      setCapital('');
      setRevenue('');
      setTotalBooks('');
      setIsFormVisible(false);
      fetchData();
    } catch (error) {
      console.error('Error saving history:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Hapus data history ini?')) {
      try {
        await FirestoreService.deleteDocument(COLLECTION_NAME, id);
        fetchData();
      } catch (error) {
        console.error('Error deleting history:', error);
      }
    }
  };

  const historyPage = usePage(historyData, historyData[0]?.id ?? "");

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Riwayat</h1>
          <p className="page-note">Angka periode lama, di luar pesanan yang masih di meja.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setIsFormVisible(true)}>
          <Plus aria-hidden="true" /> Catat periode
        </button>
      </div>

      {loading ? (
        <KpiSkeleton cells={4} label="Memuat riwayat" quiet />
      ) : !loadError && (
        <div className="kpi cols-4" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          <div>
            <p className="k">Omzet tercatat</p>
            <p className="v num">Rp {totals.revenue.toLocaleString("id-ID")}</p>
          </div>
          <div>
            <p className="k">Modal</p>
            <p className="v num">Rp {totals.capital.toLocaleString("id-ID")}</p>
          </div>
          <div>
            <p className="k">Sisa</p>
            <p className={`v lead num${totals.profit < 0 ? " bad" : ""}`}>Rp {totals.profit.toLocaleString("id-ID")}</p>
          </div>
          <div>
            <p className="k">Buku</p>
            <p className="v num">{totals.books}</p>
          </div>
        </div>
      )}

      {isFormVisible && (
        <div className="dialog-scrim" onClick={() => setIsFormVisible(false)}>
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="page-head" style={{ marginBottom: 16 }}>
              <h2 id="history-title">Catat periode</h2>
              <button type="button" className="icon-btn" aria-label="Tutup" onClick={() => setIsFormVisible(false)}>
                <X aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleSave} className="stack">
              <label>
                Periode
                <input
                  type="text"
                  required
                  placeholder="Januari 2024"
                  className="field"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <div className="pair">
                <label>
                  Modal
                  <input
                    type="number"
                    required
                    min="0"
                    className="field"
                    value={capital}
                    onChange={(e) => setCapital(e.target.value)}
                  />
                </label>
                <label>
                  Omzet
                  <input
                    type="number"
                    required
                    min="0"
                    className="field"
                    value={revenue}
                    onChange={(e) => setRevenue(e.target.value)}
                  />
                </label>
              </div>
              <label>
                Buku terjual
                <input
                  type="number"
                  required
                  min="0"
                  className="field"
                  value={totalBooks}
                  onChange={(e) => setTotalBooks(e.target.value)}
                />
              </label>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Menyimpan" : "Simpan"}
              </button>
            </form>
          </div>
        </div>
      )}

      {loadError && (
        <div className="state state-error" role="alert">
          <h2>{loadError}</h2>
          <button type="button" className="btn" style={{ marginTop: 12 }} onClick={fetchData}>
            Muat lagi
          </button>
        </div>
      )}

      {loading ? (
        <TableSkeleton cols={6} label="Memuat riwayat. Periode lama sedang diambil." />
      ) : historyData.length === 0 ? (
        <div className="state">
          <h2>Belum ada periode</h2>
          <p>Catat omzet lama yang tidak ada di meja sekarang.</p>
        </div>
      ) : (
        <>
        <Pager
          id="list-top"
          page={historyPage.page}
          pages={historyPage.pages}
          total={historyPage.total}
          from={historyPage.from}
          to={historyPage.to}
          onPage={(next) => goToListPage(historyPage.setPage, next)}
        />
        <div className="panel" style={{ overflowX: "auto" }}>
          <table className="ledger">
            <thead>
              <tr>
                <th>Periode</th>
                <th className="num">Omzet</th>
                <th className="num">Modal</th>
                <th className="num">Sisa</th>
                <th className="num">Buku</th>
                <th className="num"><span className="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody>
              {historyPage.slice.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td className="num">Rp {item.revenue.toLocaleString("id-ID")}</td>
                  <td className="num">Rp {item.capital.toLocaleString("id-ID")}</td>
                  <td className={`num${item.profit < 0 ? " neg" : ""}`}>
                    Rp {item.profit.toLocaleString("id-ID")}
                  </td>
                  <td className="num">{item.total_books}</td>
                  <td className="num">
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={`Hapus ${item.description}`}
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
};

export default SalesHistoryScreen;
