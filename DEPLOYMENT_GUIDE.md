# 🚀 دليل النشر على GitHub Pages

## ✅ تم بنجاح!

تم رفع المشروع على GitHub: https://github.com/Mahmoud-shehab/el-fagr

## 📋 خطوات تفعيل GitHub Pages

### 1️⃣ تفعيل GitHub Pages

1. اذهب إلى: https://github.com/Mahmoud-shehab/el-fagr/settings/pages
2. في قسم **"Build and deployment"**:
   - **Source**: اختر `GitHub Actions`
3. احفظ التغييرات

### 2️⃣ تشغيل الـ Workflow

الـ workflow سيعمل تلقائياً عند أي push على branch main، أو يمكنك تشغيله يدوياً:

1. اذهب إلى: https://github.com/Mahmoud-shehab/el-fagr/actions
2. اختر workflow "Deploy to GitHub Pages"
3. اضغط "Run workflow"
4. اختر branch "main"
5. اضغط "Run workflow"

### 3️⃣ انتظر اكتمال البناء

- سيستغرق حوالي 2-3 دقائق
- يمكنك متابعة التقدم في صفحة Actions
- عند النجاح، سترى علامة ✅ خضراء

### 4️⃣ الوصول للموقع

بعد اكتمال النشر، سيكون الموقع متاح على:

**🌐 https://mahmoud-shehab.github.io/el-fagr/**

---

## 🔧 ملاحظات مهمة

### ⚠️ Supabase Configuration

تأكد من أن Supabase URL و API Key موجودين في الكود (حالياً موجودين في `pos-system/src/lib/supabase.ts`)

### 🔐 الأمان

**مهم جداً:** 
- الـ Supabase Anon Key الموجود في الكود هو public key وآمن للاستخدام
- لكن تأكد من إعداد Row Level Security (RLS) في Supabase لحماية البيانات
- لا تضع أبداً الـ Service Role Key في الكود

### 📱 CORS Settings في Supabase

تأكد من إضافة domain الـ GitHub Pages في Supabase:

1. اذهب إلى Supabase Dashboard
2. Settings → API
3. في "Site URL" أضف: `https://mahmoud-shehab.github.io`
4. في "Additional Redirect URLs" أضف: `https://mahmoud-shehab.github.io/el-fagr/*`

---

## 🔄 التحديثات المستقبلية

عند أي تعديل على الكود:

```bash
git add .
git commit -m "وصف التعديل"
git push origin main
```

سيتم النشر تلقائياً! ✨

---

## 🐛 حل المشاكل

### المشكلة: الموقع لا يعمل (404)

**الحل:**
- تأكد من أن GitHub Pages مفعل
- تأكد من أن الـ workflow اكتمل بنجاح
- انتظر 5-10 دقائق بعد أول نشر

### المشكلة: الصفحات الفرعية تعطي 404

**الحل:**
- هذا طبيعي مع React Router
- تم إضافة حل في الكود (base path في vite.config)

### المشكلة: Supabase لا يعمل

**الحل:**
- تحقق من CORS settings في Supabase
- تحقق من RLS policies
- افتح Console في المتصفح وشوف الأخطاء

---

## 📞 الدعم

إذا واجهت أي مشكلة، تحقق من:
- GitHub Actions logs: https://github.com/Mahmoud-shehab/el-fagr/actions
- Browser Console (F12)
- Supabase logs

---

## ✨ ميزات إضافية

### Custom Domain (اختياري)

إذا أردت استخدام domain خاص:

1. اشتري domain
2. في GitHub Settings → Pages → Custom domain
3. أضف CNAME record في DNS provider
4. انتظر التفعيل

### SSL Certificate

GitHub Pages يوفر SSL مجاناً تلقائياً! 🔒

---

**تم بواسطة:** Kiro AI Assistant 🤖
**التاريخ:** 2026-01-25
