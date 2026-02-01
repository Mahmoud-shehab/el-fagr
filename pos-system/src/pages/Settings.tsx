import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { Building2, Users, Tag, Boxes, Palette, Settings as SettingsIcon, Save } from 'lucide-react'

interface SettingRow { id: string; key: string; value?: string; description?: string }
interface BranchRow { id: string; code: string; name_ar: string; branch_type?: string; phone?: string; status?: string }
interface UserRow { id: string; employee_code: string; full_name: string; username: string; role?: { name_ar?: string }; branch?: { name_ar?: string }; status?: string }
interface CategoryRow { id: string; code: string; name_ar: string; is_active?: boolean }
interface BrandRow { id: string; code: string; name: string; is_active?: boolean }
interface UnitRow { id: string; code: string; name_ar: string; is_active?: boolean }

type SettingsTab = 'general' | 'branches' | 'users' | 'categories' | 'brands' | 'units'

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')

  const tabs = [
    { key: 'general', label: 'الإعدادات العامة', icon: SettingsIcon },
    { key: 'branches', label: 'الفروع', icon: Building2 },
    { key: 'users', label: 'المستخدمين', icon: Users },
    { key: 'categories', label: 'التصنيفات', icon: Tag },
    { key: 'brands', label: 'الماركات', icon: Palette },
    { key: 'units', label: 'الوحدات', icon: Boxes },
  ]

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">الإعدادات</h1>
        <p className="text-sm text-muted-foreground">إدارة إعدادات النظام</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        <div className="w-full md:w-48">
          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as SettingsTab)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <tab.icon className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {activeTab === 'general' && <GeneralSettings />}
          {activeTab === 'branches' && <BranchesSettings />}
          {activeTab === 'users' && <UsersSettings />}
          {activeTab === 'categories' && <CategoriesSettings />}
          {activeTab === 'brands' && <BrandsSettings />}
          {activeTab === 'units' && <UnitsSettings />}
        </div>
      </div>
    </div>
  )
}

