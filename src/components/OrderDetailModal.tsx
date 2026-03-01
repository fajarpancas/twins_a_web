import React, { useRef } from "react";
import { X, Download, Share2 } from "lucide-react";
import html2canvas from "html2canvas";
import { type OrderDocument } from "../services/FirestoreService";

interface OrderDetailModalProps {
  visible: boolean;
  onClose: () => void;
  order: OrderDocument | null;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  visible,
  onClose,
  order,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!order || !visible) return null;

  const totalPrice =
    order.orders?.reduce((sum, item) => sum + (item.price || 0), 0) || 0;
  const PACKING_FEE = 2000;
  const packingFeeApplied = order.is_packing_fee_applied ?? true;
  const appliedPackingFee = packingFeeApplied ? PACKING_FEE : 0;
  const finalTotal = totalPrice + (order.unique_code || 0) + appliedPackingFee;

  const handleDownloadImage = async () => {
    if (printRef.current) {
      try {
        // Create a hidden clone for capture to ensure fixed width and no cropping
        const originalElement = printRef.current;
        const clone = originalElement.cloneNode(true) as HTMLDivElement;

        // Style the clone to be visible for capture but off-screen
        clone.style.position = "fixed";
        clone.style.left = "-9999px";
        clone.style.top = "0";
        clone.style.width = "500px"; // Set a stable width for capture
        clone.style.height = "auto";
        clone.style.padding = "40px";
        clone.style.backgroundColor = "white";
        clone.style.borderRadius = "0";
        clone.style.border = "none";
        clone.style.boxShadow = "none";

        document.body.appendChild(clone);

        const canvas = await html2canvas(clone, {
          backgroundColor: "#ffffff",
          scale: 2,
          useCORS: true,
          logging: false,
          width: 500,
        });

        document.body.removeChild(clone);

        const link = document.createElement("a");
        link.download = `order-${order.name}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } catch (err) {
        console.error("Error capturing image:", err);
      }
    }
  };

  const handleShare = async () => {
    if (printRef.current) {
      try {
        // Create a hidden clone for capture
        const originalElement = printRef.current;
        const clone = originalElement.cloneNode(true) as HTMLDivElement;

        clone.style.position = "fixed";
        clone.style.left = "-9999px";
        clone.style.top = "0";
        clone.style.width = "500px";
        clone.style.height = "auto";
        clone.style.padding = "40px";
        clone.style.backgroundColor = "white";
        clone.style.borderRadius = "0";
        clone.style.border = "none";
        clone.style.boxShadow = "none";

        document.body.appendChild(clone);

        const canvas = await html2canvas(clone, {
          backgroundColor: "#ffffff",
          scale: 2,
          useCORS: true,
          logging: false,
          width: 500,
        });

        document.body.removeChild(clone);

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png"),
        );
        if (blob && navigator.share) {
          const file = new File([blob], `order-${order.name}.png`, {
            type: "image/png",
          });
          await navigator.share({
            files: [file],
            title: "Detail Pesanan",
            text: `Detail Pesanan ${order.name}`,
          });
        } else {
          handleDownloadImage();
        }
      } catch (err) {
        console.error("Error sharing:", err);
        handleDownloadImage();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-t-[2.5rem] sm:rounded-2xl w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div className="flex-1 text-center sm:text-left">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
            <h2 className="text-xl font-bold text-gray-800">Detail Pesanan</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors absolute right-4 top-4 sm:static"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50">
          <div
            ref={printRef}
            id="print-area"
            className="bg-white p-6 sm:p-8 border border-gray-100 rounded-[2rem] shadow-sm space-y-6 text-gray-800"
          >
            <div className="text-center border-b border-dashed pb-6 mb-4">
              <h1 className="text-3xl font-black text-blue-600 tracking-tighter italic">
                TwinsA
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mt-1">
                Bukti Pesanan Resmi
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-gray-400 font-black uppercase text-[9px] tracking-widest">
                  Customer
                </p>
                <p className="font-bold text-lg text-gray-900 leading-tight">
                  {order.name}
                </p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-gray-400 font-black uppercase text-[9px] tracking-widest">
                  ID Pesanan
                </p>
                <p className="font-mono font-bold text-blue-600">
                  #{order.id.slice(-6).toUpperCase()}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-gray-400 font-black uppercase text-[9px] tracking-widest">
                Daftar Buku
              </p>
              <div className="space-y-3">
                {order.orders?.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-start gap-4 py-3 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold text-gray-700 block line-clamp-2">
                        {item.description}
                      </span>
                    </div>
                    <span className="font-black text-sm text-gray-900 whitespace-nowrap shrink-0">
                      Rp {item.price?.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Subtotal</span>
                <span className="font-bold">
                  Rp {totalPrice.toLocaleString()}
                </span>
              </div>
              {appliedPackingFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">
                    Biaya Packing
                  </span>
                  <span className="font-bold">
                    Rp {appliedPackingFee.toLocaleString()}
                  </span>
                </div>
              )}
              {order.unique_code ? (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Kode Unik</span>
                  <span className="font-bold">
                    Rp {order.unique_code.toLocaleString()}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between items-center pt-4 border-t-2 border-blue-600 border-dashed">
                <span className="text-blue-600 font-black uppercase tracking-widest text-xs">
                  Total Akhir
                </span>
                <span className="text-2xl font-black text-blue-600">
                  Rp {finalTotal.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="bg-blue-50/80 p-5 rounded-2xl border border-blue-100/50 space-y-3">
              <p className="text-blue-600 font-black uppercase text-[9px] tracking-widest">
                Informasi Pengiriman
              </p>
              <div className="space-y-2">
                <div className="flex gap-3">
                  <span className="text-[10px] font-black text-blue-300 uppercase w-12 shrink-0">
                    Alamat
                  </span>
                  <p className="text-xs text-blue-900 font-bold leading-relaxed">
                    {order.delivery_address || "-"}
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="text-[10px] font-black text-blue-300 uppercase w-12 shrink-0">
                    Kurir
                  </span>
                  <p className="text-xs text-blue-900 font-bold uppercase">
                    {order.delivery_type}
                  </p>
                </div>
                {order.tracking_number && (
                  <div className="flex gap-3">
                    <span className="text-[10px] font-black text-blue-300 uppercase w-12 shrink-0">
                      Resi
                    </span>
                    <p className="text-xs text-blue-900 font-mono font-bold">
                      {order.tracking_number}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="text-center pt-4">
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">
                Thank You for Ordering
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50 shrink-0 grid grid-cols-2 gap-3">
          <button
            onClick={handleDownloadImage}
            className="flex items-center justify-center py-4 bg-white border border-gray-200 text-gray-700 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-gray-100 transition-all shadow-sm active:scale-95"
          >
            <Download className="w-4 h-4 mr-2" /> Simpan
          </button>
          <button
            onClick={handleShare}
            className="flex items-center justify-center py-4 bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95"
          >
            <Share2 className="w-4 h-4 mr-2" /> Bagikan
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;
