// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyB_r4w3pb1ZIO8YUCA9Yl9IITSHZi3cCiI",
    authDomain: "class-6bb0b.firebaseapp.com",
    projectId: "class-6bb0b",
    storageBucket: "class-6bb0b.firebasestorage.app",
    messagingSenderId: "709913685558",
    appId: "1:709913685558:web:f91e17254233103e527297"
};


// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
let isAdmin = false;


// 檢查是否已經登入
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        isAdmin = true;
        passwordIcon.textContent = '🔓';
        showAdminFeatures();
        passwordInput.style.display = 'none';
    } else {
        isAdmin = false;
        passwordIcon.textContent = '🔒';
        hideAdminFeatures();
    }
});


// DOM Elements
const passwordInput = document.getElementById('password-input');
const passwordIcon = document.getElementById('password-icon');
const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('.nav-link');


// Authentication Functions
function togglePasswordInput() {
    const input = document.getElementById('password-input');
    if (isAdmin) {
        // 如果已經登入，點擊圖標會登出
        firebase.auth().signOut().then(() => {
            isAdmin = false;
            passwordIcon.textContent = '🔒';
            hideAdminFeatures();
        }).catch((error) => {
            console.error('登出錯誤:', error);
        });
    } else {
        // 如果未登入，顯示密碼輸入框
        input.style.display = input.style.display === 'none' ? 'block' : 'none';
        if (input.style.display === 'block') {
            input.focus();
        }
    }
}


passwordInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const password = passwordInput.value;
        try {
            await firebase.auth().signInWithEmailAndPassword('admin@class6.com', password);
            passwordInput.value = ''; // 清空密碼輸入
        } catch (error) {
            alert('密碼錯誤');
            passwordInput.value = ''; // 清空密碼輸入
        }
    }
});


function showAdminFeatures() {
    document.getElementById('add-event-button').style.display = 'inline-block';
    document.getElementById('edit-countdown-button').style.display = 'inline-block';
    document.getElementById('show-upload-button').style.display = 'inline-block';
    document.getElementById('news-editor').style.display = 'block';
}


function hideAdminFeatures() {
    document.getElementById('add-event-button').style.display = 'none';
    document.getElementById('edit-countdown-button').style.display = 'none';
    document.getElementById('show-upload-button').style.display = 'none';
    document.getElementById('news-editor').style.display = 'none';
}


// Navigation
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = link.getAttribute('data-section');
        showSection(sectionId);
    });
});


function showSection(sectionId) {
    sections.forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'block';
}


// Countdown Section
let countdownEvents = [];


async function loadCountdownEvents() {
    try {
        const snapshot = await db.collection('countdowns').get();
        countdownEvents = [];
        snapshot.forEach(doc => {
            countdownEvents.push({ id: doc.id, ...doc.data() });
        });
        updateCountdownDisplay();
    } catch (error) {
        console.error('載入倒數計時錯誤:', error);
    }
}


function updateCountdownDisplay() {
    const container = document.getElementById('countdown-container');
    container.innerHTML = '';
    
    countdownEvents.forEach(event => {
        const eventDate = new Date(event.date);
        const now = new Date();
        const diff = eventDate - now;
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        const countdownElement = document.createElement('div');
        countdownElement.className = 'countdown-event';
        countdownElement.innerHTML = `
            <h3>${event.title}</h3>
            <p>還有 ${days} 天 ${hours} 小時</p>
        `;
        container.appendChild(countdownElement);
    });
}


// Gallery Section
const uploadButton = document.getElementById('show-upload-button');
const fileInput = document.getElementById('upload-photo');
const confirmUploadButton = document.getElementById('confirm-upload-button');


uploadButton.addEventListener('click', () => fileInput.click());


fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        confirmUploadButton.style.display = 'inline-block';
    }
});


