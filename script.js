// التهيئة وجلب البيانات من LocalStorage أو إنشاء مصفوفة فارغة
let subscribers = JSON.parse(localStorage.getItem('debt_app_data')) || [];
let currentClientId = null;

// دالة لتنسيق الأرقام (العملة العراقية)
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US').format(amount) + ' د.ع';
};

// دالة للحصول على تاريخ اليوم بشكل منسق
const getTodayDate = () => {
    const today = new Date();
    return `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;
};

// حفظ البيانات في LocalStorage
const saveData = () => {
    localStorage.setItem('debt_app_data', JSON.stringify(subscribers));
};

// إدارة النوافذ المنبثقة
const openModal = (modalId) => {
    document.getElementById(modalId).classList.add('active');
    // تعيين التاريخ تلقائياً عند فتح النافذة
    if (modalId === 'add-sub-modal') document.getElementById('sub-date').value = getTodayDate();
    if (modalId === 'add-debt-modal') document.getElementById('debt-date').value = getTodayDate();
    if (modalId === 'repay-modal') document.getElementById('repay-date').value = getTodayDate();
};

const closeModal = (modalId) => {
    document.getElementById(modalId).classList.remove('active');
    // تفريغ الحقول
    const inputs = document.querySelectorAll(`#${modalId} input:not([readonly])`);
    inputs.forEach(input => input.value = '');
};

// التنقل بين الصفحات
const goHome = () => {
    document.getElementById('details-page').classList.remove('active');
    document.getElementById('home-page').classList.add('active');
    currentClientId = null;
    
    // تصفير حقل البحث عند العودة للرئيسية
    const searchInput = document.getElementById('search-input');
    if(searchInput) searchInput.value = '';
    
    renderSubscribers();
};

const openClientDetails = (id) => {
    currentClientId = id;
    document.getElementById('home-page').classList.remove('active');
    document.getElementById('details-page').classList.add('active');
    renderClientDetails();
};

// عرض قائمة المشتركين (مع دعم البحث الفلترة)
const renderSubscribers = (searchTerm = '') => {
    const list = document.getElementById('subscribers-list');
    list.innerHTML = '';
    
    // فلترة المشتركين بناءً على النص المدخل (سواء من أول حرف أو أي جزء من الاسم)
    const filteredSubscribers = subscribers.filter(sub => 
        sub.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if(filteredSubscribers.length === 0) {
        list.innerHTML = '<p style="text-align:center; opacity:0.6;">لا يوجد مشتركون بهذا الاسم.</p>';
        return;
    }

    filteredSubscribers.forEach(sub => {
        const div = document.createElement('div');
        div.className = 'card glass-effect';
        div.onclick = () => openClientDetails(sub.id);
        div.innerHTML = `
            <div>
                <h4>${sub.name}</h4>
                <small>${sub.phone}</small>
            </div>
            <h4 style="color: ${sub.totalDebt > 0 ? '#e74c3c' : '#2ecc71'}; direction: ltr;">
                ${formatCurrency(sub.totalDebt)}
            </h4>
        `;
        list.appendChild(div);
    });
};

// دالة البحث (تستدعى تلقائياً عند الكتابة في حقل البحث)
const filterSubscribers = () => {
    const query = document.getElementById('search-input').value;
    renderSubscribers(query);
};

// عرض تفاصيل العميل المحدد (الديون والمعاملات)
const renderClientDetails = () => {
    const client = subscribers.find(s => s.id === currentClientId);
    if (!client) return;

    document.getElementById('client-name-title').innerText = client.name;
    document.getElementById('total-debt').innerText = formatCurrency(client.totalDebt);

    const transList = document.getElementById('transactions-list');
    transList.innerHTML = '';

    // عرض المعاملات من الأحدث للأقدم
    const reversedTransactions = [...client.transactions].reverse();
    
    reversedTransactions.forEach(trans => {
        const isDebt = trans.type === 'debt';
        const div = document.createElement('div');
        div.className = `card glass-effect transaction ${isDebt ? 'debt' : 'repay'}`;
        div.innerHTML = `
            <div class="transaction-details">
                <h4>${trans.title}</h4>
                <p>${trans.date}</p>
                ${trans.notes ? `<p>ملاحظة: ${trans.notes}</p>` : ''}
            </div>
            <h4 style="color: ${isDebt ? '#e74c3c' : '#2ecc71'}; direction: ltr;">
                ${isDebt ? '+' : '-'}${formatCurrency(trans.amount)}
            </h4>
        `;
        transList.appendChild(div);
    });
};

// وظيفة: إضافة مشترك جديد
const saveSubscriber = () => {
    const name = document.getElementById('sub-name').value.trim();
    const phone = document.getElementById('sub-phone').value.trim();
    const date = document.getElementById('sub-date').value;

    if (!name || !phone) {
        alert('الرجاء إدخال الاسم والرقم');
        return;
    }

    const newSub = {
        id: Date.now(),
        name,
        phone,
        date,
        totalDebt: 0,
        transactions: []
    };

    subscribers.push(newSub);
    saveData();
    closeModal('add-sub-modal');
    
    // إعادة تعيين حقل البحث وعرض القائمة كاملة
    document.getElementById('search-input').value = '';
    renderSubscribers();
};

// وظيفة: إضافة دين على العميل الحالي
const saveDebt = () => {
    const product = document.getElementById('debt-product').value.trim();
    const amount = parseFloat(document.getElementById('debt-amount').value);
    const date = document.getElementById('debt-date').value;

    if (!product || isNaN(amount) || amount <= 0) {
        alert('الرجاء إدخال تفاصيل صحيحة');
        return;
    }

    const client = subscribers.find(s => s.id === currentClientId);
    client.totalDebt += amount;
    
    client.transactions.push({
        id: Date.now(),
        type: 'debt',
        title: product,
        amount: amount,
        date: date
    });

    saveData();
    closeModal('add-debt-modal');
    renderClientDetails();
};

// وظيفة: تسديد دفعة من ديون العميل
const saveRepayment = () => {
    const amount = parseFloat(document.getElementById('repay-amount').value);
    const date = document.getElementById('repay-date').value;
    const notes = document.getElementById('repay-notes').value.trim();

    if (isNaN(amount) || amount <= 0) {
        alert('الرجاء إدخال مبلغ صحيح');
        return;
    }

    const client = subscribers.find(s => s.id === currentClientId);
    
    if(amount > client.totalDebt && client.totalDebt > 0) {
       if(!confirm('المبلغ المسدد أكبر من الدين المتبقي! هل تريد المتابعة؟')) return;
    }

    client.totalDebt -= amount;
    
    client.transactions.push({
        id: Date.now(),
        type: 'repay',
        title: 'تسديد دفعة',
        amount: amount,
        date: date,
        notes: notes
    });

    saveData();
    closeModal('repay-modal');
    renderClientDetails();
};

// التشغيل الأولي عند فتح الصفحة
window.onload = () => {
    renderSubscribers();
};
