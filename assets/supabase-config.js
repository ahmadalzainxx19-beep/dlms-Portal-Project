/**
 * ملف تكوين Supabase
 * يحتوي على إعدادات الاتصال بـ Supabase والوظائف الأساسية
 */

// معلومات الاتصال بـ Supabase
const SUPABASE_URL = 'https://mwyjxknjdkqxsuxjvyaa.supabase.co';

// ⚠️ تحذير: هذا المفتاح يبدو أنه Publishable Key وليس anon key
// يجب الحصول على anon key من لوحة تحكم Supabase:
// 1. اذهب إلى لوحة تحكم مشروعك في Supabase
// 2. Settings > API
// 3. انسخ "anon" public key (وليس publishable key)
const SUPABASE_ANON_KEY = 'sb_publishable_Bjk7BEIJZvv2fdtxWnqkJA_26aj1VJI';

// إنشاء عميل Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================================
// وظائف المصادقة (Authentication)
// =====================================

/**
 * التحقق من وجود جلسة نشطة
 * @returns {Promise<Session|null>} الجلسة الحالية أو null
 */
async function getCurrentSession() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            console.error('خطأ في الحصول على الجلسة:', error);
            return null;
        }
        
        return session;
    } catch (err) {
        console.error('خطأ غير متوقع:', err);
        return null;
    }
}

/**
 * التحقق من تسجيل الدخول وإعادة التوجيه إلى صفحة تسجيل الدخول إذا لم يكن مسجل
 */
async function requireAuth() {
    const session = await getCurrentSession();
    
    if (!session) {
        // حفظ الصفحة الحالية للعودة إليها بعد تسجيل الدخول
        localStorage.setItem('redirectAfterLogin', window.location.pathname);
        window.location.href = 'Login.html';
        return false;
    }
    
    return true;
}

/**
 * تسجيل دخول مستخدم
 * @param {string} email البريد الإلكتروني
 * @param {string} password كلمة المرور
 * @returns {Promise<Object>} نتيجة تسجيل الدخول
 */
async function signIn(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            return { success: false, error: error.message };
        }
        
        return { success: true, data: data };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * تسجيل مستخدم جديد
 * @param {string} email البريد الإلكتروني
 * @param {string} password كلمة المرور
 * @param {Object} metadata بيانات إضافية مثل الاسم والدور
 * @returns {Promise<Object>} نتيجة التسجيل
 */
async function signUp(email, password, metadata = {}) {
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: metadata
            }
        });
        
        if (error) {
            return { success: false, error: error.message };
        }
        
        return { success: true, data: data };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * تسجيل خروج المستخدم
 * @returns {Promise<boolean>} true إذا نجح تسجيل الخروج
 */
async function signOut() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        
        if (!error) {
            window.location.href = 'Login.html';
            return true;
        }
        
        console.error('خطأ في تسجيل الخروج:', error);
        return false;
    } catch (err) {
        console.error('خطأ غير متوقع:', err);
        return false;
    }
}

/**
 * الحصول على المستخدم الحالي
 * @returns {Promise<User|null>} معلومات المستخدم الحالي
 */
async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        
        if (error) {
            console.error('خطأ في الحصول على بيانات المستخدم:', error);
            return null;
        }
        
        return user;
    } catch (err) {
        console.error('خطأ غير متوقع:', err);
        return null;
    }
}

// =====================================
// وظائف قاعدة البيانات
// =====================================

/**
 * قراءة بيانات من جدول
 * @param {string} tableName اسم الجدول
 * @param {Object} options خيارات الاستعلام
 * @returns {Promise<Object>} البيانات المقروءة
 */