confirmUploadButton.addEventListener('click', async () => {
    const files = fileInput.files;
    for (let file of files) {
        try {
            const ref = storage.ref(`gallery/${Date.now()}_${file.name}`);
            await ref.put(file);
            const url = await ref.getDownloadURL();
            await db.collection('gallery').add({
                url,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('上傳圖片錯誤:', error);
        }
    }
    loadGallery();
    confirmUploadButton.style.display = 'none';
    fileInput.value = '';
});


async function loadGallery() {
    const container = document.getElementById('gallery-container');
    container.innerHTML = '';
    
    try {
        const snapshot = await db.collection('gallery').orderBy('timestamp', 'desc').get();
        snapshot.forEach(doc => {
            const imageContainer = document.createElement('div');
            imageContainer.className = 'image-container';
            imageContainer.innerHTML = `
                <img src="${doc.data().url}" alt="Gallery Image">
                ${isAdmin ? `<button class="delete-btn" onclick="deleteImage('${doc.id}')">❌</button>` : ''}
            `;
            container.appendChild(imageContainer);
        });
    } catch (error) {
        console.error('載入相簿錯誤:', error);
    }
}


async function deleteImage(id) {
    if (confirm('確定要刪除這張照片嗎？')) {
        try {
            await db.collection('gallery').doc(id).delete();
            loadGallery();
        } catch (error) {
            console.error('刪除圖片錯誤:', error);
        }
    }
}


// Message Board Section
const messageInput = document.getElementById('message-input');
const submitMessage = document.getElementById('submit-message');


// 處理留言提交
async function handleMessageSubmit() {
    const message = messageInput.value.trim();
    if (message) {
        try {
            await db.collection('messages').add({
                content: message,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            messageInput.value = '';
            loadMessages();
        } catch (error) {
            console.error('發送留言錯誤:', error);
        }
    }
}


// 按鈕點擊提交
submitMessage.addEventListener('click', handleMessageSubmit);


// Enter鍵提交
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // 防止換行
        handleMessageSubmit();
    }
});


async function loadMessages() {
    const container = document.getElementById('message-container');
    container.innerHTML = '';
    
    try {
        const snapshot = await db.collection('messages')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        
        snapshot.forEach(doc => {
            const messageElement = document.createElement('div');
            messageElement.className = 'message';
            const timestamp = doc.data().timestamp ? doc.data().timestamp.toDate() : new Date();
            messageElement.innerHTML = `
                <p>${doc.data().content}</p>
                <div class="timestamp">${timestamp.toLocaleString()}</div>
            `;
            container.appendChild(messageElement);
        });
    } catch (error) {
        console.error('載入留言錯誤:', error);
    }
}


// News Section
const submitNews = document.getElementById('submit-news');


submitNews.addEventListener('click', async () => {
    const title = document.getElementById('news-title').value.trim();
    const content = document.getElementById('news-content').value.trim();
    
    if (title && content) {
        try {
            await db.collection('news').add({
                title,
                content,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            document.getElementById('news-title').value = '';
            document.getElementById('news-content').value = '';
            loadNews();
        } catch (error) {
            console.error('發布新聞錯誤:', error);
        }
    }
});


async function loadNews() {
    const container = document.getElementById('news-list');
    container.innerHTML = '';
    
    try {
        const snapshot = await db.collection('news')
            .orderBy('timestamp', 'desc')
            .get();
        
        snapshot.forEach(doc => {
            const newsElement = document.createElement('div');
            newsElement.className = 'news-item';
            const timestamp = doc.data().timestamp ? doc.data().timestamp.toDate() : new Date();
            newsElement.innerHTML = `
                <h3>${doc.data().title}</h3>
                <p>${doc.data().content}</p>
                <div class="timestamp">${timestamp.toLocaleString()}</div>
            `;
            container.appendChild(newsElement);
        });
    } catch (error) {
        console.error('載入新聞錯誤:', error);
    }
}


// Initialize all features
document.addEventListener('DOMContentLoaded', () => {
    showSection('countdown');
    loadCountdownEvents();
    loadGallery();
    loadMessages();
    loadNews();
    
    // Start countdown update interval
    setInterval(updateCountdownDisplay, 60000); // Update every minute
});




// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyB_r4w3pb1ZIO8YUCA9Yl9IITSHZi3cCiI",
    authDomain: "class-6bb0b.firebaseapp.com",
    projectId: "class-6bb0b",
    storageBucket: "class-6bb0b.firebasestorage.app",
    messagingSenderId: "709913685558",
    appId: "1:709913685558:web:f91e17254233103e527297"
};


// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
let isAdmin = false;


// Constants
const ADMIN_EMAIL = 'admin@class6.com';
const ADMIN_PASSWORD = '607happyG';


// DOM Elements
const passwordInput = document.getElementById('password-input');
const passwordIcon = document.getElementById('password-icon');
const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('.nav-link');
const messageInput = document.getElementById('message-input');
const submitMessage = document.getElementById('submit-message');


// Authentication State Observer
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        isAdmin = true;
        passwordIcon.textContent = '🔓';
        showAdminFeatures();
        passwordInput.style.display = 'none';
    } else {
        isAdmin = false;
        passwordIcon.textContent = '🔒';
        hideAdminFeatures();
    }
});


