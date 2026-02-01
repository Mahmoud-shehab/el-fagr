# دليل التصميم المتجاوب للموبايل

## التحسينات المطبقة

### 1. Sidebar (القائمة الجانبية)
- ✅ تحويل Sidebar لقائمة منبثقة على الموبايل
- ✅ زر Menu يظهر على الشاشات الصغيرة
- ✅ Overlay للخلفية عند فتح القائمة
- ✅ إغلاق تلقائي عند اختيار صفحة

### 2. Layout (التخطيط العام)
- ✅ تقليل padding على الشاشات الصغيرة (p-3 على mobile، p-6 على desktop)
- ✅ تعديل margin للـ main content

### 3. الصفحات (Pages)
- ✅ Headers تتحول من row إلى column على الموبايل
- ✅ الأزرار تأخذ full width على الموبايل
- ✅ تقليل المسافات (space-y-4 بدل space-y-6)
- ✅ تصغير حجم النصوص (text-xl بدل text-2xl)

### 4. الجداول (Tables)
- ✅ Horizontal scroll للجداول العريضة
- ✅ إخفاء أعمدة غير ضرورية على الشاشات الصغيرة باستخدام hidden md:table-cell
- ✅ تصغير حجم الخط (text-xs على mobile، text-sm على desktop)
- ✅ تصغير الأيقونات والأزرار

### 5. النماذج (Forms/Dialogs)
- ✅ max-h-[90vh] مع overflow-y-auto
- ✅ تحويل grid من cols-2 إلى cols-1 على الموبايل
- ✅ DialogFooter يتحول من row إلى column
- ✅ الأزرار تأخذ full width على الموبايل
- ✅ تقليل padding (p-4 على mobile، p-6 على desktop)

### 6. البحث والفلاتر
- ✅ تحويل من flex-row إلى flex-col على الموبايل
- ✅ max-w-full على الموبايل بدل max-w-sm
- ✅ الـ select boxes تأخذ full width

### 7. Pagination
- ✅ تحويل من row إلى column على الموبايل
- ✅ الأزرار تأخذ full width
- ✅ تصغير أزرار الأرقام

### 8. CSS Utilities
- ✅ إضافة touch-manipulation
- ✅ تحسين الـ scrolling على الموبايل
- ✅ min-height و min-width للـ tap targets (44px)

## Breakpoints المستخدمة

```css
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large devices */
```

## أمثلة على الاستخدام

### Header Pattern
```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
  <div>
    <h1 className="text-xl sm:text-2xl font-bold">العنوان</h1>
    <p className="text-sm text-muted-foreground">الوصف</p>
  </div>
  <Button className="w-full sm:w-auto">زر</Button>
</div>
```

### Table Pattern
```tsx
<div className="overflow-x-auto -mx-4 sm:mx-0">
  <div className="inline-block min-w-full align-middle">
    <table className="w-full min-w-[700px]">
      <thead>
        <tr>
          <th className="text-xs sm:text-sm">عمود</th>
          <th className="text-xs sm:text-sm hidden md:table-cell">عمود اختياري</th>
        </tr>
      </thead>
    </table>
  </div>
</div>
```

### Dialog Pattern
```tsx
<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {/* Form fields */}
  </div>
  <DialogFooter className="flex-col sm:flex-row gap-2">
    <Button className="w-full sm:w-auto">زر</Button>
  </DialogFooter>
</DialogContent>
```

## الصفحات المحدثة
- ✅ Sidebar.tsx
- ✅ Layout.tsx
- ✅ Customers.tsx
- ✅ Products.tsx
- ✅ Dashboard.tsx
- ✅ Dialog.tsx
- ✅ index.css

## الصفحات المتبقية (نفس الـ Pattern)
- Sales.tsx
- Purchases.tsx
- Suppliers.tsx
- Returns.tsx
- Damaged.tsx
- Expenses.tsx
- Reports.tsx
- POS.tsx
- وباقي الصفحات...

## ملاحظات مهمة
1. استخدم دائماً `className="w-full sm:w-auto"` للأزرار
2. استخدم `hidden md:table-cell` للأعمدة الاختيارية
3. استخدم `text-xs sm:text-sm` للنصوص في الجداول
4. استخدم `gap-3` بدل `gap-4` على الموبايل
5. استخدم `-mx-4 sm:mx-0` للجداول لتوسيع العرض على الموبايل
