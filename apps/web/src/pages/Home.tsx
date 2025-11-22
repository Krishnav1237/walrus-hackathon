import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit'
import { Shield, Upload, Bell, FileCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Home() {
  const account = useCurrentAccount()

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold">VaultGuard</span>
        </div>
        <ConnectButton />
      </header>

      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold mb-6">
          Never Lose a Receipt.
          <br />
          <span className="text-blue-600">Never Miss a Warranty.</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Securely store your receipts and warranties with end-to-end encryption.
          Get automatic reminders before warranties expire.
        </p>
        {account ? (
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition"
          >
            Go to Dashboard
          </Link>
        ) : (
          <div className="text-gray-500">Connect your wallet to get started</div>
        )}
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Upload className="h-10 w-10 text-blue-600" />}
            title="Encrypted Storage"
            description="Your receipts are encrypted before being stored on Walrus. Only you can access them."
          />
          <FeatureCard
            icon={<Bell className="h-10 w-10 text-blue-600" />}
            title="Smart Reminders"
            description="Get notified 30, 7, and 1 day before your warranties expire."
          />
          <FeatureCard
            icon={<FileCheck className="h-10 w-10 text-blue-600" />}
            title="Proof of Purchase"
            description="Generate verifiable proof backed by Sui blockchain for disputes."
          />
        </div>
      </section>

      <footer className="container mx-auto px-4 py-8 text-center text-gray-500">
        <p>Built with Sui & Walrus</p>
      </footer>
    </main>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}
