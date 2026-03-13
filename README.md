# Banking Dashboard Application

A modern, feature-rich banking dashboard built with React, TypeScript, Tailwind CSS, and Tauri.

## 🎨 Design System

This project follows a **strict design system** to maintain consistency across all components. See [.github/copilot-instructions.md](.github/copilot-instructions.md) for detailed guidelines.

### Key Design Principles
- **Color Palette**: Teal/Green primary colors (`primary-600: #0d9488`)
- **Typography**: Bold headings, medium body text
- **Spacing**: Consistent 6-unit spacing (`p-6`, `gap-6`)
- **Dark Mode**: All components support dark mode
- **Responsive**: Mobile-first design approach

## 📚 Documentation

- **[DESIGN_ANALYSIS.md](DESIGN_ANALYSIS.md)** - Complete UI design breakdown and component architecture
- **[QUICKSTART.md](QUICKSTART.md)** - Step-by-step implementation guide
- **[.github/copilot-instructions.md](.github/copilot-instructions.md)** - Copilot instructions for consistent code generation

## 🏗️ Project Structure

```
src/
├── components/
│   ├── layout/          # Sidebar, Header, MainLayout
│   ├── ui/              # Button, Badge, Avatar, Card
│   ├── cards/           # StatCard, specialized cards
│   ├── charts/          # Chart components (Recharts)
│   └── tables/          # TransactionTable
├── pages/               # Page components
├── types/               # TypeScript type definitions
├── data/                # Mock data for development
├── utils/               # Utility functions
│   ├── formatters.ts    # Currency, number formatting
│   ├── dateHelpers.ts   # Date formatting utilities
│   ├── calculations.ts  # Financial calculations
│   └── constants.ts     # Design system constants
└── App.tsx
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Rust (for Tauri)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Install required packages:
```bash
npm install react-router-dom recharts lucide-react date-fns clsx
```

### Development

Run the development server:
```bash
npm run tauri dev
```

### Build

Build for production:
```bash
npm run tauri build
```

## 🎨 Tech Stack

- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS v4 with custom theme
- **Desktop**: Tauri v2
- **Build Tool**: Vite 7
- **Icons**: Lucide React
- **Charts**: Recharts
- **Routing**: React Router v6
- **Date Utils**: date-fns

## 📦 Key Features

- ✅ Modern banking dashboard UI
- ✅ Dark mode support
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Transaction management
- ✅ Financial analytics and charts
- ✅ Real-time data visualization
- ✅ Export functionality (PDF/CSV)
- ✅ TypeScript for type safety
- ✅ Component-based architecture
- ✅ **FBR Tax Integration** - Automatic fiscal invoice generation

## 🧾 FBR Tax Integration

This application includes **Federal Board of Revenue (FBR)** tax integration for Pakistan tax compliance.

### Features
- ✅ Automatic fiscal invoice generation on contract creation
- ✅ Service health monitoring
- ✅ Buyer information collection (CNIC, NTN)
- ✅ Graceful error handling and fallback
- ✅ Tax calculation helpers

### Quick Setup

1. Configure environment variables in `.env`:
```env
VITE_FBR_BASE_URL=http://localhost:8524/api/IMSFiscal
VITE_FBR_POS_ID=123456
VITE_FBR_ENABLED=true
```

2. Start the FBR fiscal service on port 8524

3. Create contracts - FBR invoices are generated automatically!

### Configuration

Access **Settings** page (`/settings`) to:
- ✅ Enable/disable FBR integration
- ✅ Configure POS ID and service URL
- ✅ Set default tax rate and payment modes
- ✅ Manage company information
- ✅ Test FBR connection before saving

### Documentation
- **[FBR_INTEGRATION.md](FBR_INTEGRATION.md)** - Complete FBR integration guide
- **[SETTINGS_GUIDE.md](SETTINGS_GUIDE.md)** - Settings page user guide

For detailed setup, API documentation, troubleshooting, and examples, see [FBR_INTEGRATION.md](FBR_INTEGRATION.md).

## 🎯 Component Guidelines

### Always Use:
- Design system colors (primary-600, etc.)
- Dark mode classes (dark:)
- TypeScript prop interfaces
- Lucide-react icons
- Proper spacing (p-6, gap-6)
- Transition effects (transition-colors)
- Responsive classes (md:, lg:)

### Never Use:
- Inline styles
- Arbitrary color values
- Hardcoded data in components
- `any` type in TypeScript

## 📖 Component Examples

### Button
```tsx
<button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
  Click Me
</button>
```

### Card
```tsx
<div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
  Card Content
</div>
```

### Stat Card
```tsx
<StatCard 
  title="Total Income"
  value={5200}
  trend={{ value: 3.5, direction: 'up' }}
  period="Last Month"
/>
```

## 🛠️ Utility Functions

### Currency Formatting
```tsx
import { formatCurrency } from './utils/formatters';
formatCurrency(1234.56); // "$1,234.56"
```

### Date Formatting
```tsx
import { formatDateTime } from './utils/dateHelpers';
formatDateTime('2025-02-13T09:30:00Z'); // "Feb 13, 2025, 09:30 AM"
```

## 📱 Pages

- `/dashboard` - Main dashboard overview
- `/analytics` - Financial analytics and charts
- `/transactions` - Transaction history and management
- `/investments` - Investment portfolio
- `/transfers` - Money transfers
- `/card` - Card management
- `/rewards` - Rewards program
- `/security` - Security settings
- `/settings` - Application settings
- `/support` - Help and support

## 🎨 Color Palette

```
Primary Colors (Teal/Green):
- primary-600: #0d9488 (Main brand color)
- primary-700: #0f766e (Hover states)

Status Colors:
- green-500: #22c55e (Success)
- red-500: #ef4444 (Error)
- blue-500: #3b82f6 (Info)
- yellow-500: #eab308 (Warning)
```

## 🤝 Contributing

When contributing, please:
1. Follow the design system guidelines
2. Use TypeScript with proper types
3. Include dark mode support
4. Write responsive, mobile-first code
5. Test across different screen sizes
6. Reference [.github/copilot-instructions.md](.github/copilot-instructions.md)

## 📝 License

MIT

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
