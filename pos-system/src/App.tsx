import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
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

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
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
        <Route path="reports" element={<Reports />} />
        <Route path="partner-withdrawals" element={<PartnerWithdrawals />} />
        <Route path="customer-statement" element={<CustomerStatement />} />
        <Route path="stock-count" element={<StockCount />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
