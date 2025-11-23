import { useState } from 'react'
import { format, differenceInDays } from 'date-fns'
import { Lock, Unlock, AlertTriangle, ExternalLink, X, Loader2, ShieldCheck } from 'lucide-react'
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { fromHex } from '@mysten/sui/utils'
import { Receipt } from '@/lib/store'
import { getSealClient, getSuiClient, fetchFromWalrus, createBlobUrl, APP_PACKAGE_ID, SessionKey } from '@/lib/seal'

interface ReceiptCardProps {
  receipt: Receipt
}

export function ReceiptCard({ receipt }: ReceiptCardProps) {
  const account = useCurrentAccount()
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage()

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

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      electronics: 'Electronics',
      clothing: 'Clothing',
      home: 'Home',
      automotive: 'Auto',
      other: 'Other',
    }
    return labels[category] || 'Other'
  }

  const handleView = async () => {
    if (!account) return

    setIsLoading(true)
    setError(null)

    try {
      const client = getSealClient()
      const suiClient = getSuiClient()

      // Create SessionKey
      const sessionKey = new SessionKey({
        address: account.address,
        packageId: APP_PACKAGE_ID,
        ttlMin: 10,
      })

      // Get the personal message to sign
      const message = sessionKey.getPersonalMessage()

      // User signs the message
      const { signature } = await signPersonalMessage({
        message,
      })

      // Set the signature on the session key
      sessionKey.setPersonalMessageSignature(signature)

      // Fetch encrypted data from Walrus
      const encryptedData = await fetchFromWalrus(receipt.blobId)

      // Build transaction for seal_approve
      const tx = new Transaction()
      tx.moveCall({
        target: `${APP_PACKAGE_ID}::receipt_nft::seal_approve`,
        arguments: [
          tx.pure.vector('u8', fromHex(receipt.sealPolicyId)),
          tx.object(receipt.nftObjectId),
        ],
      })

      const txBytes = await tx.build({
        client: suiClient,
        onlyTransactionKind: true
      })

      // Decrypt using Seal
      const decryptedData = await client.decrypt({
        data: encryptedData,
        sessionKey,
        txBytes,
      })

      // Create blob URL for viewing
      const url = createBlobUrl(decryptedData, receipt.mimeType || 'image/jpeg')
      setDecryptedUrl(url)
      setIsViewing(true)
    } catch (err) {
      console.error('Decryption failed:', err)
      setError(`Failed to decrypt: ${err instanceof Error ? err.message : 'Unknown error'}`)
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
    const explorerUrl = `https://suiscan.xyz/testnet/tx/${receipt.id}`
    window.open(explorerUrl, '_blank')
  }

  return (
    <>
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-slate-700 transition-all">
        {/* Header */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-start justify-between mb-3">
            <span className="px-2.5 py-1 bg-slate-800 rounded-lg text-xs font-medium text-slate-300">
              {getCategoryLabel(receipt.category)}
            </span>
            <div className="flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-emerald-500" />
              <span className="text-xs text-emerald-500 font-medium">Encrypted</span>
            </div>
          </div>
          <h3 className="font-semibold text-white truncate">{receipt.merchant}</h3>
          <p className="text-sm text-slate-500">
            {format(new Date(receipt.purchaseDate), 'MMM d, yyyy')}
          </p>
        </div>

        {/* Details */}
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500">Amount</span>
            <span className="font-semibold text-white">
              {receipt.currency === 'USD' && '$'}
              {receipt.currency === 'EUR' && '€'}
              {receipt.currency === 'GBP' && '£'}
              {receipt.amount.toFixed(2)}
            </span>
          </div>

          {receipt.warrantyExpiry && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Warranty</span>
              <span className={`text-sm font-medium flex items-center gap-1.5 ${
                expiryStatus === 'expired'
                  ? 'text-slate-500'
                  : expiryStatus === 'critical'
                  ? 'text-red-400'
                  : expiryStatus === 'warning'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {expiryStatus === 'critical' && <AlertTriangle className="h-3 w-3" />}
                {expiryStatus === 'expired' ? 'Expired' : `${daysUntilExpiry}d left`}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 pt-0 flex gap-2">
          <button
            onClick={handleView}
            disabled={isLoading}
            className="flex-1 text-sm py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-700 hover:text-white transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Unlock className="h-3.5 w-3.5" />
            )}
            View
          </button>
          <button
            onClick={handleProof}
            className="flex-1 text-sm py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-700 hover:text-white transition-all flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Proof
          </button>
        </div>

        {error && (
          <div className="px-4 pb-4">
            <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
          </div>
        )}
      </div>

      {/* View Modal */}
      {isViewing && decryptedUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-white">{receipt.merchant}</h3>
                <p className="text-sm text-slate-500">Receipt Details</p>
              </div>
              <button
                onClick={handleCloseView}
                className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <div className="p-4">
              {receipt.mimeType === 'application/pdf' ? (
                <iframe
                  src={decryptedUrl}
                  title="Receipt PDF"
                  className="w-full h-[600px] rounded-xl bg-white"
                />
              ) : (
                <img
                  src={decryptedUrl}
                  alt="Receipt"
                  className="w-full h-auto rounded-xl"
                />
              )}
            </div>
            <div className="p-4 border-t border-slate-800">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Decrypted via Seal key servers</span>
              </div>
              <p className="text-xs text-slate-600 mt-2 font-mono">Blob: {receipt.blobId}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
