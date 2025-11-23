import { useCurrentAccount } from '@mysten/dapp-kit'
import { useNavigate, Link } from 'react-router-dom'
import { Bell, ArrowLeft, Calendar, AlertTriangle } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { useReceiptStore } from '@/lib/store'

export default function Reminders() {
  const account = useCurrentAccount()
  const navigate = useNavigate()
  const { receipts } = useReceiptStore()

  if (!account) {
    navigate('/')
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold">Warranty Reminders</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {warrantyReceipts.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No warranties tracked</h2>
            <p className="text-gray-600">Upload receipts with warranty dates to get reminders</p>
          </div>
        ) : (
          <div className="space-y-8">
            {expiringSoon.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-orange-600">
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
                <h2 className="text-lg font-semibold mb-4 text-gray-500">Expired ({expired.length})</h2>
                <div className="space-y-3">
                  {expired.map((receipt) => (
                    <ReminderCard key={receipt.id} receipt={receipt} status="expired" />
                  ))}
                </div>
              </section>
            )}

            {safe.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 text-green-600">Active ({safe.length})</h2>
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
    <div className={`bg-white rounded-lg border p-4 ${
      status === 'warning' ? 'border-orange-200' : status === 'expired' ? 'border-gray-200 opacity-60' : 'border-green-200'
    }`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{receipt.merchant}</h3>
          <p className="text-sm text-gray-500">
            Purchased {format(new Date(receipt.purchaseDate), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="text-right">
          <div className={`font-semibold ${
            status === 'warning' ? 'text-orange-600' : status === 'expired' ? 'text-gray-500' : 'text-green-600'
          }`}>
            {status === 'expired' ? 'Expired' : `${receipt.daysUntilExpiry} days left`}
          </div>
          <p className="text-sm text-gray-500">
            {format(new Date(receipt.warrantyExpiry), 'MMM d, yyyy')}
          </p>
        </div>
      </div>
    </div>
  )
}
