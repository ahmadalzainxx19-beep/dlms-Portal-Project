# دليل استخدام Supabase في المشروع

## 📌 معلومات الاتصال

- **Project URL:** `https://mwyjxknjdkqxsuxjvyaa.supabase.co`
- **API Key:** يرجى التحقق من أنك تستخدم الـ **anon key** الصحيح وليس publishable key

---

## ⚠️ ملاحظة هامة

المفتاح الحالي (`sb_publishable_...`) يبدو أنه **Publishable Key**. للحصول على المفتاح الصحيح:

1. اذهب إلى [لوحة تحكم Supabase](https://app.supabase.com/)
2. اختر مشروعك
3. اذهب إلى **Settings** → **API**
4. انسخ الـ **`anon` public key**
5. استبدله في ملف `assets/supabase-config.js` السطر رقم 11

---

## 🚀 كيفية الاستخدام

تم إنشاء ملف `assets/supabase-config.js` الذي يحتوي على جميع الوظائف الأساسية.

### 1️⃣ المصادقة (Authentication)

#### تسجيل الدخول
```javascript
// مثال: تسجيل دخول مستخدم
const result = await supabase.auth.signIn('user@example.com', 'password123');

if (result.success) {
    console.log('تم تسجيل الدخول بنجاح!', result.data);
} else {
    console.error('خطأ:', result.error);
}
```

#### تسجيل مستخدم جديد
```javascript
const metadata = {
    name: 'أحمد محمد',
    role: 'student',
    department: 'علوم الحاسب'
};

const result = await supabase.auth.signUp(
    'ahmed@example.com',
    'password123',
    metadata
);
```

#### تسجيل الخروج
```javascript
// سيتم إعادة التوجيه تلقائياً إلى Login.html
await supabase.auth.signOut();
```

#### الحصول على المستخدم الحالي
```javascript
const user = await supabase.auth.getCurrentUser();
console.log('المستخدم الحالي:', user);
```

#### التحقق من تسجيل الدخول (Require Auth)
```javascript
// في بداية أي صفحة تحتاج مصادقة
// إلغاء التعليق على هذا السطر في index.html أو أي صفحة أخرى:
// supabase.auth.requireAuth();
```

---

### 2️⃣ قاعدة البيانات (Database)

#### قراءة البيانات
```javascript
// قراءة جميع المباني
const result = await supabase.db.fetch('buildings');

if (result.success) {
    console.log('المباني:', result.data);
}

// قراءة مع فلاتر
const result2 = await supabase.db.fetch('buildings', {
    filters: { status: 'active' },
    orderBy: { column: 'name', ascending: true },
    limit: 10
});

// قراءة حقول محددة
const result3 = await supabase.db.fetch('buildings', {
    select: 'id, name, location'
});
```

#### إضافة بيانات
```javascript
// إضافة مبنى جديد
const newBuilding = {
    name: 'مبنى الهندسة',
    location: 'Campus A',
    floors: 5,
    status: 'active'
};

const result = await supabase.db.insert('buildings', newBuilding);

if (result.success) {
    console.log('تم الإضافة بنجاح:', result.data);
}

// إضافة عدة صفوف مرة واحدة
const buildings = [
    { name: 'مبنى 1', location: 'A1' },
    { name: 'مبنى 2', location: 'A2' }
];

await supabase.db.insert('buildings', buildings);
```

#### تحديث بيانات
```javascript
// تحديث مبنى معين
const updates = {
    status: 'maintenance',
    updated_at: new Date().toISOString()
};

const filters = { id: 1 };

const result = await supabase.db.update('buildings', updates, filters);
```

#### حذف بيانات
```javascript
// حذف مبنى
const result = await supabase.db.delete('buildings', { id: 1 });

if (result.success) {
    console.log('تم الحذف بنجاح');
}
```

---

### 3️⃣ الاشتراكات الفورية (Real-time)

```javascript
// الاشتراك في تغييرات جدول المباني
const subscription = supabase.db.subscribe('buildings', (payload) => {
    console.log('تغيير حدث!', payload);
    
    if (payload.eventType === 'INSERT') {
        console.log('مبنى جديد:', payload.new);
    }
    
    if (payload.eventType === 'UPDATE') {
        console.log('تم التحديث:', payload.new);
    }
    
    if (payload.eventType === 'DELETE') {
        console.log('تم الحذف:', payload.old);
    }
    
    // تحديث الواجهة تلقائياً
    refreshBuildingsList();
});

// لإلغاء الاشتراك لاحقاً:
// subscription.unsubscribe();
```

---

### 4️⃣ التخزين (Storage)

#### رفع ملف
```javascript
// رفع صورة مبنى
const fileInput = document.getElementById('buildingImage');
const file = fileInput.files[0];

const result = await supabase.storage.upload(
    'buildings',  // اسم الـ bucket
    `images/${Date.now()}_${file.name}`,  // مسار الملف
    file
);

if (result.success) {
    console.log('تم الرفع بنجاح:', result.data);
}
```

#### الحصول على رابط الملف
```javascript
const publicUrl = supabase.storage.getPublicUrl(
    'buildings',
    'images/1234567890_building.jpg'
);

console.log('رابط الصورة:', publicUrl);

// استخدامه في صورة
document.getElementById('buildingImg').src = publicUrl;
```

---

## 📝 أمثلة عملية

### مثال: نموذج تسجيل الدخول

```javascript
// في صفحة Login.html
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const result = await supabase.auth.signIn(email, password);
    
    if (result.success) {
        // إعادة التوجيه إلى الصفحة الرئيسية
        window.location.href = 'index.html';
    } else {
        // عرض رسالة خطأ
        Swal.fire({
            icon: 'error',
            title: 'خطأ في تسجيل الدخول',
            text: result.error
        });
    }
});
```

### مثال: قائمة المباني مع التحديث الفوري

```javascript
// في صفحة buildings.html
async function loadBuildings() {
    const result = await supabase.db.fetch('buildings', {
        orderBy: { column: 'name', ascending: true }
    });
    
    if (result.success) {
        displayBuildings(result.data);
    }
}

function displayBuildings(buildings) {
    const container = document.getElementById('buildingsContainer');
    container.innerHTML = buildings.map(building => `
        <div class="building-card">
            <h3>${building.name}</h3>
            <p>${building.location}</p>
        </div>
    `).join('');
}

// تحميل المباني عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', loadBuildings);

// الاشتراك في التحديثات الفورية
supabase.db.subscribe('buildings', (payload) => {
    console.log('تحديث في المباني:', payload);
    loadBuildings(); // إعادة تحميل القائمة
});
```

### مثال: إضافة مبنى جديد

```javascript
// في صفحة create-building.html
document.getElementById('createBuildingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const buildingData = {
        name: document.getElementById('buildingName').value,
        location: document.getElementById('location').value,
        floors: parseInt(document.getElementById('floors').value),
        status: 'active',
        created_at: new Date().toISOString()
    };
    
    const result = await supabase.db.insert('buildings', buildingData);
    
    if (result.success) {
        Swal.fire({
            icon: 'success',
            title: 'نجح!',
            text: 'تم إضافة المبنى بنجاح'
        }).then(() => {
            window.location.href = 'buildings.html';
        });
    } else {
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: result.error
        });
    }
});
```

---

## 🔐 إعداد قاعدة البيانات في Supabase

1. اذهب إلى [لوحة تحكم Supabase](https://app.supabase.com/)
2. اختر مشروعك
3. اذهب إلى **Table Editor**
4. أنشئ الجداول المطلوبة (مثال: buildings, labs, users, etc.)
5. اضبط الـ **Row Level Security (RLS)** حسب احتياجاتك

### مثال: جدول المباني

```sql
create table buildings (
  id bigint primary key generated always as identity,
  name text not null,
  location text,
  floors int,
  status text default 'active',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- تفعيل RLS
alter table buildings enable row level security;

-- سماح للجميع بالقراءة
create policy "Allow public read access"
  on buildings for select
  using (true);

-- السماح فقط للمصادقين بالإضافة/التعديل
create policy "Allow authenticated users to insert"
  on buildings for insert
  with check (auth.role() = 'authenticated');
```

---

## 📚 موارد إضافية

- [توثيق Supabase الرسمي](https://supabase.com/docs)
- [أمثلة Supabase](https://github.com/supabase/supabase/tree/master/examples)
- [مرجع JavaScript Client](https://supabase.com/docs/reference/javascript)
