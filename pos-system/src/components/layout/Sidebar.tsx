import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Package, Users, ShoppingCart, Truck, RotateCcw,
  ArrowLeftRight, ClipboardList, AlertTriangle, Settings, LogOut, Monitor, FileBarChart,
  DollarSign, FileText, PackageCheck, Receipt, Menu, X
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useState } from 'react'

const menuItems = [
  { icon: LayoutDashboard, label: 'لوحة التحكم', path: '/dashboard' },
  { icon: Monitor, label: 'نقطة البيع', path: '/pos' },
  { icon: ShoppingCart, label: 'المبيعات', path: '/sales' },
  { icon: Truck, label: 'المشتريات', path: '/purchases' },
  { icon: Package, label: 'المنتجات', path: '/products' },
  { icon: ClipboardList, label: 'المخزون', path: '/inventory' },
  { icon: PackageCheck, label: 'جرد المخزون', path: '/stock-count' },
  { icon: ArrowLeftRight, label: 'التحويلات', path: '/transfers' },
  { icon: RotateCcw, label: 'المرتجعات', path: '/returns' },
  { icon: AlertTriangle, label: 'التالف', path: '/damaged' },
  { icon: Users, label: 'العملاء', path: '/customers' },
  { icon: FileText, label: 'كشف حساب عميل', path: '/customer-statement' },
  { icon: Users, label: 'الموردين', path: '/suppliers' },
  { icon: Receipt, label: 'المصروفات', path: '/expenses' },
  { icon: DollarSign, label: 'سحوبات الشركاء', path: '/partner-withdrawals' },
  { icon: FileBarChart, label: 'التقارير', path: '/reports' },
  { icon: Settings, label: 'الإعدادات', path: '/settings' },
]

export default function Sidebar() {
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile Menu Button - Hidden when sidebar is open */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-white rounded-md shadow-lg border"
        >
          <Menu className="h-6 w-6" />
        </button>
      )}

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "w-64 bg-white border-l h-screen flex flex-col fixed lg:static z-40 transition-transform duration-300 right-0",
        isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
      {/* Header with Logo and Close Button */}
      <div className="p-4 border-b relative">
        {/* Close Button - Only on Mobile */}
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden absolute top-4 left-4 p-1 hover:bg-muted rounded-md"
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="flex items-center gap-3">
          <img src="/el-fagr/logo.jpg" alt="الفجر الجديدة" className="w-12 h-12 rounded-lg object-contain" />
          <div>
            <h1 className="text-xl font-bold text-primary">الفجر الجديدة</h1>
            <p className="text-sm text-muted-foreground">{user?.branch?.name_ar || 'المخزن الرئيسي'}</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setIsOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              location.pathname === item.path
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-medium">{user?.full_name?.[0]}</span>
          </div>
          <div>
            <p className="text-sm font-medium">{user?.full_name}</p>
            <p className="text-xs text-muted-foreground">{user?.role?.name_ar}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-2 text-sm text-destructive hover:underline w-full"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </button>
      </div>
    </aside>
    </>
  )
}
