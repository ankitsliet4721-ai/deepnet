// --- Enhanced Firebase Imports with Storage ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut, 
    updateProfile,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    doc, 
    getDoc, 
    updateDoc, 
    query, 
    orderBy, 
    onSnapshot, 
    serverTimestamp, 
    arrayUnion, 
    arrayRemove, 
    setDoc, 
    where, 
    limit
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

// --- App Initialization wrapped in DOMContentLoaded to prevent race conditions ---
document.addEventListener('DOMContentLoaded', () => {
    // --- Your web app's Firebase configuration ---
    const firebaseConfig = {
        apiKey: "AIzaSyALLWz-xkvroabNu_ug6ZVdDEmNF3O2eJs",
        authDomain: "deep-9656b.firebaseapp.com",
        projectId: "deep-9656b",
        storageBucket: "deep-9656b.firebasestorage.app",
        messagingSenderId: "786248126233",
        appId: "1:786248126233:web:be8ebed2a68281204eff88",
        measurementId: "G-FWC45EBFFP"
    };

    // --- Firebase Initialization ---
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);

    // --- Global State ---
    let currentUser = null;
    let postsListener = null, usersListener = null, chatListener = null, typingListener = null, notificationsListener = null;
    let currentChatUser = null;
    let typingTimer = null;
    let isDragging = false;
    const genericAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23ddd'/%3E%3Ctext x='50' y='55' font-family='Arial' font-size='40' fill='%23888' text-anchor='middle' dominant-baseline='middle'%3E👤%3C/text%3E%3C/svg%3E";

    // --- DOM Element Cache (Initialized safely after DOM is loaded) ---
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
        closeChatBtn: document.getElementById('closeChatBtn'),
        changeAvatarBtn: document.getElementById('changeAvatarBtn'),
        avatarModal: document.getElementById('avatarModal'),
        avatarInput: document.getElementById('avatarInput'),
        uploadAvatarBtn: document.getElementById('uploadAvatarBtn'),
        cancelAvatarBtn: document.getElementById('cancelAvatarBtn'),
        chatImageBtn: document.getElementById('chatImageBtn'),
        chatImageInput: document.getElementById('chatImageInput'),
        logoutBtn: document.getElementById('logoutBtn')
    };

    // --- Enhanced Utility Functions ---
    const showToast = (message, type = 'success') => {
        DOMElements.notification.textContent = message;
        DOMElements.notification.className = `toast-notification ${type}`;
        DOMElements.notification.classList.add('show');
        setTimeout(() => DOMElements.notification.classList.remove('show'), 3000);
    };

    const formatTime = (ts) => {
        if (!ts?.toDate) return 'a moment ago';
        const d = ts.toDate(), now = new Date(), diff = now - d;
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
        return d.toLocaleDateString('en-US', {day:'numeric', month:'short'});
    };

    const getChatId = (uid1, uid2) => [uid1, uid2].sort().join('_');

    const applyTheme = (theme) => {
        DOMElements.html.setAttribute('data-color-scheme', theme);
        DOMElements.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
        localStorage.setItem('theme', theme);
    };

    const toggleTheme = () => {
        applyTheme((DOMElements.html.getAttribute('data-color-scheme') || 'light') === 'dark' ? 'light' : 'dark');
    };

    // --- Enhanced Profile Picture Upload ---
    const uploadProfilePicture = async (file) => {
        if (!file || !currentUser) return null;

        try {
            const fileRef = ref(storage, `avatars/${currentUser.uid}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(fileRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            await updateProfile(currentUser, { photoURL: downloadURL });
            await updateDoc(doc(db, 'users', currentUser.uid), {
                photoURL: downloadURL,
                updatedAt: serverTimestamp()
            });

            return downloadURL;
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            throw error;
        }
    };

    const uploadChatImage = async (file) => {
        if (!file || !currentUser) return null;

        try {
            const fileRef = ref(storage, `chat-images/${currentUser.uid}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(fileRef, file);
            return await getDownloadURL(snapshot.ref);
        } catch (error) {
            console.error('Error uploading chat image:', error);
            throw error;
        }
    };

    // --- Enhanced User Management ---
    const updateUserPresence = async (isOnline) => {
        if (!currentUser) return;
        try {
            await updateDoc(doc(db, 'users', currentUser.uid), {
                isOnline,
                lastSeen: serverTimestamp()
            });
        } catch (e) {
            console.error("Presence update error:", e);
        }
    };

    // --- Enhanced Chat System ---
    const sendMessage = async (text = '', imageUrl = '') => {
        if ((!text.trim() && !imageUrl) || !currentChatUser || !currentUser) return;

        const chatId = getChatId(currentUser.uid, currentChatUser.id);
        
        try {
            const messageData = {
                text: text.trim(),
                imageUrl: imageUrl || '',
                senderId: currentUser.uid,
                senderName: currentUser.displayName,
                senderAvatar: currentUser.photoURL || genericAvatar,
                timestamp: serverTimestamp()
            };
            await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
            await setDoc(doc(db, 'chats', chatId), {
                participants: [currentUser.uid, currentChatUser.id],
                lastMessage: text.trim() || '📷 Image',
                lastMessageTime: serverTimestamp()
            }, { merge: true });

            clearTypingIndicator();
            await createNotification(currentChatUser.id, 'message', text.trim() || '📷 Image');
            DOMElements.chatInput.value = '';
        } catch (error) {
            console.error('Error sending message:', error);
            showToast('Failed to send message', 'error');
        }
    };

    const sendTypingIndicator = async () => {
        if (!currentChatUser || !currentUser) return;
        const chatId = getChatId(currentUser.uid, currentChatUser.id);
        try {
            await setDoc(doc(db, 'typing', chatId), {
                [currentUser.uid]: {
                    name: currentUser.displayName,
                    timestamp: serverTimestamp()
                }
            }, { merge: true });
        } catch (error) { console.error('Error sending typing indicator:', error); }
    };

    const clearTypingIndicator = async () => {
        if (!currentChatUser || !currentUser) return;
        const chatId = getChatId(currentUser.uid, currentChatUser.id);
        try {
            await updateDoc(doc(db, 'typing', chatId), {
                [`${currentUser.uid}`]: null
            });
        } catch (error) { console.error('Error clearing typing indicator:', error); }
    };
    
    const listenForTyping = () => {
        if (!currentChatUser || !currentUser) return;
        const chatId = getChatId(currentUser.uid, currentChatUser.id);
        if (typingListener) typingListener();
        
        typingListener = onSnapshot(doc(db, 'typing', chatId), (doc) => {
            const data = doc.data() || {};
            const otherUserTyping = Object.keys(data).find(uid => 
                uid !== currentUser.uid && data[uid] && data[uid].timestamp
            );

            if (otherUserTyping) {
                const typingUser = data[otherUserTyping];
                const timeDiff = Date.now() - (typingUser.timestamp?.toDate?.().getTime() || 0);
                
                if (timeDiff < 5000) {
                    DOMElements.typingUserName.textContent = typingUser.name;
                    DOMElements.typingIndicator.classList.remove('hidden');
                } else {
                    DOMElements.typingIndicator.classList.add('hidden');
                }
            } else {
                DOMElements.typingIndicator.classList.add('hidden');
            }
        });
    };

    const openChat = async (user) => {
        currentChatUser = user;
        DOMElements.chatModal.classList.remove('hidden');
        
        DOMElements.chatUserAvatar.src = user.photoURL || genericAvatar;
        DOMElements.chatUserName.textContent = user.displayName;
        DOMElements.chatUserStatus.textContent = user.isOnline ? 'Online' : 'Offline';

        loadChatMessages();
        listenForTyping();
    };

    const loadChatMessages = () => {
        if (!currentChatUser || !currentUser) return;
        const chatId = getChatId(currentUser.uid, currentChatUser.id);
        if (chatListener) chatListener();
        const messagesQuery = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'), limit(50));
        chatListener = onSnapshot(messagesQuery, (snapshot) => {
            renderMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
    };

    const renderMessages = (messages) => {
        DOMElements.messagesList.innerHTML = messages.map(message => {
            const isSent = message.senderId === currentUser.uid;
            return `
                <div class="message ${isSent ? 'sent' : 'received'}">
                    <img class="message-avatar" src="${message.senderAvatar}" alt="${message.senderName}" onerror="this.src='${genericAvatar}'">
                    <div class="message-bubble">
                        ${message.imageUrl ? `<img src="${message.imageUrl}" class="message-image" alt="Shared image" onclick="window.open('${message.imageUrl}', '_blank')">` : ''}
                        ${message.text ? `<div>${message.text}</div>` : ''}
                        <span class="message-time">${formatTime(message.timestamp)}</span>
                    </div>
                </div>
            `;
        }).join('');
        DOMElements.messagesContainer.scrollTop = DOMElements.messagesContainer.scrollHeight;
    };

    // --- Enhanced Notification System ---
    const createNotification = async (recipientId, type, contentSnippet = null, postId = null) => {
        if (recipientId === currentUser.uid) return;
        try {
            await addDoc(collection(db, 'notifications'), {
                recipientId,
                senderId: currentUser.uid,
                senderName: currentUser.displayName,
                senderAvatar: currentUser.photoURL || genericAvatar,
                type, contentSnippet, postId,
                read: false,
                createdAt: serverTimestamp()
            });
        } catch (e) { console.error("Notification Error:", e); }
    };

    const listenForNotifications = () => {
        if (notificationsListener) notificationsListener();
        const q = query(collection(db, 'notifications'), where('recipientId', '==', currentUser.uid), orderBy('createdAt', 'desc'), limit(10));
        notificationsListener = onSnapshot(q, snapshot => {
            const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            const unread = notifs.filter(n => !n.read).length;
            DOMElements.notificationCount.textContent = unread;
            DOMElements.notificationCount.classList.toggle('hidden', unread === 0);
            renderNotifications(notifs);
        });
    };

    const renderNotifications = (notifs) => {
        const list = DOMElements.notificationsList;
        if (notifs.length === 0) {
            list.innerHTML = '<div class="no-notifications">No notifications yet</div>';
            return;
        }
        list.innerHTML = notifs.map(notif => `
            <div class="notification-item ${!notif.read ? 'unread' : ''}" data-id="${notif.id}">
                <div class="notification-item-icon">${getNotificationIcon(notif.type)}</div>
                <div style="flex: 1;">
                    <div><strong>${notif.senderName}</strong> ${getNotificationText(notif.type, notif.contentSnippet)}</div>
                    <div class="notification-item-time">${formatTime(notif.createdAt)}</div>
                </div>
            </div>
        `).join('');
    };
    DOMElements.notificationsList.addEventListener('click', (e) => {
        const item = e.target.closest('.notification-item');
        if(item) markNotificationAsRead(item.dataset.id);
    });

    const getNotificationIcon = type => ({like: '❤️', comment: '💬', message: '📩', follow: '👥'}[type] || '🔔');
    const getNotificationText = (type, content) => ({
        like: 'liked your post',
        comment: `commented: "${content}"`,
        message: `sent you a message: "${content}"`,
        follow: 'started following you'
    }[type] || 'sent you a notification');

    const markNotificationAsRead = async (id) => {
        try { await updateDoc(doc(db, 'notifications', id), { read: true }); } 
        catch (e) { console.error('Error marking notification as read:', e); }
    };

    // --- User List Logic ---
    const listenForAllUsers = () => {
        if (usersListener) usersListener();
        const q = query(collection(db, 'users'), orderBy('lastSeen', 'desc'), limit(50));
        usersListener = onSnapshot(q, 
            (snapshot) => {
                const users = snapshot.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(user => user.id !== currentUser.uid);
                renderAllUsers(users);
            },
            (error) => {
                console.error("Error fetching users. This is likely due to a missing Firestore index.", error);
                showToast("Could not load user list. A database index is required.", "error");
            }
        );
    };

    const renderAllUsers = (users) => {
        DOMElements.onlineUsersList.innerHTML = '';
        DOMElements.onlineUsersList.parentElement.querySelector('h4').textContent = 'All Users';
        if (users.length === 0) {
            DOMElements.onlineUsersList.innerHTML = '<p style="color: var(--color-text-secondary); font-size: 12px;">No other users found.</p>';
            return;
        }
        users.forEach(user => {
            const userEl = document.createElement('div');
            userEl.className = 'online-user-item';
            
            const statusIndicatorClass = user.isOnline ? 'online-indicator' : 'offline-indicator';
            const statusText = user.isOnline ? 'Online' : `Last seen: ${formatTime(user.lastSeen)}`;

            userEl.innerHTML = `
                <div class="online-user-avatar">
                    <img src="${user.photoURL || genericAvatar}" alt="${user.displayName}" onerror="this.src='${genericAvatar}'">
                    <div class="${statusIndicatorClass}"></div>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${user.displayName}</div>
                    <div style="font-size: 12px; color: var(--color-text-secondary);">${statusText}</div>
                </div>
            `;
            userEl.onclick = () => openChat(user);
            DOMElements.onlineUsersList.appendChild(userEl);
        });
    };

    // --- Enhanced Posts System ---
    const createPost = async () => {
        const text = DOMElements.postInput.value.trim();
        if (!text || !currentUser) return;
        try {
            await addDoc(collection(db, 'posts'), {
                text,
                author: currentUser.displayName,
                authorId: currentUser.uid,
                authorAvatar: currentUser.photoURL || genericAvatar,
                likes: [], comments: [],
                createdAt: serverTimestamp()
            });
            DOMElements.postInput.value = '';
            showToast('Post created successfully!');
        } catch (error) {
            console.error('Error creating post:', error);
            showToast('Failed to create post', 'error');
        }
    };

    const listenForPosts = () => {
        if (postsListener) postsListener();
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(20));
        postsListener = onSnapshot(q, snapshot => renderPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))));
    };

    const renderPosts = (posts) => {
        DOMElements.postsContainer.innerHTML = posts.map(post => {
            const postLikes = Array.isArray(post.likes) ? post.likes : [];
            const isLiked = postLikes.includes(currentUser.uid);
            const likeCount = postLikes.length;
            const commentCount = Array.isArray(post.comments) ? post.comments.length : 0;

            return `
            <article class="post card" id="post-${post.id}">
                <div class="post-header">
                    <div class="post-author-info">
                        <img src="${post.authorAvatar}" alt="${post.author}" class="user-avatar" onerror="this.src='${genericAvatar}'">
                        <div>
                            <div style="font-weight: 600;">${post.author}</div>
                            <div style="font-size: 12px; color: var(--color-text-secondary);">${formatTime(post.createdAt)}</div>
                        </div>
                    </div>
                </div>
                <div class="post-content" style="margin: 12px 0;">${post.text}</div>
                <div class="post-stats">
                    <span>${likeCount} likes</span>
                    <span>${commentCount} comments</span>
                </div>
                <div class="post-actions">
                    <button class="post-action ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}')">${isLiked ? '❤️' : '🤍'} Like</button>
                    <button class="post-action" onclick="toggleComments('${post.id}')">💬 Comment</button>
                    <button class="post-action" onclick="sharePost('${post.id}')">🔗 Share</button>
                </div>
                <div id="comments-${post.id}" class="comments hidden">
                    <form class="comment-form" data-post-id="${post.id}">
                        <input type="text" class="comment-input" placeholder="Write a comment..." oninput="this.nextElementSibling.disabled = !this.value.trim()">
                        <button type="submit" class="btn-secondary" disabled>Post</button>
                    </form>
                    <div class="comments-list">
                        ${(Array.isArray(post.comments) ? post.comments : []).sort((a,b) => b.createdAt - a.createdAt).map(c => `
                            <div class="comment-item">
                                <img src="${c.authorAvatar}" alt="${c.author}" class="comment-avatar" onerror="this.src='${genericAvatar}'">
                                <div class="comment-body">
                                    <strong>${c.author}</strong> ${c.text}
                                    <div style="font-size: 10px; color: var(--color-text-secondary); margin-top: 4px;">${formatTime(c.createdAt)}</div>
                                </div>
                            </div>`).join('')}
                    </div>
                </div>
            </article>`;
        }).join('');
    };
    DOMElements.postsContainer.addEventListener('submit', (e) => {
        if(e.target.classList.contains('comment-form')) {
            e.preventDefault();
            const input = e.target.querySelector('.comment-input');
            const button = e.target.querySelector('button[type="submit"]');
            addComment(e.target.dataset.postId, input.value, button);
            input.value = '';
            button.disabled = true;
        }
    });

    window.toggleLike = async (postId) => {
        const postRef = doc(db, 'posts', postId);
        const postSnap = await getDoc(postRef);
        if(!postSnap.exists()) return;
        const post = postSnap.data();
        const postLikes = Array.isArray(post.likes) ? post.likes : [];
        const isLiked = postLikes.includes(currentUser.uid);
        await updateDoc(postRef, { likes: isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) });
        if (!isLiked && post.authorId !== currentUser.uid) {
            await createNotification(post.authorId, 'like', null, postId);
        }
    };

    window.toggleComments = (postId) => document.getElementById(`comments-${postId}`).classList.toggle('hidden');

    window.addComment = async (postId, text, buttonElement) => {
        if (!text.trim() || !buttonElement) return;

        buttonElement.disabled = true;
        buttonElement.textContent = 'Posting...';

        const comment = {
            text: text.trim(),
            author: currentUser.displayName,
            authorId: currentUser.uid,
            authorAvatar: currentUser.photoURL || genericAvatar,
            createdAt: serverTimestamp()
        };
        try {
            const postRef = doc(db, 'posts', postId);
            await updateDoc(postRef, { comments: arrayUnion(comment) });
            const postSnap = await getDoc(postRef);
            const post = postSnap.data();
            if (post.authorId !== currentUser.uid) {
                await createNotification(post.authorId, 'comment', text.trim(), postId);
            }
        } catch (error) {
            console.error("Error adding comment: ", error);
            showToast("Could not post comment.", "error");
            buttonElement.disabled = false;
            buttonElement.textContent = 'Post';
        }
    };
    
    window.sharePost = async (postId) => {
        const postElement = document.getElementById(`post-${postId}`);
        const postContent = postElement?.querySelector('.post-content')?.textContent || '';
        const postUrl = `${window.location.href}#post-${postId}`;
        
        const shareData = {
            title: 'Check out this post on DeepNet Social!',
            text: `"${postContent}"`,
            url: postUrl,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                throw new Error("Web Share API not supported");
            }
        } catch (err) {
            console.error("Share failed:", err);
            try {
                await navigator.clipboard.writeText(postUrl);
                showToast('Post link copied to clipboard!', 'success');
            } catch (copyErr) {
                console.error("Copy failed:", copyErr);
                showToast('Could not share or copy link.', 'error');
            }
        }
    };

    // --- Authentication System ---
    const handleAuth = () => {
        onAuthStateChanged(auth, async (user) => {
            if (user && user.emailVerified) {
                currentUser = user;
                DOMElements.loginModal.classList.add('hidden');
                const avatarUrl = user.photoURL || genericAvatar;
                [DOMElements.userAvatar, DOMElements.sidebarAvatar, DOMElements.composerAvatar].forEach(el => el.src = avatarUrl);
                DOMElements.profileName.textContent = user.displayName || 'Anonymous';
                DOMElements.status.textContent = 'Online';

                await setDoc(doc(db, 'users', user.uid), {
                    displayName: user.displayName, email: user.email, photoURL: user.photoURL,
                    isOnline: true, lastSeen: serverTimestamp(), status: 'Online'
                }, { merge: true });

                listenForPosts();
                listenForAllUsers();
                listenForNotifications();
                applyTheme(localStorage.getItem('theme') || 'light');
            } else {
                if (user && !user.emailVerified) {
                    showToast('Please verify your email before logging in.', 'warning');
                    signOut(auth);
                }
                currentUser = null;
                DOMElements.loginModal.classList.remove('hidden');
                [postsListener, usersListener, chatListener, typingListener, notificationsListener].forEach(l => l && l());
            }
        });
    };

    // --- Drag & Drop Chat Window ---
    const makeChatDraggable = () => {
        let isDown = false, offset = [0, 0];
        DOMElements.chatHeader.addEventListener('mousedown', (e) => {
            isDown = true;
            isDragging = false;
            offset = [DOMElements.chatContainer.offsetLeft - e.clientX, DOMElements.chatContainer.offsetTop - e.clientY];
        }, true);
        document.addEventListener('mouseup', () => { isDown = false; setTimeout(() => isDragging = false, 50); }, true);
        document.addEventListener('mousemove', (e) => {
            if (isDown) {
                isDragging = true;
                const x = e.clientX + offset[0];
                const y = e.clientY + offset[1];
                const maxX = window.innerWidth - DOMElements.chatContainer.offsetWidth;
                const maxY = window.innerHeight - DOMElements.chatContainer.offsetHeight;
                DOMElements.chatContainer.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
                DOMElements.chatContainer.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
                DOMElements.chatContainer.style.right = 'auto';
                DOMElements.chatContainer.style.bottom = 'auto';
            }
        }, true);
    };

    // --- Event Listeners ---
    const setupEventListeners = () => {
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await signInWithEmailAndPassword(auth, document.getElementById('loginEmail').value, document.getElementById('loginPassword').value);
            } catch (error) { showToast(error.message, 'error'); }
        });

        document.getElementById('signupForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            try {
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(cred.user, { displayName: name });
                await sendEmailVerification(cred.user);
                showToast('Account created! Please check your email to verify your account.', 'success');
                await signOut(auth);
                document.getElementById('signupForm').classList.add('hidden');
                document.getElementById('loginForm').classList.remove('hidden');
            } catch (error) { showToast(error.message, 'error'); }
        });
        
        document.getElementById('showSignup').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('loginForm').classList.add('hidden'); document.getElementById('signupForm').classList.remove('hidden'); });
        document.getElementById('showLogin').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('signupForm').classList.add('hidden'); document.getElementById('loginForm').classList.remove('hidden'); });
        DOMElements.logoutBtn.addEventListener('click', async () => { await updateUserPresence(false); await signOut(auth); });
        DOMElements.postButton.addEventListener('click', createPost);
        DOMElements.postInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && e.ctrlKey) createPost(); });
        DOMElements.themeToggle.addEventListener('click', toggleTheme);
        DOMElements.notificationsToggle.addEventListener('click', () => DOMElements.notificationsPanel.classList.toggle('hidden'));
        DOMElements.closeChatBtn.addEventListener('click', () => { DOMElements.chatModal.classList.add('hidden'); if (chatListener) chatListener(); if (typingListener) typingListener(); currentChatUser = null; });
        DOMElements.chatInputForm.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(DOMElements.chatInput.value.trim()); });
        DOMElements.chatInput.addEventListener('input', () => { sendTypingIndicator(); clearTimeout(typingTimer); typingTimer = setTimeout(clearTypingIndicator, 3000); });
        DOMElements.changeAvatarBtn.addEventListener('click', () => DOMElements.avatarModal.classList.remove('hidden'));
        DOMElements.cancelAvatarBtn.addEventListener('click', () => DOMElements.avatarModal.classList.add('hidden'));
        DOMElements.uploadAvatarBtn.addEventListener('click', async () => {
            const file = DOMElements.avatarInput.files[0];
            if (!file) return showToast('Please select an image', 'warning');
            try {
                showToast('Uploading...', 'warning');
                const photoURL = await uploadProfilePicture(file);
                [DOMElements.userAvatar, DOMElements.sidebarAvatar, DOMElements.composerAvatar].forEach(el => el.src = photoURL);
                DOMElements.avatarModal.classList.add('hidden');
                showToast('Profile picture updated!');
            } catch (error) { showToast('Failed to update profile picture', 'error'); }
        });
        DOMElements.chatImageBtn.addEventListener('click', () => DOMElements.chatImageInput.click());
        DOMElements.chatImageInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                showToast('Uploading image...', 'warning');
                const imageUrl = await uploadChatImage(file);
                await sendMessage('', imageUrl);
                e.target.value = '';
            } catch (error) { showToast('Failed to upload image', 'error'); }
        });
        document.addEventListener('click', (e) => { if (!e.target.closest('.notification-wrapper')) DOMElements.notificationsPanel.classList.add('hidden'); });
        DOMElements.chatContainer.addEventListener('click', (e) => { if (isDragging) e.stopPropagation(); }, true);
    };

    // --- Initialize App ---
    const startApp = () => {
        applyTheme(localStorage.getItem('theme') || 'light');
        setupEventListeners();
        makeChatDraggable();
        handleAuth();
        document.addEventListener('visibilitychange', () => { if(currentUser) updateUserPresence(!document.hidden); });
        window.addEventListener('beforeunload', () => { if(currentUser) updateUserPresence(false); });
    };

    startApp();
});

