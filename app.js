import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile, sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, query, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove, setDoc, where, limit, writeBatch } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

document.addEventListener('DOMContentLoaded', () => {
    const firebaseConfig = {
        apiKey: "AIzaSyALLWz-xkvroabNu_ug6ZVdDEmNF3O2eJs",
        authDomain: "deep-9656b.firebaseapp.com",
        projectId: "deep-9656b",
        storageBucket: "deep-9656b.firebasestorage.app",
        messagingSenderId: "786248126233",
        appId: "1:786248126233:web:be8ebed2a68281204eff88",
        measurementId: "G-FWC45EBFFP"
    };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);

    let currentUser = null;
    let postsListener = null, usersListener = null, chatListener = null, typingListener = null, notificationsListener = null;
    let currentChatUser = null;
    const genericAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23ddd'/%3E%3Ctext x='50' y='55' font-family='Arial' font-size='40' fill='%23888' text-anchor='middle' dominant-baseline='middle'%3E👤%3C/text%3E%3C/svg%3E";

    const DOMElements = {
        html: document.documentElement,
        loginModal: document.getElementById('loginModal'),
        userAvatar: document.getElementById('userAvatar'),
        sidebarAvatar: document.getElementById('sidebarAvatar'),
        composerAvatar: document.getElementById('composerAvatar'),
        profileName: document.getElementById('profileName'),
        status: document.getElementById('status'),
        postsContainer: document.getElementById('postsContainer'),
        postInput: document.getElementById('postInput'),
        onlineUsersList: document.getElementById('onlineUsersList'),
        chatModal: document.getElementById('chatModal'),
        chatContainer: document.querySelector('.chat-container'),
        chatHeader: document.querySelector('.chat-header'),
        chatUserAvatar: document.getElementById('chatUserAvatar'),
        chatUserName: document.getElementById('chatUserName'),
        chatUserStatus: document.getElementById('chatUserStatus'),
        messagesContainer: document.getElementById('messagesContainer'),
        messagesList: document.getElementById('messagesList'),
        chatInput: document.getElementById('chatInput'),
        chatInputForm: document.getElementById('chatInputForm'),
        typingIndicator: document.getElementById('typingIndicator'),
        typingUserName: document.getElementById('typingUserName'),
        notification: document.getElementById('notification'),
        themeToggle: document.getElementById('themeToggle'),
        notificationsToggle: document.getElementById('notificationsToggle'),
        notificationCount: document.getElementById('notificationCount'),
        notificationsPanel: document.getElementById('notificationsPanel'),
        notificationsList: document.getElementById('notificationsList'),
        closeChatBtn: document.getElementById('closeChatBtn'),
        changeAvatarBtn: document.getElementById('changeAvatarBtn'),
        avatarModal: document.getElementById('avatarModal'),
        avatarInput: document.getElementById('avatarInput'),
        uploadAvatarBtn: document.getElementById('uploadAvatarBtn'),
        cancelAvatarBtn: document.getElementById('cancelAvatarBtn'),
        chatImageBtn: document.getElementById('chatImageBtn'),
        logoutBtn: document.getElementById('logoutBtn')
    };

    const showToast = (message, type = 'success') => {
        DOMElements.notification.textContent = message;
        DOMElements.notification.className = `toast-notification ${type} show`;
        setTimeout(() => DOMElements.notification.classList.remove('show'), 3000);
    };

    const formatTime = (ts) => {
        if (!ts?.toDate) return '';
        const date = ts.toDate();
        const now = new Date();
        const diff = now - date;
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getChatId = (uid1, uid2) => [uid1, uid2].sort().join('_');
    const applyTheme = (theme) => {
        DOMElements.html.setAttribute('data-color-scheme', theme);
        DOMElements.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
        localStorage.setItem('theme', theme);
    };

    const uploadFile = async (file, path) => {
        const fileRef = ref(storage, path);
        await uploadBytes(fileRef, file);
        return await getDownloadURL(fileRef);
    };

    const updateUserPresence = async (isOnline) => {
        if (!currentUser) return;
        try { await updateDoc(doc(db, 'users', currentUser.uid), { isOnline, lastSeen: serverTimestamp() }); }
        catch (e) { console.error("Presence error:", e); }
    };

    const sendMessage = async (text = '', imageUrl = '') => {
        if ((!text.trim() && !imageUrl) || !currentChatUser || !currentUser) return;
        const chatId = getChatId(currentUser.uid, currentChatUser.id);
        try {
            const batch = writeBatch(db);
            const chatDocRef = doc(db, 'chats', chatId);
            batch.set(chatDocRef, { participants: [currentUser.uid, currentChatUser.id], lastMessage: text.trim() || '📷 Image', lastMessageTime: serverTimestamp() }, { merge: true });
            const messageDocRef = doc(collection(db, 'chats', chatId, 'messages'));
            batch.set(messageDocRef, { text: text.trim(), imageUrl, senderId: currentUser.uid, senderName: currentUser.displayName, senderAvatar: currentUser.photoURL || genericAvatar, timestamp: serverTimestamp() });
            await batch.commit();
            await createNotification(currentChatUser.id, 'message', text.trim() || '📷 Image');
        } catch (error) { showToast('Failed to send message.', 'error'); }
    };

    const openChat = (user) => {
        currentChatUser = user;
        DOMElements.chatModal.classList.remove('hidden');
        DOMElements.chatUserAvatar.src = user.photoURL || genericAvatar;
        DOMElements.chatUserName.textContent = user.displayName;
        DOMElements.chatUserStatus.textContent = user.isOnline ? 'Online' : 'Offline';
        if (chatListener) chatListener();
        const q = query(collection(db, 'chats', getChatId(currentUser.uid, user.id), 'messages'), orderBy('timestamp', 'asc'));
        chatListener = onSnapshot(q, s => renderMessages(s.docs.map(d => ({...d.data()}))));
    };

    const renderMessages = (messages) => {
        DOMElements.messagesList.innerHTML = messages.map(msg => `
            <div class="message ${msg.senderId === currentUser.uid ? 'sent' : 'received'}">
                <img class="message-avatar" src="${msg.senderAvatar}" onerror="this.src='${genericAvatar}'">
                <div class="message-bubble">
                    ${msg.imageUrl ? `<img src="${msg.imageUrl}" class="message-image">` : ''}
                    ${msg.text ? `<div>${msg.text}</div>` : ''}
                    <span class="message-time">${formatTime(msg.timestamp)}</span>
                </div>
            </div>`).join('');
        DOMElements.messagesContainer.scrollTop = DOMElements.messagesContainer.scrollHeight;
    };
    
    const listenForAllUsers = () => {
        if (usersListener) usersListener();
        const q = query(collection(db, 'users'), orderBy('lastSeen', 'desc'));
        usersListener = onSnapshot(q, (snapshot) => {
            renderAllUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.id !== currentUser.uid));
        }, () => showToast("Could not load users. A database index may be required.", "error"));
    };

    const renderAllUsers = (users) => {
        DOMElements.onlineUsersList.innerHTML = users.length === 0 ? '<p style="color: var(--color-text-secondary); font-size: 12px;">No other users found.</p>' : users.map(user => `
            <div class="online-user-item" data-uid="${user.id}">
                <div class="online-user-avatar">
                    <img src="${user.photoURL || genericAvatar}" onerror="this.src='${genericAvatar}'">
                    <div class="${user.isOnline ? 'online-indicator' : 'offline-indicator'}"></div>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${user.displayName}</div>
                    <div style="font-size: 12px; color: var(--color-text-secondary);">${user.isOnline ? 'Online' : `Last seen: ${formatTime(user.lastSeen)}`}</div>
                </div>
            </div>`).join('');
        document.querySelectorAll('.online-user-item').forEach(item => item.addEventListener('click', () => {
            const user = users.find(u => u.id === item.dataset.uid);
            if (user) openChat(user);
        }));
    };

    const handleAuth = () => {
        onAuthStateChanged(auth, async (user) => {
            if (user && user.emailVerified) {
                currentUser = user;
                DOMElements.loginModal.classList.add('hidden');
                const avatarUrl = user.photoURL || genericAvatar;
                [DOMElements.userAvatar, DOMElements.sidebarAvatar, DOMElements.composerAvatar].forEach(el => el.src = avatarUrl);
                DOMElements.profileName.textContent = user.displayName || 'Anonymous';
                await setDoc(doc(db, 'users', user.uid), { displayName: user.displayName, email: user.email, photoURL: user.photoURL, isOnline: true, lastSeen: serverTimestamp() }, { merge: true });
                listenForAllUsers();
            } else {
                if (user && !user.emailVerified) { showToast('Please verify your email.', 'warning'); signOut(auth); }
                currentUser = null;
                DOMElements.loginModal.classList.remove('hidden');
                [postsListener, usersListener, chatListener, typingListener, notificationsListener].forEach(l => l && l());
            }
        });
    };
    
    const setupEventListeners = () => {
        document.getElementById('loginForm').addEventListener('submit', async (e) => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, document.getElementById('loginEmail').value, document.getElementById('loginPassword').value); } catch (error) { showToast(error.message, 'error'); } });
        document.getElementById('signupForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signupName').value;
            try {
                const cred = await createUserWithEmailAndPassword(auth, document.getElementById('signupEmail').value, document.getElementById('signupPassword').value);
                await updateProfile(cred.user, { displayName: name });
                await sendEmailVerification(cred.user);
                showToast('Account created! Please verify your email.', 'success');
                signOut(auth);
            } catch (error) { showToast(error.message, 'error'); }
        });
        
        document.getElementById('showSignup').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('loginForm').classList.add('hidden'); document.getElementById('signupForm').classList.remove('hidden'); });
        document.getElementById('showLogin').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('signupForm').classList.add('hidden'); document.getElementById('loginForm').classList.remove('hidden'); });
        DOMElements.logoutBtn.addEventListener('click', async () => { await updateUserPresence(false); signOut(auth); });
        document.getElementById('postButton').addEventListener('click', () => createPost(DOMElements.postInput.value));
        DOMElements.themeToggle.addEventListener('click', () => applyTheme(DOMElements.html.getAttribute('data-color-scheme') === 'dark' ? 'light' : 'dark'));
        DOMElements.closeChatBtn.addEventListener('click', () => DOMElements.chatModal.classList.add('hidden'));
        DOMElements.chatInputForm.addEventListener('submit', (e) => { e.preventDefault(); const text = DOMElements.chatInput.value.trim(); if (text) { sendMessage(text); DOMElements.chatInput.value = ''; } });
        DOMElements.changeAvatarBtn.addEventListener('click', () => DOMElements.avatarModal.classList.remove('hidden'));
        DOMElements.cancelAvatarBtn.addEventListener('click', () => DOMElements.avatarModal.classList.add('hidden'));
        DOMElements.uploadAvatarBtn.addEventListener('click', async () => {
            const file = DOMElements.avatarInput.files[0]; if (!file) return showToast('Please select an image.', 'warning');
            try {
                const photoURL = await uploadFile(file, `avatars/${currentUser.uid}/${Date.now()}_${file.name}`);
                [DOMElements.userAvatar, DOMElements.sidebarAvatar, DOMElements.composerAvatar].forEach(el => el.src = photoURL);
                DOMElements.avatarModal.classList.add('hidden');
                showToast('Profile picture updated!');
            } catch (error) { showToast('Failed to upload profile picture.', 'error'); }
        });
    };

    applyTheme(localStorage.getItem('theme') || 'light');
    setupEventListeners();
    handleAuth();
    document.addEventListener('visibilitychange', () => updateUserPresence(!document.hidden));
    window.addEventListener('beforeunload', () => updateUserPresence(false));
});

