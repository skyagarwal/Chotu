import Link from 'next/link'
import { ArrowRight, MessageSquare, Search, ShoppingCart, Utensils, Hotel, Film, Truck, Car, Heart, Wrench } from 'lucide-react'

const modules = [
  {
    name: 'Food Delivery',
    icon: Utensils,
    description: 'Order from your favorite restaurants',
    module: 'food',
    color: 'bg-primary',
  },
  {
    name: 'E-commerce',
    icon: ShoppingCart,
    description: 'Shop products from local stores',
    module: 'ecom',
    color: 'bg-primary',
  },
  {
    name: 'Hotel Rooms',
    icon: Hotel,
    description: 'Book hotel rooms and accommodations',
    module: 'rooms',
    color: 'bg-yellow-500',
  },
  {
    name: 'Movies',
    icon: Film,
    description: 'Book movie tickets',
    module: 'movies',
    color: 'bg-primary',
  },
  {
    name: 'Services',
    icon: Wrench,
    description: 'Find home and professional services',
    module: 'services',
    color: 'bg-primary',
  },
  {
    name: 'Parcel Delivery',
    icon: Truck,
    description: 'Send parcels across the city',
    module: 'parcel',
    color: 'bg-yellow-500',
  },
  {
    name: 'Ride Booking',
    icon: Car,
    description: 'Book rides to anywhere',
    module: 'ride',
    color: 'bg-primary',
  },
  {
    name: 'Healthcare',
    icon: Heart,
    description: 'Find doctors and health services',
    module: 'health',
    color: 'bg-yellow-500',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#fffff6]">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            Welcome to <span className="text-primary">Mangwale</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Your AI-powered super app for everything you need
          </p>
          
          {/* CTA Buttons */}
          <div className="flex gap-4 justify-center">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-lg hover:bg-primary-hover transition-colors text-lg font-semibold shadow-lg"
            >
              <MessageSquare size={24} />
              Start Chatting
              <ArrowRight size={20} />
            </Link>
            
            <Link
              href="/search"
              className="inline-flex items-center gap-2 bg-white text-primary border-2 border-primary px-8 py-4 rounded-lg hover:bg-primary hover:text-white transition-colors text-lg font-semibold shadow-lg"
            >
              <Search size={24} />
              Search Now
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-900">
            What can Mangwale do for you?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {modules.map((module) => {
              const Icon = module.icon
              return (
                <Link
                  key={module.module}
                  href={`/chat?module=${module.module}`}
                  className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border-2 border-gray-100 hover:border-primary"
                >
                  <div className={`${module.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">
                    {module.name}
                  </h3>
                  <p className="text-gray-600">
                    {module.description}
                  </p>
                </Link>
              )
            })}
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-gradient-to-br from-primary to-primary-hover rounded-2xl p-12 shadow-xl">
          <h2 className="text-3xl font-bold text-center mb-12 text-white">
            How It Works
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-yellow-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-gray-900">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">
                Start a Conversation
              </h3>
              <p className="text-green-50">
                Chat with our AI assistant naturally, just like texting a friend
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-yellow-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-gray-900">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">
                Get Personalized Results
              </h3>
              <p className="text-green-50">
                Our AI understands your needs and finds the best options for you
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-yellow-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-gray-900">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">
                Complete Your Order
              </h3>
              <p className="text-green-50">
                Book, buy, or order seamlessly within the conversation
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-600">
          <p>Powered by AI • Available 24/7 • Multi-language Support</p>
        </div>
      </div>
    </div>
  )
}
