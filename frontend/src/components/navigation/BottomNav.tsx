'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle, Package, Wallet, User, MapPin } from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  emoji?: string
}

const navItems: NavItem[] = [
  {
    href: '/chat',
    label: 'Chat',
    icon: <MessageCircle className="w-5 h-5" />,
    emoji: '💬',
  },
  {
    href: '/orders',
    label: 'Orders',
    icon: <Package className="w-5 h-5" />,
    emoji: '📦',
  },
  {
    href: '/wallet',
    label: 'Wallet',
    icon: <Wallet className="w-5 h-5" />,
    emoji: '💰',
  },
  {
    href: '/addresses',
    label: 'Address',
    icon: <MapPin className="w-5 h-5" />,
    emoji: '📍',
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: <User className="w-5 h-5" />,
    emoji: '👤',
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 z-40 safe-area-pb">
      <div className="max-w-2xl mx-auto flex justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                isActive
                  ? 'text-orange-500'
                  : 'text-gray-500 hover:text-orange-500'
              }`}
            >
              <span className="text-xl">{item.emoji}</span>
              <span className={`text-xs ${isActive ? 'font-medium' : ''}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default BottomNav
