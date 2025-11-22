import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Receipt {
  id: string
  blobId: string
  sealPolicyId: string
  merchant: string
  purchaseDate: string
  amount: number
  currency: string
  warrantyExpiry: string | null
  category: string
  createdAt: string
}

interface ReceiptStore {
  receipts: Receipt[]
  addReceipt: (receipt: Receipt) => void
  removeReceipt: (id: string) => void
  updateReceipt: (id: string, updates: Partial<Receipt>) => void
  clearReceipts: () => void
}

export const useReceiptStore = create<ReceiptStore>()(
  persist(
    (set) => ({
      receipts: [],
      addReceipt: (receipt) =>
        set((state) => ({
          receipts: [receipt, ...state.receipts],
        })),
      removeReceipt: (id) =>
        set((state) => ({
          receipts: state.receipts.filter((r) => r.id !== id),
        })),
      updateReceipt: (id, updates) =>
        set((state) => ({
          receipts: state.receipts.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        })),
      clearReceipts: () => set({ receipts: [] }),
    }),
    {
      name: 'vault-guard-receipts',
    }
  )
)
