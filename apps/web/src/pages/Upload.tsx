import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { useNavigate, Link } from 'react-router-dom'
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Shield, Upload as UploadIcon, ArrowLeft, Loader2 } from 'lucide-react'
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
      setUploadStep('Encrypting with Seal and uploading to Walrus...')
      const { blobId, encryptionId } = await uploadEncryptedReceipt(
        file,
        account.address
      )

      // Step 2: Mint Receipt NFT on Sui
      setUploadStep('Minting receipt NFT on Sui...')
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
          onSuccess: (result) => {
            // Extract the NFT object ID from created objects
            // The result contains objectChanges with created objects
            let nftObjectId = result.digest // Fallback to digest

            if (result.effects?.created) {
              const createdObject = result.effects.created.find(
                (obj: { owner: { AddressOwner?: string } }) =>
                  obj.owner && 'AddressOwner' in obj.owner
              )
              if (createdObject) {
                nftObjectId = createdObject.reference.objectId
              }
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

  if (!account) {
    navigate('/')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold">Upload Receipt</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Receipt Image/PDF</label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              {preview ? (
                <div>
                  {file?.type.startsWith('image/') ? (
                    <img src={preview} alt="Preview" className="max-h-48 mx-auto mb-2" />
                  ) : (
                    <div className="text-gray-600 mb-2">PDF Selected</div>
                  )}
                  <p className="text-sm text-gray-500">{file?.name}</p>
                </div>
              ) : (
                <div>
                  <UploadIcon className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Drag & drop or click to select</p>
                  <p className="text-sm text-gray-400">PNG, JPG, or PDF</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Merchant Name *</label>
            <input
              {...register('merchant')}
              type="text"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Best Buy"
            />
            {errors.merchant && <p className="text-red-500 text-sm mt-1">{errors.merchant.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Purchase Date *</label>
              <input
                {...register('purchaseDate')}
                type="date"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.purchaseDate && <p className="text-red-500 text-sm mt-1">{errors.purchaseDate.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Amount *</label>
              <div className="flex">
                <select {...register('currency')} className="px-3 py-2 border border-r-0 rounded-l-lg bg-gray-50">
                  <option value="USD">$</option>
                  <option value="EUR">€</option>
                  <option value="GBP">£</option>
                </select>
                <input
                  {...register('amount')}
                  type="number"
                  step="0.01"
                  className="flex-1 px-4 py-2 border rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Warranty Expiry (optional)</label>
            <input
              {...register('warrantyExpiry')}
              type="date"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Category *</label>
            <select
              {...register('category')}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="electronics">Electronics</option>
              <option value="clothing">Clothing</option>
              <option value="home">Home & Garden</option>
              <option value="automotive">Automotive</option>
              <option value="other">Other</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={!file || isUploading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
