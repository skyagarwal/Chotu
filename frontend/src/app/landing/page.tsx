// Landing Page for mangwale.ai
import Link from 'next/link'
import { MessageSquare, MapPin, ShoppingBag, Truck, Star, Phone } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Hero Section */}
      <header className="container mx-auto px-4 py-20 text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-green-600 mb-4">
            Mangwale AI
          </h1>
          <p className="text-2xl text-gray-700 mb-8">
            Your AI-Powered Delivery & Shopping Assistant
          </p>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-12">
            Chat with our AI to order food, book deliveries, shop products, and more. 
            Available on WhatsApp, Telegram, and Web.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="https://chat.mangwale.ai"
            className="px-8 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <MessageSquare className="w-5 h-5" />
            Start Chatting
          </Link>
          <Link
            href="https://admin.mangwale.ai"
            className="px-8 py-4 bg-white text-green-600 border-2 border-green-600 rounded-lg font-semibold hover:bg-green-50 transition-colors"
          >
            Admin Dashboard
          </Link>
        </div>
      </header>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
          What Can You Do?
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Food Ordering */}
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <ShoppingBag className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Food Ordering</h3>
            <p className="text-gray-600">
              Order from local restaurants with AI assistance. Just tell us what you want!
            </p>
          </div>

          {/* Parcel Delivery */}
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Truck className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Parcel Delivery</h3>
            <p className="text-gray-600">
              Send parcels anywhere with instant pricing and real-time tracking.
            </p>
          </div>

          {/* Location Services */}
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <MapPin className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Smart Routing</h3>
            <p className="text-gray-600">
              AI-powered zone detection and optimal delivery route planning.
            </p>
          </div>

          {/* Multi-Channel */}
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Phone className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Multi-Channel</h3>
            <p className="text-gray-600">
              Chat via WhatsApp, Telegram, or Web - your conversation syncs everywhere.
            </p>
          </div>

          {/* Rewards */}
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Star className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Rewards Program</h3>
            <p className="text-gray-600">
              Earn points for every order and unlock exclusive rewards!
            </p>
          </div>

          {/* 24/7 Support */}
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">24/7 AI Support</h3>
            <p className="text-gray-600">
              Our AI assistant is always available to help you anytime, anywhere.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-green-600 text-white py-16 mt-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of users enjoying AI-powered delivery services
          </p>
          <Link
            href="https://chat.mangwale.ai"
            className="inline-block px-8 py-4 bg-white text-green-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Start Chatting Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="container mx-auto px-4 text-center">
          <p>© 2025 Mangwale AI. All rights reserved.</p>
          <div className="mt-4 space-x-4">
            <Link href="https://admin.mangwale.ai" className="hover:text-white">
              Admin
            </Link>
            <Link href="https://chat.mangwale.ai" className="hover:text-white">
              Chat
            </Link>
            <Link href="https://api.mangwale.ai/health" className="hover:text-white">
              API Status
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