async function fetchData(tableName, options = {}) {
    try {
        let query = supabaseClient.from(tableName).select(options.select || '*');
        
        // إضافة الفلاتر
        if (options.filters) {
            Object.keys(options.filters).forEach(key => {
                query = query.eq(key, options.filters[key]);
            });
        }
        
        // الترتيب
        if (options.orderBy) {
            query = query.order(options.orderBy.column, { 
                ascending: options.orderBy.ascending !== false 
            });
        }
        
        // التحديد
        if (options.limit) {
            query = query.limit(options.limit);
        }
        
        const { data, error } = await query;
        
        if (error) {
            return { success: false, error: error.message };
        }
        
        return { success: true, data: data };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * إضافة بيانات إلى جدول
 * @param {string} tableName اسم الجدول
 * @param {Object|Array} data البيانات المراد إضافتها
 * @returns {Promise<Object>} نتيجة الإضافة
 */
async function insertData(tableName, data) {
    try {
        const { data: result, error } = await supabaseClient
            .from(tableName)
            .insert(data)
            .select();
        
        if (error) {
            return { success: false, error: error.message };
        }
        
        return { success: true, data: result };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * تحديث بيانات في جدول
 * @param {string} tableName اسم الجدول
 * @param {Object} updates البيانات المحدثة
 * @param {Object} filters الفلاتر لتحديد الصفوف المراد تحديثها
 * @returns {Promise<Object>} نتيجة التحديث
 */
async function updateData(tableName, updates, filters) {
    try {
        let query = supabaseClient.from(tableName).update(updates);
        
        // إضافة الفلاتر
        if (filters) {
            Object.keys(filters).forEach(key => {
                query = query.eq(key, filters[key]);
            });
        }
        
        const { data, error } = await query.select();
        
        if (error) {
            return { success: false, error: error.message };
        }
        
        return { success: true, data: data };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * حذف بيانات من جدول
 * @param {string} tableName اسم الجدول
 * @param {Object} filters الفلاتر لتحديد الصفوف المراد حذفها
 * @returns {Promise<Object>} نتيجة الحذف
 */
async function deleteData(tableName, filters) {
    try {
        let query = supabaseClient.from(tableName).delete();
        
        // إضافة الفلاتر
        if (filters) {
            Object.keys(filters).forEach(key => {
                query = query.eq(key, filters[key]);
            });
        }
        
        const { error } = await query;
        
        if (error) {
            return { success: false, error: error.message };
        }
        
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// =====================================
// Real-time Subscriptions (الاشتراكات الفورية)
// =====================================

/**
 * الاشتراك في تغييرات جدول
 * @param {string} tableName اسم الجدول
 * @param {Function} callback الدالة التي ستُستدعى عند حدوث تغيير
 * @returns {Object} الاشتراك (للإلغاء لاحقاً)
 */
function subscribeToTable(tableName, callback) {
    return supabaseClient
        .channel(`public:${tableName}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: tableName },
            (payload) => {
                callback(payload);
            }
        )
        .subscribe();
}

// =====================================
// Storage (التخزين)
// =====================================

/**
 * رفع ملف إلى التخزين
 * @param {string} bucket اسم الـ bucket
 * @param {string} path مسار الملف
 * @param {File} file الملف المراد رفعه
 * @returns {Promise<Object>} نتيجة الرفع
 */
async function uploadFile(bucket, path, file) {
    try {
        const { data, error } = await supabaseClient.storage
            .from(bucket)
            .upload(path, file);
        
        if (error) {
            return { success: false, error: error.message };
        }
        
        return { success: true, data: data };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * الحصول على رابط عام لملف
 * @param {string} bucket اسم الـ bucket
 * @param {string} path مسار الملف
 * @returns {string} الرابط العام للملف
 */
function getPublicUrl(bucket, path) {
    const { data } = supabaseClient.storage
        .from(bucket)
        .getPublicUrl(path);
    
    return data.publicUrl;
}

// تصدير الوظائف والعميل للاستخدام في الصفحات الأخرى
window.supabase = {
    client: supabaseClient,
    auth: {
        getCurrentSession,
        requireAuth,
        signIn,
        signUp,
        signOut,
        getCurrentUser
    },
    db: {
        fetch: fetchData,
        insert: insertData,
        update: updateData,
        delete: deleteData,
        subscribe: subscribeToTable
    },
    storage: {
        upload: uploadFile,
        getPublicUrl: getPublicUrl
    }
};
