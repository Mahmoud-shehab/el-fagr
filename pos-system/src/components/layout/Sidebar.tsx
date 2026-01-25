import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Package, Users, ShoppingCart, Truck, RotateCcw,
  ArrowLeftRight, ClipboardList, AlertTriangle, Settings, LogOut, Monitor, FileBarChart
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const menuItems = [
  { icon: LayoutDashboard, label: 'لوحة التحكم', path: '/dashboard' },
  { icon: Monitor, label: 'نقطة البيع', path: '/pos' },
  { icon: ShoppingCart, label: 'المبيعات', path: '/sales' },
  { icon: Truck, label: 'المشتريات', path: '/purchases' },
  { icon: Package, label: 'المنتجات', path: '/products' },
  { icon: ClipboardList, label: 'المخزون', path: '/inventory' },
  { icon: ArrowLeftRight, label: 'التحويلات', path: '/transfers' },
  { icon: RotateCcw, label: 'المرتجعات', path: '/returns' },
  { icon: AlertTriangle, label: 'التالف', path: '/damaged' },
  { icon: Users, label: 'العملاء', path: '/customers' },
  { icon: Users, label: 'الموردين', path: '/suppliers' },
  { icon: FileBarChart, label: 'التقارير', path: '/reports' },
  { icon: Settings, label: 'الإعدادات', path: '/settings' },
]

export default function Sidebar() {
  const location = useLocation()
  const { user, logout } = useAuthStore()

  return (
    <aside className="w-64 bg-white border-l h-screen flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="الفجر الجديدة" className="w-12 h-12 rounded-lg object-contain" />
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
  )
}
