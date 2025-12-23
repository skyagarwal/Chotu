# Mangwale Unified DashboardThis is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).



A modern, AI-powered unified dashboard for the Mangwale super app ecosystem. Built with Next.js 15, TypeScript, and integrates with multiple backend services.## Getting Started



## 🚀 Quick StartFirst, run the development server:



The development server is already running on **http://localhost:3000**```bash

npm run dev

Visit the landing page to see the module showcase and start exploring!# or

yarn dev

## ✅ What's Complete# or

pnpm dev

### Core Infrastructure# or

- ✅ **Next.js 15 Project** - Initialized with App Router, TypeScript, Tailwind CSSbun dev

- ✅ **496 Dependencies Installed** - React Query, Zustand, Socket.io, Radix UI, Framer Motion```

- ✅ **Environment Configuration** - All backend URLs configured

- ✅ **Directory Structure** - Public and admin route groups createdOpen [http://localhost:3000](http://localhost:3000) with your browser to see the result.



### API Integration LayerYou can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

- ✅ **Admin Backend Client** - Full API for NLU, agents, training, models, flows

- ✅ **Search API Client** - Multi-module search with 8 module typesThis project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

- ✅ **Mangwale AI Client** - Conversation management and session handling

- ✅ **WebSocket Client** - Real-time chat with auto-reconnection## Learn More



### Type DefinitionsTo learn more about Next.js, take a look at the following resources:

- ✅ **Admin Types** - Agent, Dataset, TrainingJob, Model, Flow, Metrics, AuditLog

- ✅ **Search Types** - SearchItem, SearchFilters, SearchResponse, Categories- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.

- ✅ **Chat Types** - ChatMessage, Session, ConversationContext, MessageBlock- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.



### UI PagesYou can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

- ✅ **Landing Page** - Beautiful hero with 8 module cards, CTA buttons, "How It Works"

## Deploy on Vercel

### Utilities

- ✅ **Helper Functions** - formatCurrency, formatDate, debounce, generateId, cn()The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.



## 🌐 Backend ServicesCheck out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| **Admin Backend** | 8080 | 🔴 Not running | AI training, NLU, agents |
| **Mangwale AI** | 3200 | ✅ Running | Chat orchestration |
| **Search API** | 3100 | 🔴 Not running | Multi-module search |
| **Dashboard** | 3000 | ✅ Running | This app |

## 📦 Tech Stack

- **Next.js 15** - React framework with Turbopack
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Query** - Server state
- **Zustand** - Client state
- **Socket.io** - WebSockets
- **Radix UI** - Accessible components
- **Framer Motion** - Animations

## 🎯 8 Module Ecosystem

1. 🍔 **Food** - Restaurant ordering
2. 🛒 **Ecom** - Product shopping
3. 🏨 **Rooms** - Hotel booking
4. 🎬 **Movies** - Ticket booking
5. 🔧 **Services** - Home services
6. 📦 **Parcel** - Delivery
7. 🚗 **Ride** - Transportation
8. ❤️ **Health** - Healthcare

## 📋 Next Steps (TODO)

### High Priority
1. **Chat Interface** - Create conversational UI with WebSocket integration
2. **Search Pages** - Module-specific search with filters
3. **Shared Components** - Button, Input, Card, Modal

### Medium Priority
4. **Admin Dashboard** - Metrics, stats, activity feed
5. **Agent Management** - CRUD for AI agents
6. **Training Interface** - Dataset upload, job monitoring

### Low Priority
7. **Authentication** - Login/signup flow
8. **Order Tracking** - Real-time order updates
9. **User Profile** - Settings, addresses, payments

## 🔑 Environment Variables

Located in `.env.local`:

```env
NEXT_PUBLIC_ADMIN_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_MANGWALE_AI_URL=http://localhost:3200
NEXT_PUBLIC_SEARCH_API_URL=http://localhost:3100
NEXT_PUBLIC_PHP_BACKEND_URL=https://testing.mangwale.com
NEXT_PUBLIC_WS_URL=ws://localhost:3200
```

## 🏗️ Project Structure

```
src/
├── app/
│   ├── (public)/          # Customer-facing routes
│   │   ├── page.tsx       # Landing page ✅
│   │   ├── chat/          # Chat interface (TODO)
│   │   ├── search/        # Search (TODO)
│   │   └── orders/        # Orders (TODO)
│   ├── (admin)/           # Admin routes
│   │   ├── dashboard/     # Dashboard (TODO)
│   │   ├── agents/        # Agent mgmt (TODO)
│   │   ├── models/        # Models (TODO)
│   │   └── training/      # Training (TODO)
│   └── layout.tsx         # Root layout
├── lib/
│   ├── api/               # API clients ✅
│   ├── websocket/         # WebSocket ✅
│   └── utils/             # Helpers ✅
├── types/                 # TypeScript types ✅
└── components/            # UI components (TODO)
```

## 🚀 Development Commands

```bash
# Already running on port 3000
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint
npm run lint
```

## 📚 Documentation

- [Complete Architecture](../MANGWALE_SCALABLE_ARCHITECTURE.md)
- [Integration Map](../ARCHITECTURE_MAP.md)

## 🎨 Design

- **Primary Color**: Blue-600
- **Font**: Inter
- **Component Library**: Radix UI
- **Icons**: Lucide React

---

**Status**: Foundation complete, ready for UI development 🚀