function GeneralSettings() {
  const [usdRate, setUsdRate] = useState('')
  
  const { data: settings } = useQuery<SettingRow[]>({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('system_settings').select('*')
      return (data || []) as SettingRow[]
    },
  })

  // Get USD rate from settings
  const usdRateSetting = settings?.find(s => s.key === 'usd_exchange_rate')
  
  const handleSaveUsdRate = async () => {
    if (!usdRate) return
    
    try {
      if (usdRateSetting) {
        // Update existing
        await supabase
          .from('system_settings')
          .update({ value: usdRate } as never)
          .eq('id', usdRateSetting.id)
      } else {
        // Insert new
        await supabase
          .from('system_settings')
          .insert({
            key: 'usd_exchange_rate',
            value: usdRate,
            description: 'سعر صرف الدولار مقابل الجنيه المصري',
            value_type: 'number'
          } as never)
      }
      alert('تم حفظ سعر الدولار بنجاح')
      window.location.reload()
    } catch (error) {
      alert('حدث خطأ في الحفظ')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>الإعدادات العامة</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* USD Exchange Rate */}
        <div className="border rounded-lg p-4 bg-muted/50">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-medium text-lg">سعر صرف الدولار</p>
              <p className="text-sm text-muted-foreground">سعر الدولار الأمريكي مقابل الجنيه المصري</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                placeholder={usdRateSetting?.value || '50.00'}
                value={usdRate}
                onChange={(e) => setUsdRate(e.target.value)}
                className="w-32 text-center font-bold"
              />
              <span className="text-sm text-muted-foreground">جنيه</span>
            </div>
          </div>
          {usdRateSetting && (
            <p className="text-sm text-primary">السعر الحالي: {usdRateSetting.value} جنيه</p>
          )}
          <Button onClick={handleSaveUsdRate} className="mt-3" disabled={!usdRate}>
            <Save className="h-4 w-4 ml-2" />
            حفظ سعر الدولار
          </Button>
        </div>

        {/* Other Settings */}
        {settings?.filter(s => s.key !== 'usd_exchange_rate').map((setting) => (
          <div key={setting.id} className="flex items-center justify-between border-b pb-3">
            <div>
              <p className="font-medium">{setting.key}</p>
              <p className="text-sm text-muted-foreground">{setting.description}</p>
            </div>
            <Input defaultValue={setting.value || ''} className="w-48" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function BranchesSettings() {
  const { data: branches } = useQuery<BranchRow[]>({
    queryKey: ['branches-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('*').order('created_at')
      return (data || []) as BranchRow[]
    },
  })

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <CardTitle className="text-base sm:text-lg">الفروع</CardTitle>
        <Button size="sm" className="w-full sm:w-auto">إضافة فرع</Button>
      </CardHeader>
      <CardContent>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-right py-2 px-1 sm:px-2">الكود</th>
                <th className="text-right py-2 px-1 sm:px-2">الاسم</th>
                <th className="text-right py-2 px-1 sm:px-2">النوع</th>
                <th className="text-right py-2 px-1 sm:px-2">الهاتف</th>
                <th className="text-right py-2 px-1 sm:px-2">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {branches?.map((branch) => (
                <tr key={branch.id} className="border-b">
                  <td className="py-2 px-1 sm:px-2">{branch.code}</td>
                  <td className="py-2 px-1 sm:px-2">{branch.name_ar}</td>
                  <td className="py-2 px-1 sm:px-2">{branch.branch_type === 'warehouse' ? 'مخزن' : 'منفذ بيع'}</td>
                  <td className="py-2 px-1 sm:px-2">{branch.phone}</td>
                  <td className="py-2 px-1 sm:px-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${branch.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {branch.status === 'active' ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="block md:hidden space-y-3">
          {branches?.map((branch) => (
            <Card key={branch.id} className="p-3">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{branch.name_ar}</p>
                    <p className="text-xs text-muted-foreground font-mono">{branch.code}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${branch.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {branch.status === 'active' ? 'نشط' : 'غير نشط'}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">النوع:</span>
                    <span className="font-medium">{branch.branch_type === 'warehouse' ? 'مخزن' : 'منفذ بيع'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الهاتف:</span>
                    <span className="font-medium">{branch.phone}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function UsersSettings() {
  const { data: users } = useQuery<UserRow[]>({
    queryKey: ['users-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('*, role:roles(name_ar), branch:branches(name_ar)').order('created_at')
      return (data || []) as UserRow[]
    },
  })

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <CardTitle className="text-base sm:text-lg">المستخدمين</CardTitle>
        <Button size="sm" className="w-full sm:w-auto">إضافة مستخدم</Button>
      </CardHeader>
      <CardContent>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-right py-2 px-1 sm:px-2">الكود</th>
                <th className="text-right py-2 px-1 sm:px-2">الاسم</th>
                <th className="text-right py-2 px-1 sm:px-2">اسم المستخدم</th>
                <th className="text-right py-2 px-1 sm:px-2">الدور</th>
                <th className="text-right py-2 px-1 sm:px-2">الفرع</th>
                <th className="text-right py-2 px-1 sm:px-2">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((user) => (
                <tr key={user.id} className="border-b">
                  <td className="py-2 px-1 sm:px-2">{user.employee_code}</td>
                  <td className="py-2 px-1 sm:px-2">{user.full_name}</td>
                  <td className="py-2 px-1 sm:px-2">{user.username}</td>
                  <td className="py-2 px-1 sm:px-2">{user.role?.name_ar}</td>
                  <td className="py-2 px-1 sm:px-2">{user.branch?.name_ar || 'الكل'}</td>
                  <td className="py-2 px-1 sm:px-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {user.status === 'active' ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="block md:hidden space-y-3">
          {users?.map((user) => (
            <Card key={user.id} className="p-3">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{user.employee_code}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {user.status === 'active' ? 'نشط' : 'غير نشط'}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">اسم المستخدم:</span>
                    <span className="font-medium">{user.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الدور:</span>
                    <span className="font-medium">{user.role?.name_ar}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الفرع:</span>
                    <span className="font-medium">{user.branch?.name_ar || 'الكل'}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function CategoriesSettings() {
  const { data: categories } = useQuery<CategoryRow[]>({
    queryKey: ['categories-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').order('sort_order')
      return (data || []) as CategoryRow[]
    },
  })

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <CardTitle className="text-base sm:text-lg">التصنيفات</CardTitle>
        <Button size="sm" className="w-full sm:w-auto">إضافة تصنيف</Button>
      </CardHeader>
      <CardContent>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-right py-2 px-1 sm:px-2">الكود</th>
                <th className="text-right py-2 px-1 sm:px-2">الاسم</th>
                <th className="text-right py-2 px-1 sm:px-2">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {categories?.map((cat) => (
                <tr key={cat.id} className="border-b">
                  <td className="py-2 px-1 sm:px-2">{cat.code}</td>
                  <td className="py-2 px-1 sm:px-2">{cat.name_ar}</td>
                  <td className="py-2 px-1 sm:px-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {cat.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="block md:hidden space-y-3">
          {categories?.map((cat) => (
            <Card key={cat.id} className="p-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">{cat.name_ar}</p>
                  <p className="text-xs text-muted-foreground font-mono">{cat.code}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {cat.is_active ? 'نشط' : 'غير نشط'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function BrandsSettings() {
  const { data: brands } = useQuery<BrandRow[]>({
    queryKey: ['brands-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('brands').select('*').order('name')
      return (data || []) as BrandRow[]
    },
  })

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <CardTitle className="text-base sm:text-lg">الماركات</CardTitle>
        <Button size="sm" className="w-full sm:w-auto">إضافة ماركة</Button>
      </CardHeader>
      <CardContent>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-right py-2 px-1 sm:px-2">الكود</th>
                <th className="text-right py-2 px-1 sm:px-2">الاسم</th>
                <th className="text-right py-2 px-1 sm:px-2">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {brands?.map((brand) => (
                <tr key={brand.id} className="border-b">
                  <td className="py-2 px-1 sm:px-2">{brand.code}</td>
                  <td className="py-2 px-1 sm:px-2">{brand.name}</td>
                  <td className="py-2 px-1 sm:px-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${brand.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {brand.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="block md:hidden space-y-3">
          {brands?.map((brand) => (
            <Card key={brand.id} className="p-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">{brand.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{brand.code}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${brand.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {brand.is_active ? 'نشط' : 'غير نشط'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function UnitsSettings() {
  const { data: units } = useQuery<UnitRow[]>({
    queryKey: ['units-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('units').select('*').order('name')
      return (data || []) as UnitRow[]
    },
  })

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <CardTitle className="text-base sm:text-lg">الوحدات</CardTitle>
        <Button size="sm" className="w-full sm:w-auto">إضافة وحدة</Button>
      </CardHeader>
      <CardContent>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-right py-2 px-1 sm:px-2">الكود</th>
                <th className="text-right py-2 px-1 sm:px-2">الاسم</th>
                <th className="text-right py-2 px-1 sm:px-2">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {units?.map((unit) => (
                <tr key={unit.id} className="border-b">
                  <td className="py-2 px-1 sm:px-2">{unit.code}</td>
                  <td className="py-2 px-1 sm:px-2">{unit.name_ar}</td>
                  <td className="py-2 px-1 sm:px-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${unit.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {unit.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="block md:hidden space-y-3">
          {units?.map((unit) => (
            <Card key={unit.id} className="p-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">{unit.name_ar}</p>
                  <p className="text-xs text-muted-foreground font-mono">{unit.code}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${unit.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {unit.is_active ? 'نشط' : 'غير نشط'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
