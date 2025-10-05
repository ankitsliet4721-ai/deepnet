// --- Firebase Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  onAuthStateChanged, signOut, sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, doc, getDoc, deleteDoc, updateDoc, 
  query, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove, 
  increment, setDoc, where, limit, getDocs,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyALLWz-xkvroabNu_ug6ZVdDEmNF3O2eJs",
  authDomain: "deep-9656b.firebaseapp.com",
  projectId: "deep-9656b",
  storageBucket: "deep-9656b.firebasestorage.app",
  messagingSenderId: "786248126233",
  appId: "1:786248126233:web:be8ebed2a68281204eff88",
};

// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Global State & Listeners ---
let currentUser = null;
let postsListenerUnsubscribe = null;
let onlineUsersListener = null;
let currentChatUser = null;
let messagesListener = null;
let typingTimer = null;
let typingListener = null;
let notificationsListener = null;

// --- DOM Element Cache ---
const DOMElements = {
  html: document.documentElement,
  app: document.getElementById('app'),
  loginModal: document.getElementById('loginModal'),
  userAvatar: document.getElementById('userAvatar'),
  sidebarAvatar: document.getElementById('sidebarAvatar'),
  composerAvatar: document.getElementById('composerAvatar'),
  profileName: document.getElementById('profileName'),
  status: document.getElementById('status'),
  postsContainer: document.getElementById('postsContainer'),
  postInput: document.getElementById('postInput'),
  postButton: document.getElementById('postButton'),
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
};

// --- Utility Functions ---
const showToast = (message, type = 'success') => {
  DOMElements.notification.textContent = message;
  DOMElements.notification.className = `notification ${type}`;
  DOMElements.notification.classList.add('show');
  setTimeout(() => DOMElements.notification.classList.remove('show'), 3000);
};

