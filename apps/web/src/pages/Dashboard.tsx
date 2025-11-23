import { useCurrentAccount } from '@mysten/dapp-kit'
import { useNavigate, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Shield, Plus, Search, Bell, FolderOpen } from 'lucide-react'
import { ConnectButton } from '@mysten/dapp-kit'
import { ReceiptCard } from '@/components/ReceiptCard'
import { useReceiptStore } from '@/lib/store'

export default function Dashboard() {
  const account = useCurrentAccount()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const { receipts } = useReceiptStore()

  useEffect(() => {
    if (!account) {
      navigate('/')
    }
  }, [account, navigate])

  if (!account) return null

  const filteredReceipts = receipts.filter((receipt) => {
    const matchesSearch =
      receipt.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || receipt.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const expiringCount = receipts.filter((r) => {
    if (!r.warrantyExpiry) return false
    const daysUntilExpiry = Math.ceil(
      (new Date(r.warrantyExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0
  }).length

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900/50 border-b border-slate-800">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <Shield className="h-6 w-6 text-emerald-500" />
            </div>
            <span className="text-lg font-semibold text-white">VaultGuard</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/reminders"
              className="relative p-2.5 hover:bg-slate-800 rounded-xl transition-colors"
            >
              <Bell className="h-5 w-5 text-slate-400" />
              {expiringCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                  {expiringCount}
                </span>
              )}
            </Link>
            <ConnectButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Your Receipts</h1>
          <p className="text-slate-400">Manage and view all your encrypted receipts</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search receipts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
          >
            <option value="all">All Categories</option>
            <option value="electronics">Electronics</option>
            <option value="clothing">Clothing</option>
            <option value="home">Home & Garden</option>
            <option value="automotive">Automotive</option>
            <option value="other">Other</option>
          </select>
          <Link
            to="/upload"
            className="inline-flex items-center justify-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-emerald-600 transition-all hover:shadow-lg hover:shadow-emerald-500/25"
          >
            <Plus className="h-5 w-5" />
            Upload
          </Link>
        </div>

        {/* Receipt Grid */}
        {filteredReceipts.length === 0 ? (
          <div className="text-center py-20">
            <div className="p-4 bg-slate-900/50 rounded-2xl w-fit mx-auto mb-6">
              <FolderOpen className="h-12 w-12 text-slate-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-white">No receipts yet</h2>
            <p className="text-slate-400 mb-8">Upload your first receipt to get started</p>
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-emerald-600 transition-all hover:shadow-lg hover:shadow-emerald-500/25"
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
  )
}