// Authentication Functions
async function handleLogin(password) {
    try {
        await firebase.auth().signInWithEmailAndPassword(ADMIN_EMAIL, password);
        return true;
    } catch (error) {
        console.error('登入錯誤:', error);
        return false;
    }
}


function togglePasswordInput() {
    if (isAdmin) {
        firebase.auth().signOut();
    } else {
        const input = document.getElementById('password-input');
        input.style.display = input.style.display === 'none' ? 'block' : 'none';
        if (input.style.display === 'block') {
            input.focus();
        }
    }
}


// Password Authentication
passwordInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const success = await handleLogin(passwordInput.value);
        if (!success) {
            alert('登入失敗，請確認密碼是否正確');
        }
        passwordInput.value = '';
    }
});


// Real-time Data Listeners
function initializeRealtimeListeners() {
    // Messages Listener
    db.collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(50)
        .onSnapshot((snapshot) => {
            const container = document.getElementById('message-container');
            container.innerHTML = '';
            
            snapshot.forEach(doc => {
                const messageElement = document.createElement('div');
                messageElement.className = 'message';
                const timestamp = doc.data().timestamp?.toDate() || new Date();
                messageElement.innerHTML = `
                    <p>${doc.data().content}</p>
                    <div class="timestamp">${timestamp.toLocaleString()}</div>
                    ${isAdmin ? `<button class="delete-btn" onclick="deleteMessage('${doc.id}')">❌</button>` : ''}
                `;
                container.appendChild(messageElement);
            });
        });


    // News Listener
    db.collection('news')
        .orderBy('timestamp', 'desc')
        .onSnapshot((snapshot) => {
            const container = document.getElementById('news-list');
            container.innerHTML = '';
            
            snapshot.forEach(doc => {
                const newsElement = document.createElement('div');
                newsElement.className = 'news-item';
                const timestamp = doc.data().timestamp?.toDate() || new Date();
                newsElement.innerHTML = `
                    <h3>${doc.data().title}</h3>
                    <p>${doc.data().content}</p>
                    <div class="timestamp">${timestamp.toLocaleString()}</div>
                    ${isAdmin ? `<button class="delete-btn" onclick="deleteNews('${doc.id}')">❌</button>` : ''}
                `;
                container.appendChild(newsElement);
            });
        });


    // Gallery Listener
    db.collection('gallery')
        .orderBy('timestamp', 'desc')
        .onSnapshot((snapshot) => {
            const container = document.getElementById('gallery-container');
            container.innerHTML = '';
            
            snapshot.forEach(doc => {
                const imageContainer = document.createElement('div');
                imageContainer.className = 'image-container';
                imageContainer.innerHTML = `
                    <img src="${doc.data().url}" alt="Gallery Image" loading="lazy">
                    ${isAdmin ? `<button class="delete-btn" onclick="deleteImage('${doc.id}', '${doc.data().path}')">❌</button>` : ''}
                `;
                container.appendChild(imageContainer);
            });
        });


    // Events/Countdown Listener
    db.collection('events')
        .orderBy('date')
        .onSnapshot((snapshot) => {
            countdownEvents = [];
            snapshot.forEach(doc => {
                countdownEvents.push({ id: doc.id, ...doc.data() });
            });
            updateCountdownDisplay();
        });
}


