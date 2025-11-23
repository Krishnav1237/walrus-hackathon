import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit'
import { Shield, Upload, Bell, FileCheck, Lock, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Home() {
  const account = useCurrentAccount()

  return (
    <main className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl">
            <Shield className="h-7 w-7 text-emerald-500" />
          </div>
          <span className="text-xl font-semibold text-white">VaultGuard</span>
        </div>
        <ConnectButton />
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full mb-8">
          <Lock className="h-4 w-4 text-emerald-400" />
          <span className="text-sm text-emerald-400 font-medium">End-to-end encrypted on Walrus</span>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold mb-6 text-white leading-tight">
          Never Lose a Receipt.
          <br />
          <span className="text-emerald-400">Never Miss a Warranty.</span>
        </h1>

        <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Securely store your receipts and warranties with military-grade encryption.
          Get smart reminders before warranties expire. Powered by Sui blockchain.
        </p>

        {account ? (
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 bg-emerald-500 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-emerald-600 transition-all hover:shadow-lg hover:shadow-emerald-500/25"
          >
            Go to Dashboard
            <Zap className="h-5 w-5" />
          </Link>
        ) : (
          <div className="text-slate-500">Connect your wallet to get started</div>
        )}
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Upload className="h-8 w-8 text-emerald-400" />}
            title="Encrypted Storage"
            description="Your receipts are encrypted with Seal before being stored on Walrus. Only you can access them."
          />
          <FeatureCard
            icon={<Bell className="h-8 w-8 text-emerald-400" />}
            title="Smart Reminders"
            description="Get notified 30, 7, and 1 day before your warranties expire. Never miss a claim."
          />
          <FeatureCard
            icon={<FileCheck className="h-8 w-8 text-emerald-400" />}
            title="Proof of Purchase"
            description="Generate verifiable proof backed by Sui blockchain for disputes and claims."
          />
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-white mb-2">256-bit</div>
              <div className="text-slate-400">AES Encryption</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-2">100%</div>
              <div className="text-slate-400">Decentralized</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-2">Forever</div>
              <div className="text-slate-400">Data Availability</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 text-center">
        <p className="text-slate-600 text-sm">
          Built with Sui & Walrus • Secured by Seal
        </p>
      </footer>
    </main>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition-colors">
      <div className="p-3 bg-emerald-500/10 rounded-xl w-fit mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2 text-white">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
    </div>
  )
}
