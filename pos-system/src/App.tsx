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
  
  // موظف مخزن -> المخزون
  if (userRole === 'موظف مخزن') {
    return <Navigate to="/inventory" replace />
  }
  
  // موظف مبيعات -> المنتجات
  if (userRole === 'موظف مبيعات') {
    return <Navigate to="/products" replace />
  }
  
  // محاسب ومدير فرع -> نقطة البيع
  if (userRole === 'محاسب' || userRole === 'مدير فرع') {
    return <Navigate to="/pos" replace />
  }
  
  // باقي المستخدمين -> لوحة التحكم
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
        <Route path="customers" element={
          <ProtectedRoute restrictedRoles={['موظف مخزن', 'موظف مبيعات']}>
            <Customers />
          </ProtectedRoute>
        } />
        <Route path="sales" element={
          <ProtectedRoute restrictedRoles={['موظف مخزن', 'موظف مبيعات']}>
            <Sales />
          </ProtectedRoute>
        } />
        <Route path="inventory" element={<Inventory />} />
        <Route path="purchases" element={
          <ProtectedRoute restrictedRoles={['موظف مخزن', 'موظف مبيعات']}>
            <Purchases />
          </ProtectedRoute>
        } />
        <Route path="suppliers" element={
          <ProtectedRoute restrictedRoles={['موظف مخزن', 'موظف مبيعات']}>
            <Suppliers />
          </ProtectedRoute>
        } />
        <Route path="returns" element={
          <ProtectedRoute restrictedRoles={['موظف مخزن', 'موظف مبيعات']}>
            <Returns />
          </ProtectedRoute>
        } />
        <Route path="transfers" element={
          <ProtectedRoute restrictedRoles={['موظف مخزن', 'موظف مبيعات']}>
            <Transfers />
          </ProtectedRoute>
        } />
        <Route path="damaged" element={
          <ProtectedRoute restrictedRoles={['موظف مخزن', 'موظف مبيعات']}>
            <Damaged />
          </ProtectedRoute>
        } />
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
        <Route path="customer-statement" element={
          <ProtectedRoute restrictedRoles={['موظف مخزن', 'موظف مبيعات']}>
            <CustomerStatement />
          </ProtectedRoute>
        } />
        <Route path="stock-count" element={<StockCount />} />
        <Route path="expenses" element={
          <ProtectedRoute restrictedRoles={['موظف مخزن', 'موظف مبيعات']}>
            <Expenses />
          </ProtectedRoute>
        } />
        <Route path="expense-categories" element={
          <ProtectedRoute restrictedRoles={['موظف مخزن', 'موظف مبيعات']}>
            <ExpenseCategories />
          </ProtectedRoute>
        } />
        <Route path="bank-accounts" element={
          <ProtectedRoute restrictedRoles={['موظف مخزن', 'موظف مبيعات']}>
            <BankAccounts />
          </ProtectedRoute>
        } />
        <Route path="settings" element={
          <ProtectedRoute restrictedRoles={['موظف مخزن', 'موظف مبيعات']}>
            <Settings />
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
  )
}

export default App
