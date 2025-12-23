'use client';

import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center">
        {/* 404 Animation */}
        <div className="relative mb-8">
          <h1 className="text-[180px] font-bold text-gray-200 leading-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-8xl">🤖</div>
          </div>
        </div>

        {/* Error Message */}
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          Page Not Found
        </h2>
        <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
          Oops! The page you&apos;re looking for doesn&apos;t exist. It might have been moved or deleted.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 bg-gradient-to-r from-[#059211] to-[#047a0e] text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all"
          >
            <Home size={20} />
            Go to Homepage
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 bg-white text-gray-700 px-6 py-3 rounded-lg font-medium border-2 border-gray-200 hover:border-[#059211] hover:text-[#059211] transition-all"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
        </div>

        {/* Popular Links */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">Popular Pages</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/admin/dashboard"
              className="text-sm text-[#059211] hover:underline font-medium"
            >
              Dashboard
            </Link>
            <span className="text-gray-300">•</span>
            <Link
              href="/admin/agents"
              className="text-sm text-[#059211] hover:underline font-medium"
            >
              Agents
            </Link>
            <span className="text-gray-300">•</span>
            <Link
              href="/admin/training"
              className="text-sm text-[#059211] hover:underline font-medium"
            >
              Training
            </Link>
            <span className="text-gray-300">•</span>
            <Link
              href="/admin/models"
              className="text-sm text-[#059211] hover:underline font-medium"
            >
              Models
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
