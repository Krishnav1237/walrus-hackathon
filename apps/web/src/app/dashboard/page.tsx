"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shield, Plus, Search, Filter, Bell, LogOut } from "lucide-react";
import Link from "next/link";
import { ConnectButton } from "@mysten/dapp-kit";
import { ReceiptCard } from "@/components/ReceiptCard";
import { useReceiptStore } from "@/lib/store";

export default function Dashboard() {
  const account = useCurrentAccount();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { receipts } = useReceiptStore();

  useEffect(() => {
    if (!account) {
      router.push("/");
    }
  }, [account, router]);

  if (!account) {
    return null;
  }

  const filteredReceipts = receipts.filter((receipt) => {
    const matchesSearch =
      receipt.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || receipt.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const expiringCount = receipts.filter((r) => {
    if (!r.warrantyExpiry) return false;
    const daysUntilExpiry = Math.ceil(
      (new Date(r.warrantyExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  }).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold">VaultGuard</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/reminders"
              className="relative p-2 hover:bg-gray-100 rounded-lg"
            >
              <Bell className="h-5 w-5" />
              {expiringCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {expiringCount}
                </span>
              )}
            </Link>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search receipts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="electronics">Electronics</option>
            <option value="clothing">Clothing</option>
            <option value="home">Home & Garden</option>
            <option value="automotive">Automotive</option>
            <option value="other">Other</option>
          </select>
          <Link
            href="/dashboard/upload"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="h-5 w-5" />
            Upload Receipt
          </Link>
        </div>

        {/* Receipts Grid */}
        {filteredReceipts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <Shield className="h-16 w-16 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No receipts yet</h2>
            <p className="text-gray-600 mb-6">
              Upload your first receipt to start building your vault
            </p>
            <Link
              href="/dashboard/upload"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="h-5 w-5" />
              Upload Your First Receipt
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredReceipts.map((receipt) => (
              <ReceiptCard key={receipt.id} receipt={receipt} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
