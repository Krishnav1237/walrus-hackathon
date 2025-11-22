"use client";

import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { Shield, Upload, Bell, FileCheck } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const account = useCurrentAccount();

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold">VaultGuard</span>
        </div>
        <ConnectButton />
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold mb-6">
          Never Lose a Receipt.
          <br />
          <span className="text-blue-600">Never Miss a Warranty.</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Securely store your receipts and warranties with end-to-end encryption.
          Get automatic reminders before warranties expire. Prove purchases with blockchain-backed proof.
        </p>
        {account ? (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition"
          >
            Go to Dashboard
          </Link>
        ) : (
          <div className="text-gray-500">Connect your wallet to get started</div>
        )}
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Upload className="h-10 w-10 text-blue-600" />}
            title="Encrypted Storage"
            description="Your receipts are encrypted with Seal before being stored on Walrus. Only you can decrypt and access them."
          />
          <FeatureCard
            icon={<Bell className="h-10 w-10 text-blue-600" />}
            title="Smart Reminders"
            description="Never miss a warranty claim again. Get notified 30, 7, and 1 day before your warranties expire."
          />
          <FeatureCard
            icon={<FileCheck className="h-10 w-10 text-blue-600" />}
            title="Proof of Purchase"
            description="Generate verifiable proof of purchase backed by Sui blockchain. Perfect for disputes and claims."
          />
        </div>
      </section>

      {/* How it Works */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <StepCard number={1} title="Connect Wallet" description="Connect your Sui wallet to create your personal vault" />
          <StepCard number={2} title="Upload Receipt" description="Take a photo or upload your receipt/warranty document" />
          <StepCard number={3} title="Auto-Encrypt" description="Your document is encrypted and stored on Walrus" />
          <StepCard number={4} title="Get Reminders" description="Receive notifications before warranties expire" />
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-gray-500">
        <p>Built with Sui & Walrus for the Web3 Hackathon</p>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
