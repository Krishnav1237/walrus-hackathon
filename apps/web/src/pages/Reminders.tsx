import { useCurrentAccount } from '@mysten/dapp-kit'
import { useNavigate, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { Bell, ArrowLeft, Calendar, AlertTriangle, Shield } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { useReceiptStore } from '@/lib/store'

export default function Reminders() {
  const account = useCurrentAccount()
  const navigate = useNavigate()
  const { receipts } = useReceiptStore()

  useEffect(() => {
    if (!account) {
      navigate('/')
    }
  }, [account, navigate])

  if (!account) {
    return null
  }

  const warrantyReceipts = receipts
    .filter((r) => r.warrantyExpiry)
    .map((r) => ({
      ...r,
      daysUntilExpiry: differenceInDays(new Date(r.warrantyExpiry!), new Date()),
    }))
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)

  const expiringSoon = warrantyReceipts.filter((r) => r.daysUntilExpiry > 0 && r.daysUntilExpiry <= 30)
  const expired = warrantyReceipts.filter((r) => r.daysUntilExpiry <= 0)
  const safe = warrantyReceipts.filter((r) => r.daysUntilExpiry > 30)

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900/50 border-b border-slate-800">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/dashboard" className="p-2.5 hover:bg-slate-800 rounded-xl transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-400" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <Bell className="h-6 w-6 text-emerald-500" />
            </div>
            <span className="text-lg font-semibold text-white">Warranty Reminders</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-2xl">
        {warrantyReceipts.length === 0 ? (
          <div className="text-center py-20">
            <div className="p-4 bg-slate-900/50 rounded-2xl w-fit mx-auto mb-6">
              <Calendar className="h-12 w-12 text-slate-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-white">No warranties tracked</h2>
            <p className="text-slate-400">Upload receipts with warranty dates to get reminders</p>
          </div>
        ) : (
          <div className="space-y-8">
            {expiringSoon.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                  Expiring Soon ({expiringSoon.length})
                </h2>
                <div className="space-y-3">
                  {expiringSoon.map((receipt) => (
                    <ReminderCard key={receipt.id} receipt={receipt} status="warning" />
                  ))}
                </div>
              </section>
            )}

            {expired.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 text-slate-500">Expired ({expired.length})</h2>
                <div className="space-y-3">
                  {expired.map((receipt) => (
                    <ReminderCard key={receipt.id} receipt={receipt} status="expired" />
                  ))}
                </div>
              </section>
            )}

            {safe.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-emerald-400">
                  <Shield className="h-5 w-5" />
                  Active ({safe.length})
                </h2>
                <div className="space-y-3">
                  {safe.map((receipt) => (
                    <ReminderCard key={receipt.id} receipt={receipt} status="safe" />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function ReminderCard({ receipt, status }: { receipt: any; status: 'warning' | 'expired' | 'safe' }) {
  return (
    <div className={`bg-slate-900/50 rounded-2xl border p-4 ${
      status === 'warning'
        ? 'border-amber-500/30'
        : status === 'expired'
        ? 'border-slate-800 opacity-60'
        : 'border-emerald-500/30'
    }`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-white">{receipt.merchant}</h3>
          <p className="text-sm text-slate-500">
            Purchased {format(new Date(receipt.purchaseDate), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="text-right">
          <div className={`font-semibold ${
            status === 'warning'
              ? 'text-amber-400'
              : status === 'expired'
              ? 'text-slate-500'
              : 'text-emerald-400'
          }`}>
            {status === 'expired' ? 'Expired' : `${receipt.daysUntilExpiry} days left`}
          </div>
          <p className="text-sm text-slate-500">
            {format(new Date(receipt.warrantyExpiry), 'MMM d, yyyy')}
          </p>
        </div>
      </div>
    </div>
  )
}
