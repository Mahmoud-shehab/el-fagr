import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuthStore } from '@/stores/authStore'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Products from '@/pages/Products'
import Customers from '@/pages/Customers'
import Sales from '@/pages/Sales'
import Inventory from '@/pages/Inventory'
import Purchases from '@/pages/Purchases'
import Suppliers from '@/pages/Suppliers'
import Returns from '@/pages/Returns'
import Transfers from '@/pages/Transfers'
import Damaged from '@/pages/Damaged'
import Settings from '@/pages/Settings'
import POS from '@/pages/POS'
import Reports from '@/pages/Reports'
import PartnerWithdrawals from '@/pages/PartnerWithdrawals'
import CustomerStatement from '@/pages/CustomerStatement'
import StockCount from '@/pages/StockCount'
import Expenses from '@/pages/Expenses'
import ExpenseCategories from '@/pages/ExpenseCategories'
import BankAccounts from '@/pages/BankAccounts'

// Component to redirect users based on their role
function HomeRedirect() {
  const { user } = useAuthStore()
  const userRole = user?.role?.name_ar || user?.role?.name
  
  // Redirect محاسب and مدير فرع to POS instead of Dashboard
  if (userRole === 'محاسب' || userRole === 'مدير فرع') {
    return <Navigate to="/pos" replace />
  }
  
  return <Navigate to="/dashboard" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<HomeRedirect />} />
        <Route path="dashboard" element={
          <ProtectedRoute restrictedRoles={['محاسب', 'مدير فرع']}>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="pos" element={<POS />} />
        <Route path="products" element={<Products />} />
        <Route path="customers" element={<Customers />} />
        <Route path="sales" element={<Sales />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="returns" element={<Returns />} />
        <Route path="transfers" element={<Transfers />} />
        <Route path="damaged" element={<Damaged />} />
        <Route path="reports" element={
          <ProtectedRoute restrictedRoles={['محاسب', 'مدير فرع']}>
            <Reports />
          </ProtectedRoute>
        } />
        <Route path="partner-withdrawals" element={
          <ProtectedRoute restrictedRoles={['محاسب', 'مدير فرع']}>
            <PartnerWithdrawals />
          </ProtectedRoute>
        } />
        <Route path="customer-statement" element={<CustomerStatement />} />
        <Route path="stock-count" element={<StockCount />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="expense-categories" element={<ExpenseCategories />} />
        <Route path="bank-accounts" element={<BankAccounts />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