// Message Functions
async function handleMessageSubmit() {
    const content = messageInput.value.trim();
    if (content) {
        try {
            await db.collection('messages').add({
                content,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            messageInput.value = '';
        } catch (error) {
            console.error('發送留言錯誤:', error);
            alert('發送留言失敗，請稍後再試');
        }
    }
}


// News Functions
async function handleNewsSubmit() {
    const title = document.getElementById('news-title').value.trim();
    const content = document.getElementById('news-content').value.trim();
    
    if (title && content) {
        try {
            await db.collection('news').add({
                title,
                content,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            document.getElementById('news-title').value = '';
            document.getElementById('news-content').value = '';
        } catch (error) {
            console.error('發布新聞錯誤:', error);
            alert('發布新聞失敗，請稍後再試');
        }
    }
}


// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all features
    showSection('countdown');
    initializeRealtimeListeners();
    
    // Message submit events
    submitMessage.addEventListener('click', handleMessageSubmit);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleMessageSubmit();
        }
    });


    // News submit events
    const submitNews = document.getElementById('submit-news');
    submitNews.addEventListener('click', handleNewsSubmit);
    
    // News input enter key handlers
    const newsTitle = document.getElementById('news-title');
    const newsContent = document.getElementById('news-content');
    
    newsTitle.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            newsContent.focus();
        }
    });


    newsContent.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && e.ctrlKey) {
            e.preventDefault();
            handleNewsSubmit();
        }
    });


    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            showSection(sectionId);
        });
    });


    // Gallery upload
    const uploadButton = document.getElementById('show-upload-button');
    const fileInput = document.getElementById('upload-photo');
    const confirmUploadButton = document.getElementById('confirm-upload-button');


    uploadButton.addEventListener('click', () => fileInput.click());


    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            confirmUploadButton.style.display = 'inline-block';
        }
    });


    confirmUploadButton.addEventListener('click', async () => {
        const files = fileInput.files;
        for (let file of files) {
            try {
                const timestamp = Date.now();
                const ref = storage.ref(`gallery/${timestamp}_${file.name}`);
                await ref.put(file);
                const url = await ref.getDownloadURL();
                await db.collection('gallery').add({
                    url,
                    path: `gallery/${timestamp}_${file.name}`,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (error) {
                console.error('上傳圖片錯誤:', error);
                alert('上傳圖片失敗，請稍後再試');
            }
        }
        confirmUploadButton.style.display = 'none';
        fileInput.value = '';
    });
});


// Delete Functions
async function deleteMessage(id) {
    if (confirm('確定要刪除這則留言嗎？')) {
        try {
            await db.collection('messages').doc(id).delete();
        } catch (error) {
            console.error('刪除留言錯誤:', error);
            alert('刪除留言失敗，請稍後再試');
        }
    }
}


async function deleteNews(id) {
    if (confirm('確定要刪除這則新聞嗎？')) {
        try {
            await db.collection('news').doc(id).delete();
        } catch (error) {
            console.error('刪除新聞錯誤:', error);
            alert('刪除新聞失敗，請稍後再試');
        }
    }
}


async function deleteImage(id, path) {
    if (confirm('確定要刪除這張照片嗎？')) {
        try {
            await storage.ref(path).delete();
            await db.collection('gallery').doc(id).delete();
        } catch (error) {
            console.error('刪除圖片錯誤:', error);
            alert('刪除圖片失敗，請稍後再試');
        }
    }
}


// Utility Functions
function showSection(sectionId) {
    sections.forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'block';
}


function showAdminFeatures() {
    document.getElementById('add-event-button').style.display = 'inline-block';
    document.getElementById('edit-countdown-button').style.display = 'inline-block';
    document.getElementById('show-upload-button').style.display = 'inline-block';
    document.getElementById('news-editor').style.display = 'block';
}


function hideAdminFeatures() {
    document.getElementById('add-event-button').style.display = 'none';
    document.getElementById('edit-countdown-button').style.display = 'none';
    document.getElementById('show-upload-button').style.display = 'none';
    document.getElementById('news-editor').style.display = 'none';
}


function updateCountdownDisplay() {
    const container = document.getElementById('countdown-container');
    container.innerHTML = '';
    
    countdownEvents.forEach(event => {
        const eventDate = new Date(event.date);
        const now = new Date();
        const diff = eventDate - now;
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        const countdownElement = document.createElement('div');
        countdownElement.className = 'countdown-event';
        countdownElement.innerHTML = `
            <h3>${event.title}</h3>
            <p>還有 ${days} 天 ${hours} 小時</p>
            ${isAdmin ? `<button class="delete-btn" onclick="deleteCountdown('${event.id}')">❌</button>` : ''}
        `;
        container.appendChild(countdownElement);
    });
}