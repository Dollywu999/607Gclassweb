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
const ADMIN_PASSWORD = '607happyG';

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('password-input');
    const passwordIcon = document.getElementById('password-icon');
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('.nav-link');
    const messageInput = document.getElementById('message-input');
    const submitMessage = document.getElementById('submit-message');
    const addEventButton = document.getElementById('add-event-button');
    const editCountdownButton = document.getElementById('edit-countdown-button');

    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            showSection(sectionId);
        });
    });

    // Message Board - Enter key functionality
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleMessageSubmit();
        }
    });

    submitMessage.addEventListener('click', handleMessageSubmit);

    // Password Lock Functionality
    passwordIcon.addEventListener('click', () => {
        if (isAdmin) {
            // Logout
            isAdmin = false;
            passwordIcon.textContent = '🔒';
            hideAdminFeatures();
            alert('已登出管理員模式');
        } else {
            // Show password input
            passwordInput.style.display = 'block';
            passwordInput.focus();
        }
    });

    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            if (passwordInput.value === ADMIN_PASSWORD) {
                isAdmin = true;
                passwordIcon.textContent = '🔓';
                passwordInput.style.display = 'none';
                passwordInput.value = '';
                showAdminFeatures();
                alert('已進入管理員模式');
            } else {
                alert('密碼錯誤');
                passwordInput.value = '';
            }
        }
    });

    // Countdown Event Management
    let countdownEvents = [];

    // Load countdown events
    async function loadCountdownEvents() {
        try {
            const snapshot = await db.collection('countdown').orderBy('targetDate').get();
            countdownEvents = [];
            snapshot.forEach(doc => {
                countdownEvents.push({ id: doc.id, ...doc.data() });
            });
            displayCountdownEvents();
        } catch (error) {
            console.error('載入倒數事件錯誤:', error);
        }
    }

    // Display countdown events
    function displayCountdownEvents() {
        const container = document.getElementById('countdown-container');
        container.innerHTML = '';

        countdownEvents.forEach(event => {
            const eventElement = document.createElement('div');
            eventElement.className = 'countdown-event';
            const targetDate = new Date(event.targetDate);
            const now = new Date();
            const timeDiff = targetDate - now;
            const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            eventElement.innerHTML = `
                <h3>${event.title}</h3>
                <p>倒數: ${days} 天</p>
                <p>目標日期: ${targetDate.toLocaleDateString()}</p>
                ${isAdmin ? `<button onclick="editEvent('${event.id}')" class="btn">編輯</button>` : ''}
            `;
            container.appendChild(eventElement);
        });
    }

    // Add new countdown event
    addEventButton.addEventListener('click', () => {
        if (!isAdmin) return;
        
        const title = prompt('請輸入事件標題:');
        if (!title) return;

        const dateStr = prompt('請輸入目標日期 (YYYY-MM-DD):');
        if (!dateStr) return;

        const targetDate = new Date(dateStr);
        if (isNaN(targetDate.getTime())) {
            alert('無效的日期格式');
            return;
        }

        db.collection('countdown').add({
            title,
            targetDate: targetDate.toISOString(),
            createdAt: new Date().toISOString()
        }).then(() => {
            loadCountdownEvents();
        }).catch(error => {
            console.error('新增倒數事件錯誤:', error);
            alert('新增失敗，請稍後再試');
        });
    });

    // Edit countdown event
    window.editEvent = function(eventId) {
        if (!isAdmin) return;

        const event = countdownEvents.find(e => e.id === eventId);
        if (!event) return;

        const newTitle = prompt('請輸入新的標題:', event.title);
        if (!newTitle) return;

        const newDateStr = prompt('請輸入新的目標日期 (YYYY-MM-DD):', new Date(event.targetDate).toISOString().split('T')[0]);
        if (!newDateStr) return;

        const newDate = new Date(newDateStr);
        if (isNaN(newDate.getTime())) {
            alert('無效的日期格式');
            return;
        }

        db.collection('countdown').doc(eventId).update({
            title: newTitle,
            targetDate: newDate.toISOString()
        }).then(() => {
            loadCountdownEvents();
        }).catch(error => {
            console.error('更新倒數事件錯誤:', error);
            alert('更新失敗，請稍後再試');
        });
    };

    // Message handling
    async function handleMessageSubmit() {
        const content = messageInput.value.trim();
        if (!content) return;

        try {
            await db.collection('messages').add({
                content,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            messageInput.value = '';
            alert('留言成功！');
        } catch (error) {
            console.error('發送留言錯誤:', error);
            alert('發送留言失敗，請稍後再試');
        }
    }

    // Initial load
    showSection('countdown');
    loadCountdownEvents();
    initializeRealtimeListeners();
});

// Utility Functions
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
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
}

// Delete message function
window.deleteMessage = async function(id) {
    if (!isAdmin) return;
    if (confirm('確定要刪除這則留言嗎？')) {
        try {
            await db.collection('messages').doc(id).delete();
        } catch (error) {
            console.error('刪除留言錯誤:', error);
            alert('刪除留言失敗，請稍後再試');
        }
    }
};
