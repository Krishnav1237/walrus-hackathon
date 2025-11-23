import { useState } from 'react'
import { format, differenceInDays } from 'date-fns'
import { Lock, Unlock, AlertTriangle, ExternalLink, X, Loader2 } from 'lucide-react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { Receipt } from '@/lib/store'
import { decryptReceipt, createBlobUrl } from '@/lib/walrus'

interface ReceiptCardProps {
  receipt: Receipt
}

export function ReceiptCard({ receipt }: ReceiptCardProps) {
  const account = useCurrentAccount()
  const [isViewing, setIsViewing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const daysUntilExpiry = receipt.warrantyExpiry
    ? differenceInDays(new Date(receipt.warrantyExpiry), new Date())
    : null

  const expiryStatus =
    daysUntilExpiry === null
      ? null
      : daysUntilExpiry <= 0
      ? 'expired'
      : daysUntilExpiry <= 7
      ? 'critical'
      : daysUntilExpiry <= 30
      ? 'warning'
      : 'safe'

  const getCategoryEmoji = (category: string) => {
    const emojis: Record<string, string> = {
      electronics: '🔌',
      clothing: '👕',
      home: '🏠',
      automotive: '🚗',
      other: '📦',
    }
    return emojis[category] || '📦'
  }

  const handleView = async () => {
    if (!account) return

    setIsLoading(true)
    setError(null)

    try {
      const decryptedData = await decryptReceipt(
        receipt.blobId,
        receipt.sealPolicyId,
        account.address
      )

      // Create blob URL for viewing
      const url = createBlobUrl(decryptedData, 'image/jpeg')
      setDecryptedUrl(url)
      setIsViewing(true)
    } catch (err) {
      console.error('Decryption failed:', err)
      setError('Failed to decrypt receipt')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseView = () => {
    setIsViewing(false)
    if (decryptedUrl) {
      URL.revokeObjectURL(decryptedUrl)
      setDecryptedUrl(null)
    }
  }

  const handleProof = () => {
    // Open Sui explorer to show the NFT transaction
    const explorerUrl = `https://suiscan.xyz/testnet/tx/${receipt.id}`
    window.open(explorerUrl, '_blank')
  }

  return (
    <>
      <div className="bg-white rounded-lg border shadow-sm hover:shadow-md transition">
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
            {format(new Date(receipt.purchaseDate), 'MMM d, yyyy')}
          </p>
        </div>

        <div className="p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Amount</span>
            <span className="font-semibold">
              {receipt.currency === 'USD' && '$'}
              {receipt.currency === 'EUR' && '€'}
              {receipt.currency === 'GBP' && '£'}
              {receipt.amount.toFixed(2)}
            </span>
          </div>

          {receipt.warrantyExpiry && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Warranty</span>
              <span className={`text-sm font-medium flex items-center gap-1 ${
                expiryStatus === 'expired'
                  ? 'text-gray-500'
                  : expiryStatus === 'critical'
                  ? 'text-red-600'
                  : expiryStatus === 'warning'
                  ? 'text-orange-600'
                  : 'text-green-600'
              }`}>
                {expiryStatus === 'critical' && <AlertTriangle className="h-3 w-3" />}
                {expiryStatus === 'expired' ? 'Expired' : `${daysUntilExpiry}d left`}
              </span>
            </div>
          )}
        </div>

        <div className="p-4 pt-0 flex gap-2">
          <button
            onClick={handleView}
            disabled={isLoading}
            className="flex-1 text-sm py-2 border rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-1 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Unlock className="h-3 w-3" />
            )}
            View
          </button>
          <button
            onClick={handleProof}
            className="flex-1 text-sm py-2 border rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            Proof
          </button>
        </div>

        {error && (
          <div className="px-4 pb-4">
            <p className="text-xs text-red-500">{error}</p>
          </div>
        )}
      </div>

      {/* View Modal */}
      {isViewing && decryptedUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold">{receipt.merchant} - Receipt</h3>
              <button
                onClick={handleCloseView}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <img
                src={decryptedUrl}
                alt="Receipt"
                className="w-full h-auto"
              />
            </div>
            <div className="p-4 border-t text-sm text-gray-500">
              <p>Blob ID: {receipt.blobId}</p>
              <p>Decrypted from Walrus</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