const formatTime = (timestamp) => {
  if (!timestamp?.toDate) return 'a moment ago';
  const date = timestamp.toDate();
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

const getChatId = (userId1, userId2) => [userId1, userId2].sort().join('_');


// =====================================================================
// NEW: Theme Management System
// =====================================================================
const applyTheme = (theme) => {
    DOMElements.html.setAttribute('data-color-scheme', theme);
    DOMElements.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('theme', theme);
};

const toggleTheme = () => {
    const currentTheme = DOMElements.html.getAttribute('data-color-scheme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
};

// =====================================================================
// NEW: Notification System
// =====================================================================
const createNotification = async (recipientId, type, contentSnippet = null, postId = null) => {
    if (recipientId === currentUser.uid) return; // Prevent self-notification
    try {
        await addDoc(collection(db, 'notifications'), {
            recipientId,
            senderId: currentUser.uid,
            senderName: currentUser.displayName,
            type, // 'like', 'comment', 'share', 'message'
            contentSnippet,
            postId,
            read: false,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error creating notification:", error);
    }
};

const listenForNotifications = () => {
    if (notificationsListener) notificationsListener();
    const q = query(
        collection(db, 'notifications'), 
        where('recipientId', '==', currentUser.uid),
        orderBy('createdAt', 'desc'),
        limit(10) // Fetch latest 10 for performance
    );
    notificationsListener = onSnapshot(q, snapshot => {
        const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const unreadCount = notifications.filter(n => !n.read).length;
        
        DOMElements.notificationCount.textContent = unreadCount;
        DOMElements.notificationCount.classList.toggle('hidden', unreadCount === 0);
        
        renderNotifications(notifications);
    });
};

const renderNotifications = (notifications) => {
    const { notificationsList } = DOMElements;
    notificationsList.innerHTML = '';
    if (notifications.length === 0) {
        notificationsList.innerHTML = '<div class="no-notifications">No notifications yet.</div>';
        return;
    }
    notifications.forEach(notif => {
        const item = document.createElement('div');
        item.className = `notification-item ${!notif.read ? 'unread' : ''}`;
        
        let icon = '🔔';
        let text = '';
        
        switch(notif.type) {
            case 'like': icon = '👍'; text = `<strong>${notif.senderName}</strong> liked your post.`; break;
            case 'comment': icon = '💬'; text = `<strong>${notif.senderName}</strong> commented: "${notif.contentSnippet}"`; break;
            case 'share': icon = '↗️'; text = `<strong>${notif.senderName}</strong> shared your post.`; break;
            case 'message': icon = '✉️'; text = `<strong>${notif.senderName}</strong> sent you a message.`; break;
            default: text = `New notification from <strong>${notif.senderName}</strong>.`; break;
        }

        item.innerHTML = `
            <div class="notification-item-icon">${icon}</div>
            <div class="notification-item-content">
                <p>${text}</p>
                <div class="notification-item-time">${formatTime(notif.createdAt)}</div>
            </div>
        `;
        notificationsList.appendChild(item);
    });
};

const markNotificationsAsRead = async () => {
    const q = query(collection(db, 'notifications'), where('recipientId', '==', currentUser.uid), where('read', '==', false));
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => updateDoc(doc.ref, { read: true }));
};

// --- Draggable Chatbox Logic ---
// ... (no changes from previous version)
const makeDraggable = (element, handle) => {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle.onmousedown = dragMouseDown;
    function dragMouseDown(e) { e.preventDefault(); pos3 = e.clientX; pos4 = e.clientY; document.onmouseup = closeDragElement; document.onmousemove = elementDrag; document.body.classList.add('dragging-no-select'); }
    function elementDrag(e) { e.preventDefault(); pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY; pos3 = e.clientX; pos4 = e.clientY; let newTop = element.offsetTop - pos2; let newLeft = element.offsetLeft - pos1; const maxX = window.innerWidth - element.offsetWidth; const maxY = window.innerHeight - element.offsetHeight; if (newLeft < 0) newLeft = 0; if (newTop < 0) newTop = 0; if (newLeft > maxX) newLeft = maxX; if (newTop > maxY) newTop = maxY; element.style.top = newTop + "px"; element.style.left = newLeft + "px"; element.style.bottom = 'auto'; element.style.right = 'auto'; }
    function closeDragElement() { document.onmouseup = null; document.onmousemove = null; document.body.classList.remove('dragging-no-select'); }
};

// --- User Presence & UI Rendering ---
// ... (no major changes from previous version)
const updateUserPresence = async (isOnline) => { if (!currentUser) return; try { await setDoc(doc(db, 'users', currentUser.uid), { uid: currentUser.uid, displayName: currentUser.displayName, email: currentUser.email, photoURL: currentUser.photoURL, presence: { state: isOnline ? 'online' : 'offline', last_changed: serverTimestamp(), }, }, { merge: true }); } catch (error) { console.error('Error updating presence:', error); } };
const renderOnlineUsers = (users) => { DOMElements.onlineUsersList.innerHTML = ''; users.sort((a, b) => (b.presence?.state === 'online') - (a.presence?.state === 'online')).forEach(user => { const userEl = document.createElement('div'); userEl.className = 'online-user-item'; userEl.onclick = () => openChat(user); const isOnline = user.presence?.state === 'online'; userEl.innerHTML = `<div class="online-user-avatar"><img src="${user.photoURL}" class="user-avatar" alt="${user.displayName}">${isOnline ? '<div class="online-indicator"></div>' : ''}</div><span class="online-user-name">${user.displayName}</span>`; DOMElements.onlineUsersList.appendChild(userEl); }); };
const renderMessages = (messages) => { DOMElements.messagesList.innerHTML = ''; messages.forEach(message => { const msgEl = document.createElement('div'); msgEl.className = `message ${message.senderId === currentUser.uid ? 'sent' : 'received'}`; msgEl.innerHTML = `<div class="message-bubble">${message.text}</div><div class="message-timestamp">${formatTime(message.timestamp)}</div>`; DOMElements.messagesList.appendChild(msgEl); }); DOMElements.messagesContainer.scrollTop = DOMElements.messagesContainer.scrollHeight; };
const displayPosts = (posts) => { DOMElements.postsContainer.innerHTML = ''; if (posts.length === 0) { DOMElements.postsContainer.innerHTML = `<div class="card" style="text-align:center; padding:40px;"><h3>No posts yet.</h3></div>`; return; } posts.forEach(post => { DOMElements.postsContainer.appendChild(createPostElement(post)); }); };
const createPostElement = (post) => {
    const postEl = document.createElement('div');
    if (post.type === 'share') {
        postEl.className = 'post shared-post';
        const op = post.originalPost;
        const opId = post.originalPostId;
        postEl.innerHTML = `<div class="share-header">🧠 <strong>${post.sharerName}</strong> shared this</div><div class="post-content-wrapper"><div class="post-header"><div class="post-author-info"><img src="${op.authorAvatar}" class="user-avatar"><div<div class="post-author">${op.authorName}</div><div class="post-time">${formatTime(op.createdAt)}</div></div></div></div><div class="post-content">${(op.content || '').replace(/\n/g, '<br>')}</div><div class="post-stats"><span>${op.likes || 0} Likes</span><span>${op.commentList?.length || 0} Comments</span><span>${op.shareCount || 0} Shares</span></div><div class="post-actions"><button class="post-action ${op.likedBy?.includes(currentUser?.uid) ? 'liked' : ''}" onclick="toggleLike('${opId}')">👍 Like</button><button class="post-action" onclick="focusCommentInput('${opId}')">💬 Comment</button><button class="post-action" onclick="sharePost('${opId}')">↗️ Share</button></div></div>`;
    } else {
        postEl.className = 'post'; postEl.dataset.postId = post.id;
        postEl.innerHTML = `<div class="post-header"><div class="post-author-info"><img src="${post.authorAvatar}" class="user-avatar"><div><div class="post-author">${post.authorName}</div><div class="post-time">${formatTime(post.createdAt)}</div></div></div>${post.authorId === currentUser?.uid ? `<button class="post-menu" onclick="deletePost('${post.id}')">✕</button>` : ''}</div><div class="post-content">${post.content.replace(/\n/g, '<br>')}</div><div class="post-stats"><span>${post.likes || 0} Likes</span><span>${post.commentList?.length || 0} Comments</span><span>${post.shareCount || 0} Shares</span></div><div class="post-actions"><button class="post-action ${post.likedBy?.includes(currentUser?.uid) ? 'liked' : ''}" onclick="toggleLike('${post.id}')">👍 Like</button><button class="post-action" onclick="focusCommentInput('${post.id}')">💬 Comment</button><button class="post-action" onclick="sharePost('${post.id}')">↗️ Share</button></div><div class="comments"><div class="comment-list"></div><form class="comment-form" onsubmit="addComment(event, '${post.id}')"><input class="comment-input" type="text" placeholder="Add a comment..."><button type="submit" class="comment-btn">Post</button></form></div>`;
        renderComments(postEl, post.commentList);
    }
    return postEl;
};
const renderComments = (postEl, comments = []) => { const listEl = postEl.querySelector('.comment-list'); listEl.innerHTML = ''; comments.forEach(c => { const item = document.createElement('div'); item.className = 'comment-item'; item.innerHTML = `<img src="${c.avatar}" class="comment-avatar"><div><div class="comment-body"><strong>${c.author}</strong> ${c.text}</div><div class="comment-meta">${formatTime(c.createdAt)}${c.userId === currentUser?.uid ? `<button class="delete-comment" onclick="deleteComment('${postEl.dataset.postId}', '${c.id}')">Delete</button>` : ''}</div></div>`; listEl.appendChild(item); }); };

// --- Real-time Listeners Setup ---
const listenForData = () => { if (postsListenerUnsubscribe) postsListenerUnsubscribe(); const qPosts = query(collection(db, 'posts'), orderBy('createdAt', 'desc')); postsListenerUnsubscribe = onSnapshot(qPosts, s => displayPosts(s.docs.map(d => ({ id: d.id, ...d.data() })))); if (onlineUsersListener) onlineUsersListener(); const qUsers = query(collection(db, 'users')); onlineUsersListener = onSnapshot(qUsers, s => renderOnlineUsers(s.docs.map(d => d.data()).filter(u => u.uid !== currentUser?.uid))); };
const listenForMessages = (chatId) => { if (messagesListener) messagesListener(); const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc')); messagesListener = onSnapshot(q, s => renderMessages(s.docs.map(d => d.data()))); };
const listenForTyping = (chatId) => { if (typingListener) typingListener(); typingListener = onSnapshot(doc(db, 'chats', chatId), s => { if (!s.exists() || !currentChatUser) return; const typing = s.data().typing || {}; if (typing[currentChatUser.uid]) { DOMElements.typingUserName.textContent = currentChatUser.displayName; DOMElements.typingIndicator.classList.remove('hidden'); } else { DOMElements.typingIndicator.classList.add('hidden'); } }); };

// --- Core Actions (Chat, Posts, etc.) with NOTIFICATION TRIGGERS ---
const openChat = (user) => { currentChatUser = user; DOMElements.chatUserAvatar.src = user.photoURL; DOMElements.chatUserName.textContent = user.displayName; DOMElements.chatUserStatus.textContent = user.presence?.state === 'online' ? 'Online' : 'Offline'; DOMElements.chatModal.classList.remove('hidden'); DOMElements.chatInput.focus(); const chatId = getChatId(currentUser.uid, user.uid); listenForMessages(chatId); listenForTyping(chatId); };
const closeChat = () => { if (messagesListener) messagesListener(); if (typingListener) typingListener(); currentChatUser = null; DOMElements.chatModal.classList.add('hidden'); };
const sendMessage = async () => { const text = DOMElements.chatInput.value.trim(); if (!text || !currentChatUser) return; DOMElements.chatInput.value = ''; const chatId = getChatId(currentUser.uid, currentChatUser.uid); await addDoc(collection(db, 'chats', chatId, 'messages'), { text, senderId: currentUser.uid, timestamp: serverTimestamp() }); await setDoc(doc(db, 'chats', chatId), { participants: [currentUser.uid, currentChatUser.uid], lastMessage: text }, { merge: true }); createNotification(currentChatUser.uid, 'message', text); };
const updateTypingStatus = async (isTyping) => { if (!currentChatUser) return; const chatId = getChatId(currentUser.uid, currentChatUser.uid); await setDoc(doc(db, 'chats', chatId), { typing: { [currentUser.uid]: isTyping } }, { merge: true }); };
const createPost = async () => { const content = DOMElements.postInput.value.trim(); if (!content) return; DOMElements.postButton.disabled = true; await addDoc(collection(db, 'posts'), { type: 'original', authorId: currentUser.uid, authorName: currentUser.displayName, authorAvatar: currentUser.photoURL, content, createdAt: serverTimestamp(), likes: 0, likedBy: [], commentList: [], shareCount: 0 }); DOMElements.postInput.value = ''; DOMElements.postButton.disabled = false; };
window.deletePost = async (postId) => { if (confirm('Delete post?')) { await deleteDoc(doc(db, "posts", postId)); showToast('Post deleted.'); } };
window.toggleLike = async (postId) => { const postRef = doc(db, 'posts', postId); const postSnap = await getDoc(postRef); if (!postSnap.exists()) return; const postData = postSnap.data(); const likedBy = postData.likedBy || []; if (likedBy.includes(currentUser.uid)) { await updateDoc(postRef, { likedBy: arrayRemove(currentUser.uid), likes: increment(-1) }); } else { await updateDoc(postRef, { likedBy: arrayUnion(currentUser.uid), likes: increment(1) }); createNotification(postData.authorId, 'like', null, postId); } };
window.sharePost = async (originalPostId) => { const postRef = doc(db, 'posts', originalPostId); const postSnap = await getDoc(postRef); if (!postSnap.exists()) return showToast('Post not found.', 'error'); await addDoc(collection(db, 'posts'), { type: 'share', sharerId: currentUser.uid, sharerName: currentUser.displayName, createdAt: serverTimestamp(), originalPostId, originalPost: postSnap.data() }); await updateDoc(postRef, { shareCount: increment(1) }); createNotification(postSnap.data().authorId, 'share', null, originalPostId); showToast('Post shared!'); };
window.focusCommentInput = (postId) => document.querySelector(`[data-post-id="${postId}"] .comment-input`).focus();
window.addComment = async (e, postId) => { e.preventDefault(); const input = e.target.querySelector('.comment-input'); const text = input.value.trim(); if (!text) return; const comment = { id: doc(collection(db, 'tmp')).id, userId: currentUser.uid, author: currentUser.displayName, avatar: currentUser.photoURL, text, createdAt: new Date() }; const postRef = doc(db, 'posts', postId); await updateDoc(postRef, { commentList: arrayUnion(comment) }); input.value = ''; const postSnap = await getDoc(postRef); createNotification(postSnap.data().authorId, 'comment', text, postId); };
window.deleteComment = async (postId, commentId) => { const postRef = doc(db, 'posts', postId); const postSnap = await getDoc(postRef); if (!postSnap.exists()) return; const commentToDelete = postSnap.data().commentList.find(c => c.id === commentId); if (commentToDelete) { await updateDoc(postRef, { commentList: arrayRemove(commentToDelete) }); } };

// --- Authentication ---
const setupAuthEventListeners = () => { document.getElementById('loginTab').addEventListener('click', () => switchAuthTab('login')); document.getElementById('signupTab').addEventListener('click', () => switchAuthTab('signup')); document.getElementById('logoutBtn').addEventListener('click', handleLogout); document.getElementById('loginForm').addEventListener('submit', handleLogin); document.getElementById('signupForm').addEventListener('submit', handleSignup); };
const switchAuthTab = (tab) => { document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login'); document.getElementById('signupForm').classList.toggle('hidden', tab === 'login'); document.getElementById('loginTab').classList.toggle('active', tab === 'login'); document.getElementById('signupTab').classList.toggle('active', tab !== 'login'); };
const handleLogin = async (e) => { e.preventDefault(); const { email, password } = Object.fromEntries(new FormData(e.target)); try { const cred = await signInWithEmailAndPassword(auth, email, password); if (!cred.user.emailVerified) { await signOut(auth); document.getElementById('loginMessage').textContent = 'Please verify your email.'; } } catch (error) { document.getElementById('loginMessage').textContent = error.message; } };
const handleSignup = async (e) => { e.preventDefault(); const { email, password } = Object.fromEntries(new FormData(e.target)); try { const cred = await createUserWithEmailAndPassword(auth, email, password); await sendEmailVerification(cred.user); await signOut(auth); document.getElementById('signupMessage').textContent = 'Account created! Please verify your email.'; } catch (error) { document.getElementById('signupMessage').textContent = error.message; } };
const handleLogout = async () => { await updateUserPresence(false); await signOut(auth); };

// --- App Initialization & Auth State Observer ---
onAuthStateChanged(auth, async (user) => {
  if (user && user.emailVerified) {
    currentUser = { uid: user.uid, displayName: user.displayName || user.email.split('@')[0], email: user.email, photoURL: user.photoURL || `https://i.pravatar.cc/40?u=${user.uid}` };
    DOMElements.app.classList.remove('hidden');
    DOMElements.loginModal.classList.add('hidden');
    [DOMElements.userAvatar, DOMElements.sidebarAvatar, DOMElements.composerAvatar].forEach(el => el.src = currentUser.photoURL);
    DOMElements.profileName.textContent = currentUser.displayName;
    await updateUserPresence(true);
    listenForData();
    listenForNotifications(); // START NOTIFICATION LISTENER
  } else {
    currentUser = null;
    DOMElements.app.classList.add('hidden');
    DOMElements.loginModal.classList.remove('hidden');
    if (postsListenerUnsubscribe) postsListenerUnsubscribe();
    if (onlineUsersListener) onlineUsersListener();
    if (notificationsListener) notificationsListener(); // Stop listener on logout
  }
});

document.addEventListener('DOMContentLoaded', () => {
  setupAuthEventListeners();
  DOMElements.postButton.addEventListener('click', createPost);
  DOMElements.chatInputForm.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(); });
  DOMElements.chatInput.addEventListener('input', () => { clearTimeout(typingTimer); updateTypingStatus(true); typingTimer = setTimeout(() => updateTypingStatus(false), 2000); });
  document.getElementById('closeChatModal').addEventListener('click', closeChat);
  makeDraggable(DOMElements.chatContainer, DOMElements.chatHeader);

  // Initialize Theme & Notifications
  applyTheme(localStorage.getItem('theme') || 'light');
  DOMElements.themeToggle.addEventListener('click', toggleTheme);
  DOMElements.notificationsToggle.addEventListener('click', () => {
    DOMElements.notificationsPanel.classList.toggle('hidden');
    if (!DOMElements.notificationsPanel.classList.contains('hidden')) {
      markNotificationsAsRead();
    }
  });
});

window.addEventListener('beforeunload', () => { if (auth.currentUser) { updateUserPresence(false); } });

