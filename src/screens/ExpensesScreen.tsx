import React, { useState, useEffect, useCallback } from 'react';
import FirestoreService, { type ExpenseDocument } from '../services/FirestoreService';
import { Plus, Trash2, X } from "lucide-react";
import { Pager, TableSkeleton, goToListPage, usePage } from "../components/ListPage.tsx";

const COLLECTION_NAME = 'expenses';

const ExpensesScreen = () => {
  const [expenses, setExpenses] = useState<ExpenseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [totalExpenses, setTotalExpenses] = useState(0);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await FirestoreService.getCollection(COLLECTION_NAME, 'created_at', 'desc');
      const expenseList = data as ExpenseDocument[];
      setExpenses(expenseList);

      const total = expenseList.reduce((sum, item) => sum + (item.total || 0), 0);
      setTotalExpenses(total);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setLoadError("Pengeluaran gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !qty) return;

    setSubmitting(true);
    try {
      const priceNum = parseFloat(price);
      const qtyNum = parseInt(qty);
      const total = priceNum * qtyNum;

      const newItem = {
        name,
        price: priceNum,
        qty: qtyNum,
        total,
      };

      await FirestoreService.addDocument(COLLECTION_NAME, newItem);
      
      setName('');
      setPrice('');
      setQty('1');
      setIsFormVisible(false);
      fetchExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Hapus pengeluaran ini?')) {
      try {
        await FirestoreService.deleteDocument(COLLECTION_NAME, id);
        fetchExpenses();
      } catch (error) {
        console.error('Error deleting expense:', error);
      }
    }
  };

  const expensePage = usePage(expenses, expenses[0]?.id ?? "");

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Pengeluaran</h1>
          <p className="page-note">
            {loading
              ? "Menghitung kas."
              : <>Keluar dari kas <span className="num">Rp {totalExpenses.toLocaleString("id-ID")}</span></>}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setIsFormVisible(true)}>
          <Plus aria-hidden="true" /> Catat pengeluaran
        </button>
      </div>

      {isFormVisible && (
        <div className="dialog-scrim" onClick={() => setIsFormVisible(false)}>
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="expense-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="page-head" style={{ marginBottom: 16 }}>
              <h2 id="expense-title">Catat pengeluaran</h2>
              <button type="button" className="icon-btn" aria-label="Tutup" onClick={() => setIsFormVisible(false)}>
                <X aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleSave} className="stack">
              <label>
                Nama
                <input
                  type="text"
                  required
                  className="field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <div className="pair">
                <label>
                  Harga satuan
                  <input
                    type="number"
                    required
                    min="0"
                    className="field"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </label>
                <label>
                  Jumlah
                  <input
                    type="number"
                    required
                    min="1"
                    className="field"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                  />
                </label>
              </div>
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
          <button type="button" className="btn" style={{ marginTop: 12 }} onClick={fetchExpenses}>
            Muat lagi
          </button>
        </div>
      )}

      {loading ? (
        <TableSkeleton cols={5} label="Memuat pengeluaran. Catatan kas sedang diambil." />
      ) : expenses.length === 0 ? (
        <div className="state">
          <h2>Belum ada pengeluaran</h2>
          <p>Catat barang yang keluar dari kas, misalnya plastik atau lakban.</p>
        </div>
      ) : (
        <>
        <Pager
          id="list-top"
          page={expensePage.page}
          pages={expensePage.pages}
          total={expensePage.total}
          from={expensePage.from}
          to={expensePage.to}
          onPage={(next) => goToListPage(expensePage.setPage, next)}
        />
        <div className="panel" style={{ overflowX: "auto" }}>
          <table className="ledger">
            <thead>
              <tr>
                <th>Nama</th>
                <th className="num">Harga satuan</th>
                <th className="num">Jumlah</th>
                <th className="num">Total</th>
                <th className="num"><span className="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody>
              {expensePage.slice.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td className="num">Rp {item.price.toLocaleString("id-ID")}</td>
                  <td className="num">{item.qty}</td>
                  <td className="num">Rp {item.total.toLocaleString("id-ID")}</td>
                  <td className="num">
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={`Hapus ${item.name}`}
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

export default ExpensesScreen;
