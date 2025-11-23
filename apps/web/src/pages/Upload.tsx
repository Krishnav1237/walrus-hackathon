import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit'
import { useNavigate, Link } from 'react-router-dom'
import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Shield, Upload as UploadIcon, ArrowLeft, Loader2, Image, FileText } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { uploadEncryptedReceipt } from '@/lib/seal'
import { mintReceiptNFT } from '@/lib/sui'
import { useReceiptStore } from '@/lib/store'

const receiptSchema = z.object({
  merchant: z.string().min(1, 'Merchant name is required'),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  amount: z.string().min(1, 'Amount is required'),
  currency: z.string().default('USD'),
  warrantyExpiry: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
})

type ReceiptFormData = z.infer<typeof receiptSchema>

export default function Upload() {
  const account = useCurrentAccount()
  const navigate = useNavigate()
  const suiClient = useSuiClient()
  const { mutate: signAndExecute } = useSignAndExecuteTransaction()
  const { addReceipt } = useReceiptStore()

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStep, setUploadStep] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<ReceiptFormData>({
    resolver: zodResolver(receiptSchema),
    defaultValues: { currency: 'USD', category: 'other' },
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0]
    if (selectedFile) {
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onload = () => setPreview(reader.result as string)
      reader.readAsDataURL(selectedFile)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg'], 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  })

  const onSubmit = async (data: ReceiptFormData) => {
    if (!file || !account) return

    setIsUploading(true)
    try {
      // Step 1: Encrypt with Seal and upload to Walrus
      setUploadStep('Encrypting with Seal...')
      const { blobId, encryptionId } = await uploadEncryptedReceipt(
        file,
        account.address
      )

      // Step 2: Mint Receipt NFT on Sui
      setUploadStep('Minting NFT on Sui...')
      const txb = await mintReceiptNFT({
        blobId,
        sealPolicyId: encryptionId,
        merchant: data.merchant,
        purchaseDate: new Date(data.purchaseDate).getTime(),
        amount: Math.round(parseFloat(data.amount) * 100),
        currency: data.currency,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry).getTime() : 0,
        category: data.category,
      })

      signAndExecute(
        {
          transaction: txb,
        },
        {
          onSuccess: async (result) => {
            try {
              // Query the transaction to get objectChanges
              const txDetails = await suiClient.getTransactionBlock({
                digest: result.digest,
                options: {
                  showObjectChanges: true,
                },
              })

              // Extract the NFT object ID from objectChanges
              let nftObjectId = ''

              if (txDetails.objectChanges) {
                const createdObject = txDetails.objectChanges.find(
                  (change) =>
                    change.type === 'created' &&
                    'objectType' in change &&
                    (change.objectType as string)?.includes('ReceiptNFT')
                )
                if (createdObject && 'objectId' in createdObject) {
                  nftObjectId = createdObject.objectId as string
                }
              }

              if (!nftObjectId) {
                console.error('Failed to extract NFT object ID. Object changes:', txDetails.objectChanges)
                setIsUploading(false)
                setUploadStep('')
                return
              }

              addReceipt({
                id: result.digest,
                nftObjectId,
                blobId,
                sealPolicyId: encryptionId,
                merchant: data.merchant,
                purchaseDate: data.purchaseDate,
                amount: parseFloat(data.amount),
                currency: data.currency,
                warrantyExpiry: data.warrantyExpiry || null,
                category: data.category,
                mimeType: file.type,
                createdAt: new Date().toISOString(),
              })
              setUploadStep('Success!')
              setTimeout(() => navigate('/dashboard'), 1000)
            } catch (err) {
              console.error('Failed to get transaction details:', err)
              setIsUploading(false)
              setUploadStep('')
            }
          },
          onError: (error) => {
            console.error('Transaction failed:', error)
            setIsUploading(false)
            setUploadStep('')
          },
        }
      )
    } catch (error) {
      console.error('Upload failed:', error)
      setIsUploading(false)
      setUploadStep('')
    }
  }

  useEffect(() => {
    if (!account) {
      navigate('/')
    }
  }, [account, navigate])

  if (!account) {
    return null
  }

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
              <Shield className="h-6 w-6 text-emerald-500" />
            </div>
            <span className="text-lg font-semibold text-white">Upload Receipt</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium mb-3 text-slate-300">Receipt Image/PDF</label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                isDragActive
                  ? 'border-emerald-500 bg-emerald-500/5'
                  : 'border-slate-700 hover:border-slate-600 bg-slate-900/50'
              }`}
            >
              <input {...getInputProps()} />
              {preview ? (
                <div>
                  {file?.type.startsWith('image/') ? (
                    <img src={preview} alt="Preview" className="max-h-48 mx-auto mb-3 rounded-lg" />
                  ) : (
                    <div className="p-4 bg-slate-800 rounded-xl w-fit mx-auto mb-3">
                      <FileText className="h-10 w-10 text-slate-400" />
                    </div>
                  )}
                  <p className="text-sm text-slate-400">{file?.name}</p>
                </div>
              ) : (
                <div>
                  <div className="p-4 bg-slate-800 rounded-xl w-fit mx-auto mb-4">
                    <Image className="h-8 w-8 text-slate-500" />
                  </div>
                  <p className="text-slate-300 mb-1">Drag & drop or click to select</p>
                  <p className="text-sm text-slate-500">PNG, JPG, or PDF</p>
                </div>
              )}
            </div>
          </div>

          {/* Merchant Name */}
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">Merchant Name *</label>
            <input
              {...register('merchant')}
              type="text"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              placeholder="e.g., Best Buy"
            />
            {errors.merchant && <p className="text-red-400 text-sm mt-2">{errors.merchant.message}</p>}
          </div>

          {/* Date & Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">Purchase Date *</label>
              <input
                {...register('purchaseDate')}
                type="date"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
              {errors.purchaseDate && <p className="text-red-400 text-sm mt-2">{errors.purchaseDate.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">Amount *</label>
              <div className="flex">
                <select
                  {...register('currency')}
                  className="px-3 py-3 bg-slate-800 border border-slate-700 border-r-0 rounded-l-xl text-white"
                >
                  <option value="USD">$</option>
                  <option value="EUR">€</option>
                  <option value="GBP">£</option>
                </select>
                <input
                  {...register('amount')}
                  type="number"
                  step="0.01"
                  className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 rounded-r-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                  placeholder="0.00"
                />
              </div>
              {errors.amount && <p className="text-red-400 text-sm mt-2">{errors.amount.message}</p>}
            </div>
          </div>

          {/* Warranty Expiry */}
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">Warranty Expiry (optional)</label>
            <input
              {...register('warrantyExpiry')}
              type="date"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">Category *</label>
            <select
              {...register('category')}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
            >
              <option value="electronics">Electronics</option>
              <option value="clothing">Clothing</option>
              <option value="home">Home & Garden</option>
              <option value="automotive">Automotive</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!file || isUploading}
            className="w-full bg-emerald-500 text-white py-4 rounded-xl font-semibold hover:bg-emerald-600 transition-all hover:shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {uploadStep}
              </>
            ) : (
              <>
                <UploadIcon className="h-5 w-5" />
                Encrypt & Upload
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  )
}
