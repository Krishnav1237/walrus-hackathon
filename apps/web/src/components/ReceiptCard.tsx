"use client";

import { useState } from "react";
import { format, differenceInDays } from "date-fns";
import { Lock, Unlock, Clock, AlertTriangle, ExternalLink } from "lucide-react";
import { Receipt } from "@/lib/store";

interface ReceiptCardProps {
  receipt: Receipt;
}

export function ReceiptCard({ receipt }: ReceiptCardProps) {
  const [isDecrypting, setIsDecrypting] = useState(false);

  const daysUntilExpiry = receipt.warrantyExpiry
    ? differenceInDays(new Date(receipt.warrantyExpiry), new Date())
    : null;

  const expiryStatus =
    daysUntilExpiry === null
      ? null
      : daysUntilExpiry <= 0
      ? "expired"
      : daysUntilExpiry <= 7
      ? "critical"
      : daysUntilExpiry <= 30
      ? "warning"
      : "safe";

  const getCategoryEmoji = (category: string) => {
    const emojis: Record<string, string> = {
      electronics: "🔌",
      clothing: "👕",
      home: "🏠",
      automotive: "🚗",
      other: "📦",
    };
    return emojis[category] || "📦";
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm hover:shadow-md transition">
      {/* Header with status */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between mb-2">
          <span className="text-2xl">{getCategoryEmoji(receipt.category)}</span>
          <div className="flex items-center gap-1 text-xs">
            <Lock className="h-3 w-3 text-green-600" />
            <span className="text-green-600">Encrypted</span>
          </div>
        </div>
        <h3 className="font-semibold truncate">{receipt.merchant}</h3>
        <p className="text-sm text-gray-500">
          {format(new Date(receipt.purchaseDate), "MMM d, yyyy")}
        </p>
      </div>

      {/* Details */}
      <div className="p-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Amount</span>
          <span className="font-semibold">
            {receipt.currency === "USD" && "$"}
            {receipt.currency === "EUR" && "€"}
            {receipt.currency === "GBP" && "£"}
            {receipt.amount.toFixed(2)}
          </span>
        </div>

        {receipt.warrantyExpiry && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Warranty</span>
            <span
              className={`text-sm font-medium flex items-center gap-1 ${
                expiryStatus === "expired"
                  ? "text-gray-500"
                  : expiryStatus === "critical"
                  ? "text-red-600"
                  : expiryStatus === "warning"
                  ? "text-orange-600"
                  : "text-green-600"
              }`}
            >
              {expiryStatus === "critical" && (
                <AlertTriangle className="h-3 w-3" />
              )}
              {expiryStatus === "expired"
                ? "Expired"
                : `${daysUntilExpiry}d left`}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 pt-0 flex gap-2">
        <button
          onClick={() => setIsDecrypting(true)}
          className="flex-1 text-sm py-2 border rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-1"
        >
          <Unlock className="h-3 w-3" />
          View
        </button>
        <button className="flex-1 text-sm py-2 border rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-1">
          <ExternalLink className="h-3 w-3" />
          Proof
        </button>
      </div>
    </div>
  );
}
