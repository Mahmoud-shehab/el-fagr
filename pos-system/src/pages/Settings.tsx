import { useState, ChangeEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Building2, Users, Tag, Boxes, Palette, Settings as SettingsIcon, Save, Plus, Trash2, Edit } from 'lucide-react'

interface SettingRow { id: string; key: string; value?: string; description?: string }
interface BranchRow { id: string; code: string; name_ar: string; branch_type?: string; phone?: string; status?: string }
interface UserRow { id: string; employee_code: string; full_name: string; full_name_ar?: string; username: string; role_id?: string; branch_id?: string; phone?: string; email?: string; role?: { name_ar?: string }; branch?: { name_ar?: string }; status?: string }
interface RoleRow { id: string; name_ar: string; name: string }
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
  const [showDialog, setShowDialog] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    employee_code: '',
    full_name: '',
    full_name_ar: '',
    username: '',
    password: '',
    role_id: '',
    branch_id: '',
    phone: '',
    email: '',
  })
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuthStore()
  
  // Check if current user is system admin
  const isSystemAdmin = currentUser?.role?.name_ar === 'مدير النظام' || currentUser?.role?.name === 'مدير النظام'

  const { data: allUsers } = useQuery<UserRow[]>({
    queryKey: ['users-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('*, role:roles(name_ar), branch:branches(name_ar)').order('created_at')
      return (data || []) as UserRow[]
    },
  })

  // Filter users based on showInactive toggle
  const users = showInactive ? allUsers : allUsers?.filter(u => u.status === 'active')

  // Fetch roles
  const { data: roles } = useQuery<RoleRow[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await supabase.from('roles').select('*').order('name_ar')
      return (data || []) as RoleRow[]
    },
  })

  // Fetch branches
  const { data: branches } = useQuery<BranchRow[]>({
    queryKey: ['branches-for-users'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('*').eq('status', 'active').order('name_ar')
      return (data || []) as BranchRow[]
    },
  })

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      // Generate employee code if not provided
      const employeeCode = formData.employee_code || `EMP-${Date.now()}`

      if (editingId) {
        // Update existing user
        const updateData: any = {
          employee_code: employeeCode,
          full_name: formData.full_name,
          full_name_ar: formData.full_name_ar,
          username: formData.username,
          role_id: formData.role_id,
          branch_id: formData.branch_id || null,
          phone: formData.phone || null,
          email: formData.email || null,
        }
        
        // Only update password if provided
        if (formData.password) {
          updateData.password_hash = formData.password
        }

        const { error } = await supabase
          .from('users')
          .update(updateData as never)
          .eq('id', editingId)

        if (error) throw error
      } else {
        // Create new user
        const { error } = await supabase.from('users').insert({
          employee_code: employeeCode,
          full_name: formData.full_name,
          full_name_ar: formData.full_name_ar,
          username: formData.username,
          password_hash: formData.password,
          role_id: formData.role_id,
          branch_id: formData.branch_id || null,
          phone: formData.phone || null,
          email: formData.email || null,
          status: 'active',
        } as never)

        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-settings'] })
      setShowDialog(false)
      setEditingId(null)
      setFormData({
        employee_code: '',
        full_name: '',
        full_name_ar: '',
        username: '',
        password: '',
        role_id: '',
        branch_id: '',
        phone: '',
        email: '',
      })
      alert(editingId ? 'تم تحديث المستخدم بنجاح!' : 'تم إضافة المستخدم بنجاح!')
    },
    onError: (err) => alert('خطأ: ' + err.message),
  })

  // Delete user mutation (soft delete - set status to inactive)
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('users')
        .update({ status: 'inactive' } as never)
        .eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-settings'] })
      alert('تم تعطيل المستخدم بنجاح!')
    },
    onError: (err) => alert('خطأ: ' + err.message),
  })

  const handleDeleteUser = (userId: string, userName: string) => {
    if (window.confirm(`هل أنت متأكد من تعطيل المستخدم "${userName}"؟\n\nملاحظة: سيتم تعطيل المستخدم وليس حذفه نهائياً من النظام.`)) {
      deleteMutation.mutate(userId)
    }
  }

  const handleEditUser = (user: UserRow) => {
    setEditingId(user.id)
    setFormData({
      employee_code: user.employee_code,
      full_name: user.full_name,
      full_name_ar: user.full_name_ar || '',
      username: user.username,
      password: '', // Don't show password
      role_id: user.role_id || '',
      branch_id: user.branch_id || '',
      phone: user.phone || '',
      email: user.email || '',
    })
    setShowDialog(true)
  }

  const handleNewUser = () => {
    setEditingId(null)
    setFormData({
      employee_code: '',
      full_name: '',
      full_name_ar: '',
      username: '',
      password: '',
      role_id: '',
      branch_id: '',
      phone: '',
      email: '',
    })
    setShowDialog(true)
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <CardTitle className="text-base sm:text-lg">المستخدمين</CardTitle>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {isSystemAdmin && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded"
              />
              <span>عرض المعطلين</span>
            </label>
          )}
          <Button size="sm" onClick={handleNewUser} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 ml-2" />
            إضافة مستخدم
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Add User Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent onClose={() => setShowDialog(false)} className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">{editingId ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">كود الموظف</label>
                <Input
                  value={formData.employee_code}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, employee_code: e.target.value})}
                  placeholder="سيتم إنشاؤه تلقائياً"
                />
              </div>
              <div>
                <label className="text-sm font-medium">الاسم بالعربي *</label>
                <Input
                  value={formData.full_name_ar}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, full_name_ar: e.target.value})}
                  placeholder="الاسم الكامل بالعربي"
                />
              </div>
              <div>
                <label className="text-sm font-medium">الاسم بالإنجليزي *</label>
                <Input
                  value={formData.full_name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, full_name: e.target.value})}
                  placeholder="Full Name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">اسم المستخدم *</label>
                <Input
                  value={formData.username}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, username: e.target.value})}
                  placeholder="username"
                />
              </div>
              <div>
                <label className="text-sm font-medium">كلمة المرور {!editingId && '*'}</label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, password: e.target.value})}
                  placeholder={editingId ? "اتركه فارغاً إذا لم ترد التغيير" : "********"}
                />
              </div>
              <div>
                <label className="text-sm font-medium">الدور *</label>
                <select
                  value={formData.role_id}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({...formData, role_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                >
                  <option value="">اختر الدور</option>
                  {roles?.map((role) => (
                    <option key={role.id} value={role.id}>{role.name_ar}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">الفرع</label>
                <select
                  value={formData.branch_id}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({...formData, branch_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                >
                  <option value="">الكل</option>
                  {branches?.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name_ar}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">رقم الهاتف</label>
                <Input
                  value={formData.phone}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, phone: e.target.value})}
                  placeholder="01xxxxxxxxx"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">البريد الإلكتروني</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@example.com"
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="w-full sm:w-auto">إلغاء</Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!formData.full_name || !formData.full_name_ar || !formData.username || (!editingId && !formData.password) || !formData.role_id || createMutation.isPending}
                className="w-full sm:w-auto"
              >
                {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                {isSystemAdmin && <th className="text-right py-2 px-1 sm:px-2">إجراءات</th>}
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
                  {isSystemAdmin && (
                    <td className="py-2 px-1 sm:px-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditUser(user)}
                          title="تعديل"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteUser(user.id, user.full_name)}
                          disabled={deleteMutation.isPending || user.status === 'inactive'}
                          title={user.status === 'inactive' ? 'معطل' : 'تعطيل'}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  )}
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
                {isSystemAdmin && (
                  <div className="pt-2 border-t flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditUser(user)}
                    >
                      <Edit className="h-4 w-4 ml-2" />
                      تعديل
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDeleteUser(user.id, user.full_name)}
                      disabled={deleteMutation.isPending || user.status === 'inactive'}
                    >
                      <Trash2 className="h-4 w-4 ml-2 text-destructive" />
                      {user.status === 'inactive' ? 'معطل' : 'تعطيل'}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function CategoriesSettings() {
  const [showDialog, setShowDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null)
  const [formData, setFormData] = useState({ code: '', name: '' })
  const queryClient = useQueryClient()

  const { data: categories } = useQuery<CategoryRow[]>({
    queryKey: ['categories-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').order('sort_order')
      return (data || []) as CategoryRow[]
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingCategory) {
        // Update - allow code update
        const { error } = await supabase
          .from('categories')
          .update({ 
            code: formData.code,
            name: formData.name,
            name_ar: formData.name
          } as never)
          .eq('id', editingCategory.id)
        if (error) throw error
      } else {
        // Insert
        const { error } = await supabase
          .from('categories')
          .insert({
            code: formData.code,
            name: formData.name,
            name_ar: formData.name,
            is_active: true,
            sort_order: (categories?.length || 0) + 1
          } as never)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories-settings'] })
      setShowDialog(false)
      setEditingCategory(null)
      setFormData({ code: '', name: '' })
      alert(editingCategory ? 'تم تحديث التصنيف بنجاح!' : 'تم إضافة التصنيف بنجاح!')
    },
    onError: (error) => {
      alert('حدث خطأ: ' + error.message)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Try to delete
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
      
      if (error) {
        // Check if it's a foreign key constraint error
        if (error.message.includes('foreign key') || error.message.includes('violates')) {
          throw new Error('لا يمكن حذف هذا التصنيف لأنه مستخدم في منتجات موجودة. يمكنك تعطيله بدلاً من حذفه.')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories-settings'] })
      alert('تم حذف التصنيف بنجاح!')
    },
    onError: (error: Error) => {
      alert('حدث خطأ: ' + error.message)
    }
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('categories')
        .update({ is_active: !isActive } as never)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories-settings'] })
    },
    onError: (error) => {
      alert('حدث خطأ: ' + error.message)
    }
  })

  const handleAdd = () => {
    setEditingCategory(null)
    // Suggest next code
    const nextNum = (categories?.length || 0) + 1
    const suggestedCode = `CAT${String(nextNum).padStart(3, '0')}`
    setFormData({ code: suggestedCode, name: '' })
    setShowDialog(true)
  }

  const handleEdit = (cat: CategoryRow) => {
    setEditingCategory(cat)
    setFormData({ code: cat.code, name: cat.name_ar || (cat as any).name })
    setShowDialog(true)
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف التصنيف "${name}"؟`)) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="text-base sm:text-lg">التصنيفات</CardTitle>
          <Button size="sm" className="w-full sm:w-auto" onClick={handleAdd}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة تصنيف
          </Button>
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
                  <th className="text-right py-2 px-1 sm:px-2">الإجراءات</th>
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
                    <td className="py-2 px-1 sm:px-2">
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => toggleActiveMutation.mutate({ id: cat.id, isActive: cat.is_active || false })}
                          title={cat.is_active ? 'تعطيل' : 'تفعيل'}
                        >
                          {cat.is_active ? '🔴' : '🟢'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(cat)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(cat.id, cat.name_ar)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
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
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{cat.name_ar}</p>
                    <p className="text-xs text-muted-foreground font-mono">{cat.code}</p>
                    <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {cat.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleActiveMutation.mutate({ id: cat.id, isActive: cat.is_active || false })}
                      title={cat.is_active ? 'تعطيل' : 'تفعيل'}
                    >
                      {cat.is_active ? '🔴' : '🟢'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(cat)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(cat.id, cat.name_ar)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">الكود</label>
              <select
                value={formData.code}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, code: e.target.value })}
                className="w-full h-10 border rounded-md px-3 text-sm"
              >
                <option value="">اختر الكود</option>
                {categories?.map((cat) => (
                  <option key={cat.code} value={cat.code}>
                    {cat.code}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">الاسم</label>
              <Input
                value={formData.name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: أحبار الطابعات أو Printer Ink"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!formData.code || !formData.name || saveMutation.isPending}>
              {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function BrandsSettings() {
  const [showDialog, setShowDialog] = useState(false)
  const [editingBrand, setEditingBrand] = useState<BrandRow | null>(null)
  const [formData, setFormData] = useState({ name: '' })
  const queryClient = useQueryClient()

  const { data: brands } = useQuery<BrandRow[]>({
    queryKey: ['brands-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('brands').select('*').order('name')
      return (data || []) as BrandRow[]
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingBrand) {
        // Update
        const { error } = await supabase
          .from('brands')
          .update({ name: formData.name } as never)
          .eq('id', editingBrand.id)
        if (error) throw error
      } else {
        // Insert
        const code = `BRD${String(((brands?.length || 0) + 1)).padStart(3, '0')}`
        const { error } = await supabase
          .from('brands')
          .insert({
            code,
            name: formData.name,
            is_active: true
          } as never)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands-settings'] })
      setShowDialog(false)
      setEditingBrand(null)
      setFormData({ name: '' })
      alert(editingBrand ? 'تم تحديث الماركة بنجاح!' : 'تم إضافة الماركة بنجاح!')
    },
    onError: (error) => {
      alert('حدث خطأ: ' + error.message)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands-settings'] })
      alert('تم حذف الماركة بنجاح!')
    },
    onError: (error) => {
      alert('حدث خطأ: ' + error.message)
    }
  })

  const handleAdd = () => {
    setEditingBrand(null)
    setFormData({ name: '' })
    setShowDialog(true)
  }

  const handleEdit = (brand: BrandRow) => {
    setEditingBrand(brand)
    setFormData({ name: brand.name })
    setShowDialog(true)
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف الماركة "${name}"؟`)) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="text-base sm:text-lg">الماركات</CardTitle>
          <Button size="sm" className="w-full sm:w-auto" onClick={handleAdd}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة ماركة
          </Button>
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
                  <th className="text-right py-2 px-1 sm:px-2">الإجراءات</th>
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
                    <td className="py-2 px-1 sm:px-2">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(brand)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(brand.id, brand.name)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
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
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{brand.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{brand.code}</p>
                    <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs ${brand.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {brand.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(brand)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(brand.id, brand.name)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBrand ? 'تعديل الماركة' : 'إضافة ماركة جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">الاسم</label>
              <Input
                value={formData.name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: HP"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!formData.name || saveMutation.isPending}>
              {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function UnitsSettings() {
  const [showDialog, setShowDialog] = useState(false)
  const [editingUnit, setEditingUnit] = useState<UnitRow | null>(null)
  const [formData, setFormData] = useState({ name_ar: '' })
  const queryClient = useQueryClient()

  const { data: units } = useQuery<UnitRow[]>({
    queryKey: ['units-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('units').select('*').order('name')
      return (data || []) as UnitRow[]
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingUnit) {
        // Update
        const { error } = await supabase
          .from('units')
          .update({ name_ar: formData.name_ar } as never)
          .eq('id', editingUnit.id)
        if (error) throw error
      } else {
        // Insert
        const code = `UNIT${String(((units?.length || 0) + 1)).padStart(3, '0')}`
        const { error } = await supabase
          .from('units')
          .insert({
            code,
            name_ar: formData.name_ar,
            is_active: true
          } as never)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units-settings'] })
      setShowDialog(false)
      setEditingUnit(null)
      setFormData({ name_ar: '' })
      alert(editingUnit ? 'تم تحديث الوحدة بنجاح!' : 'تم إضافة الوحدة بنجاح!')
    },
    onError: (error) => {
      alert('حدث خطأ: ' + error.message)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units-settings'] })
      alert('تم حذف الوحدة بنجاح!')
    },
    onError: (error) => {
      alert('حدث خطأ: ' + error.message)
    }
  })

  const handleAdd = () => {
    setEditingUnit(null)
    setFormData({ name_ar: '' })
    setShowDialog(true)
  }

  const handleEdit = (unit: UnitRow) => {
    setEditingUnit(unit)
    setFormData({ name_ar: unit.name_ar })
    setShowDialog(true)
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف الوحدة "${name}"؟`)) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="text-base sm:text-lg">الوحدات</CardTitle>
          <Button size="sm" className="w-full sm:w-auto" onClick={handleAdd}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة وحدة
          </Button>
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
                  <th className="text-right py-2 px-1 sm:px-2">الإجراءات</th>
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
                    <td className="py-2 px-1 sm:px-2">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(unit)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(unit.id, unit.name_ar)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
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
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{unit.name_ar}</p>
                    <p className="text-xs text-muted-foreground font-mono">{unit.code}</p>
                    <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs ${unit.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {unit.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(unit)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(unit.id, unit.name_ar)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUnit ? 'تعديل الوحدة' : 'إضافة وحدة جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">الاسم بالعربي</label>
              <Input
                value={formData.name_ar}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name_ar: e.target.value })}
                placeholder="مثال: قطعة"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!formData.name_ar || saveMutation.isPending}>
              {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
