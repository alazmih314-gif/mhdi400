let subscribers = JSON.parse(localStorage.getItem('debt_app_data')) || [];
let currentClientId = null;

const formatCurrency = (amount) => new Intl.NumberFormat('en-US').format(amount) + ' د.ع';
const getTodayDate = () => {
    const today = new Date();
    return `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;
};

const saveData = () => localStorage.setItem('debt_app_data', JSON.stringify(subscribers));

const openModal = (modalId) => {
    document.getElementById(modalId).classList.add('active');
    if (modalId === 'add-sub-modal') document.getElementById('sub-date').value = getTodayDate();
    if (modalId === 'add-debt-modal') document.getElementById('debt-date').value = getTodayDate();
    if (modalId === 'repay-modal') document.getElementById('repay-date').value = getTodayDate();
};

const closeModal = (modalId) => {
    document.getElementById(modalId).classList.remove('active');
    const inputs = document.querySelectorAll(`#${modalId} input:not([readonly])`);
    inputs.forEach(input => input.value = '');
};

const goHome = () => {
    document.getElementById('details-page').classList.remove('active');
    document.getElementById('home-page').classList.add('active');
    currentClientId = null;
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

const renderSubscribers = (searchTerm = '') => {
    const list = document.getElementById('subscribers-list');
    list.innerHTML = '';
    const filteredSubscribers = subscribers.filter(sub => sub.name.toLowerCase().includes(searchTerm.toLowerCase()));

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

const filterSubscribers = () => renderSubscribers(document.getElementById('search-input').value);

const renderClientDetails = () => {
    const client = subscribers.find(s => s.id === currentClientId);
    if (!client) return;

    document.getElementById('client-name-title').innerText = client.name;
    document.getElementById('total-debt').innerText = formatCurrency(client.totalDebt);

    const transList = document.getElementById('transactions-list');
    transList.innerHTML = '';
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

const saveSubscriber = () => {
    const name = document.getElementById('sub-name').value.trim();
    const phone = document.getElementById('sub-phone').value.trim();
    const date = document.getElementById('sub-date').value;

    if (!name || !phone) return alert('الرجاء إدخال الاسم والرقم');

    subscribers.push({ id: Date.now(), name, phone, date, totalDebt: 0, transactions: [] });
    saveData();
    closeModal('add-sub-modal');
    document.getElementById('search-input').value = '';
    renderSubscribers();
};

const saveDebt = () => {
    const product = document.getElementById('debt-product').value.trim();
    const amount = parseFloat(document.getElementById('debt-amount').value);
    const date = document.getElementById('debt-date').value;

    if (!product || isNaN(amount) || amount <= 0) return alert('الرجاء إدخال تفاصيل صحيحة');

    const client = subscribers.find(s => s.id === currentClientId);
    client.totalDebt += amount;
    client.transactions.push({ id: Date.now(), type: 'debt', title: product, amount, date });

    saveData();
    closeModal('add-debt-modal');
    renderClientDetails();
};

const saveRepayment = () => {
    const amount = parseFloat(document.getElementById('repay-amount').value);
    const date = document.getElementById('repay-date').value;
    const notes = document.getElementById('repay-notes').value.trim();

    if (isNaN(amount) || amount <= 0) return alert('الرجاء إدخال مبلغ صحيح');

    const client = subscribers.find(s => s.id === currentClientId);
    if(amount > client.totalDebt && client.totalDebt > 0) {
       if(!confirm('المبلغ المسدد أكبر من الدين المتبقي! هل تريد المتابعة؟')) return;
    }

    client.totalDebt -= amount;
    client.transactions.push({ id: Date.now(), type: 'repay', title: 'تسديد دفعة', amount, date, notes });

    saveData();
    closeModal('repay-modal');
    renderClientDetails();
};

// ==========================================
// 🚀 PWA & Service Worker Logic
// ==========================================

// تسجيل الـ Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker تم التسجيل بنجاح', reg.scope))
            .catch(err => console.error('فشل تسجيل الـ Service Worker', err));
    });
}

// التحكم بنافذة التثبيت
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    // منع ظهور شريط التثبيت الافتراضي الصغير
    e.preventDefault();
    deferredPrompt = e;
    
    // إظهار نافذة (Modal) التثبيت المخصصة التي صممناها بعد ثانية من فتح التطبيق
    setTimeout(() => {
        openModal('install-modal');
    }, 1000);
});

// وظيفة زر "تثبيت الآن" داخل الـ Modal
document.getElementById('install-btn').addEventListener('click', async () => {
    if (deferredPrompt) {
        // إظهار شاشة التثبيت الرسمية للنظام
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`اختيار المستخدم للتثبيت: ${outcome}`);
        // تفريغ المتغير
        deferredPrompt = null;
        // إغلاق نافذتنا المخصصة
        closeModal('install-modal');
    }
});

// التشغيل الأولي
window.onload = () => renderSubscribers();
