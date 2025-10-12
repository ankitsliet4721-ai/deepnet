// --- Enhanced Firebase Imports with Emergency Reset ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut, 
    sendEmailVerification,
    updateProfile 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    doc, 
    getDoc, 
    deleteDoc, 
    updateDoc, 
    query, 
    orderBy, 
    onSnapshot, 
    serverTimestamp, 
    arrayUnion, 
    arrayRemove, 
    increment, 
    setDoc, 
    where, 
    limit, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL,
    deleteObject 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

// --- Emergency Reset Function (Must be defined first) ---
const emergencyReset = () => {
    console.log('Emergency reset triggered');
    
    // Hide all modals
    const modals = ['loginModal', 'chatModal', 'avatarModal', 'notificationsPanel'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    });
    
    // Clear all backdrop elements
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.classList.add('hidden');
        backdrop.style.display = 'none';
    });
    
    // Re-enable body scrolling
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    
    // Hide loading indicator
    const loading = document.getElementById('loadingIndicator');
    if (loading) loading.classList.add('hidden');
    
    // Hide emergency button
    const emergencyBtn = document.getElementById('emergencyReset');
    if (emergencyBtn) emergencyBtn.style.display = 'none';
    
    // Force show the main app
    const app = document.getElementById('app');
    if (app) {
        app.style.display = 'grid';
        app.style.visibility = 'visible';
    }
    
    showToast('Interface reset successful', 'success');
};

// --- Utility Functions (Must be defined before use) ---
const showToast = (message, type = 'success') => {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.textContent = message;
        notification.className = `toast-notification ${type} show`;
        setTimeout(() => notification.classList.remove('show'), 3000);
    }
};

const showError = (message) => {
    console.error('Error:', message);
    const authError = document.getElementById('authError');
    if (authError) {
        authError.textContent = message;
        authError.classList.remove('hidden');
        setTimeout(() => authError.classList.add('hidden'), 5000);
    }
    showToast(message, 'error');
};

const hideError = () => {
    const authError = document.getElementById('authError');
    if (authError) {
        authError.classList.add('hidden');
    }
};

const showLoading = () => {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.classList.remove('hidden');
    }
};

const hideLoading = () => {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.classList.add('hidden');
    }
};

const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    let date;
    if (timestamp.toDate) {
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        return '';
    }

    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
    });
};

const getChatId = (uid1, uid2) => [uid1, uid2].sort().join('_');

const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-color-scheme', theme);
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.textContent = theme === 'dark' ? 'â˜€ï¸' : 'ðŸŒ™';
    }
    localStorage.setItem('theme', theme);
};

const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-color-scheme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
};

// --- Modal Management Functions ---
const closeAllModals = () => {
    const modals = ['loginModal', 'chatModal', 'avatarModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    });
    
    // Hide notification panel
    const notificationsPanel = document.getElementById('notificationsPanel');
    if (notificationsPanel) {
        notificationsPanel.classList.add('hidden');
    }
};

const openModal = (modalId) => {
    closeAllModals(); // Close other modals first
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
    }
};

// --- App Initialization wrapped in DOMContentLoaded to prevent race conditions ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');

    // Show emergency reset button for 10 seconds
    const emergencyBtn = document.getElementById('emergencyReset');
    if (emergencyBtn) {
        emergencyBtn.style.display = 'block';
        emergencyBtn.onclick = emergencyReset;
        setTimeout(() => {
            emergencyBtn.style.display = 'none';
        }, 10000);
    }

    // --- Firebase Configuration & Initialization ---
    const firebaseConfig = {
        apiKey: "AIzaSyALLWz-xkvroabNu_ug6ZVdDEmNF3O2eJs",
        authDomain: "deep-9656b.firebaseapp.com",
        projectId: "deep-9656b",
        storageBucket: "deep-9656b.firebasestorage.app",
        messagingSenderId: "786248126233",
        appId: "1:786248126233:web:be8ebed2a68281204eff88",
        measurementId: "G-FWC45EBFFP"
    };

    let app, auth, db, storage;
    
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization error:', error);
        showError('Failed to initialize app. Please refresh the page.');
        return;
    }

    // --- Global State ---
    let currentUser = null;
    let postsListener = null, usersListener = null, chatListener = null, typingListener = null, notificationsListener = null;
    let currentChatUser = null;
    let typingTimer = null;
    let isDragging = false;

    // --- DOM Element Cache (Initialized safely after DOM is loaded) ---
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
        closeChatBtn: document.getElementById('closeChatBtn'),
        changeAvatarBtn: document.getElementById('changeAvatarBtn'),
        avatarModal: document.getElementById('avatarModal'),
        avatarInput: document.getElementById('avatarInput'),
        uploadAvatarBtn: document.getElementById('uploadAvatarBtn'),
        cancelAvatarBtn: document.getElementById('cancelAvatarBtn'),
        chatImageBtn: document.getElementById('chatImageBtn'),
        chatImageInput: document.getElementById('chatImageInput'),
        logoutBtn: document.getElementById('logoutBtn'),
        loginForm: document.getElementById('loginForm'),
        signupForm: document.getElementById('signupForm'),
        loginEmail: document.getElementById('loginEmail'),
        loginPassword: document.getElementById('loginPassword'),
        signupName: document.getElementById('signupName'),
        signupEmail: document.getElementById('signupEmail'),
        signupPassword: document.getElementById('signupPassword'),
        showSignup: document.getElementById('showSignup'),
        showLogin: document.getElementById('showLogin'),
        authError: document.getElementById('authError'),
        loadingIndicator: document.getElementById('loadingIndicator'),
        closeLoginModal: document.getElementById('closeLoginModal'),
        closeAvatarModal: document.getElementById('closeAvatarModal')
    };

    // --- Enhanced Profile Picture Upload ---
    const uploadProfilePicture = async (file) => {
        if (!file || !currentUser) return null;

        try {
            const fileRef = ref(storage, `avatars/${currentUser.uid}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(fileRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            // Update user profile in Firebase Auth
            await updateProfile(currentUser, { photoURL: downloadURL });

            // Update user document in Firestore
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
            const downloadURL = await getDownloadURL(snapshot.ref);
            return downloadURL;
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
                senderAvatar: currentUser.photoURL || 'https://via.placeholder.com/40',
                timestamp: serverTimestamp()
            };

            await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);

            // Update chat metadata
            await setDoc(doc(db, 'chats', chatId), {
                participants: [currentUser.uid, currentChatUser.id],
                lastMessage: text.trim() || 'ðŸ“· Image',
                lastMessageTime: serverTimestamp(),
                updatedAt: serverTimestamp()
            }, { merge: true });

            // Clear typing indicator
            clearTypingIndicator();

            // Send notification for new message
            await createNotification(currentChatUser.id, 'message', text.trim() || 'ðŸ“· Image');

            if (DOMElements.chatInput) DOMElements.chatInput.value = '';
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
        } catch (error) {
            console.error('Error sending typing indicator:', error);
        }
    };

    const clearTypingIndicator = async () => {
        if (!currentChatUser || !currentUser) return;
        
        const chatId = getChatId(currentUser.uid, currentChatUser.id);
        
        try {
            await updateDoc(doc(db, 'typing', chatId), {
                [currentUser.uid]: null
            });
        } catch (error) {
            console.error('Error clearing typing indicator:', error);
        }
    };

    const listenForTyping = () => {
        if (!currentChatUser || !currentUser) return;
        
        const chatId = getChatId(currentUser.uid, currentChatUser.id);
        
        if (typingListener) typingListener();
        
        typingListener = onSnapshot(doc(db, 'typing', chatId), (doc) => {
            const data = doc.data();
            if (!data) {
                if (DOMElements.typingIndicator) DOMElements.typingIndicator.classList.add('hidden');
                return;
            }

            const otherUserTyping = Object.keys(data).find(uid => 
                uid !== currentUser.uid && data[uid] && data[uid].timestamp
            );

            if (otherUserTyping) {
                const typingUser = data[otherUserTyping];
                const timeDiff = Date.now() - (typingUser.timestamp?.toDate?.()?.getTime() || 0);
                
                if (timeDiff < 5000) { // Show typing if within last 5 seconds
                    if (DOMElements.typingUserName) DOMElements.typingUserName.textContent = typingUser.name;
                    if (DOMElements.typingIndicator) DOMElements.typingIndicator.classList.remove('hidden');
                } else {
                    if (DOMElements.typingIndicator) DOMElements.typingIndicator.classList.add('hidden');
                }
            } else {
                if (DOMElements.typingIndicator) DOMElements.typingIndicator.classList.add('hidden');
            }
        });
    };

    const openChat = async (user) => {
        currentChatUser = user;
        openModal('chatModal');
        
        if (DOMElements.chatUserAvatar) DOMElements.chatUserAvatar.src = user.photoURL || 'https://via.placeholder.com/32';
        if (DOMElements.chatUserName) DOMElements.chatUserName.textContent = user.displayName;
        if (DOMElements.chatUserStatus) DOMElements.chatUserStatus.textContent = user.isOnline ? 'Online' : 'Offline';

        // Load messages
        loadChatMessages();
        
        // Start listening for typing
        listenForTyping();

        // Mark user as having seen the chat
        const chatId = getChatId(currentUser.uid, user.id);
        try {
            await updateDoc(doc(db, 'chats', chatId), {
                [`seen_${currentUser.uid}`]: serverTimestamp()
            });
        } catch (error) {
            console.error('Error marking chat as seen:', error);
        }
    };

    const loadChatMessages = () => {
        if (!currentChatUser || !currentUser) return;

        const chatId = getChatId(currentUser.uid, currentChatUser.id);

        if (chatListener) chatListener();

        const messagesQuery = query(
            collection(db, 'chats', chatId, 'messages'),
            orderBy('timestamp', 'asc'),
            limit(50)
        );

        chatListener = onSnapshot(messagesQuery, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderMessages(messages);
        });
    };

    const renderMessages = (messages) => {
        if (!DOMElements.messagesList) return;
        
        DOMElements.messagesList.innerHTML = '';

        messages.forEach(message => {
            const messageEl = document.createElement('div');
            messageEl.className = `message ${message.senderId === currentUser.uid ? 'sent' : 'received'}`;

            const avatarEl = document.createElement('img');
            avatarEl.className = 'message-avatar';
            avatarEl.src = message.senderAvatar || 'https://via.placeholder.com/28';
            avatarEl.alt = message.senderName;

            const bubbleEl = document.createElement('div');
            bubbleEl.className = 'message-bubble';

            if (message.imageUrl) {
                const imageEl = document.createElement('img');
                imageEl.className = 'message-image';
                imageEl.src = message.imageUrl;
                imageEl.alt = 'Shared image';
                imageEl.onclick = () => window.open(message.imageUrl, '_blank');
                bubbleEl.appendChild(imageEl);
            }

            if (message.text) {
                const textEl = document.createElement('div');
                textEl.textContent = message.text;
                bubbleEl.appendChild(textEl);
            }

            const timeEl = document.createElement('span');
            timeEl.className = 'message-time';
            timeEl.textContent = formatTime(message.timestamp);
            bubbleEl.appendChild(timeEl);

            messageEl.appendChild(avatarEl);
            messageEl.appendChild(bubbleEl);

            DOMElements.messagesList.appendChild(messageEl);
        });

        // Scroll to bottom
        if (DOMElements.messagesContainer) {
            DOMElements.messagesContainer.scrollTop = DOMElements.messagesContainer.scrollHeight;
        }
    };

    // --- Enhanced Notification System ---
    const createNotification = async (recipientId, type, contentSnippet = null, postId = null) => {
        if (recipientId === currentUser.uid) return;

        try {
            await addDoc(collection(db, 'notifications'), {
                recipientId,
                senderId: currentUser.uid,
                senderName: currentUser.displayName,
                senderAvatar: currentUser.photoURL || 'https://via.placeholder.com/40',
                type,
                contentSnippet,
                postId,
                read: false,
                createdAt: serverTimestamp()
            });
        } catch (e) {
            console.error("Notification Error:", e);
        }
    };

    const listenForNotifications = () => {
        if (notificationsListener) notificationsListener();

        const q = query(
            collection(db, 'notifications'),
            where('recipientId', '==', currentUser.uid),
            orderBy('createdAt', 'desc'),
            limit(10)
        );

        notificationsListener = onSnapshot(q, snapshot => {
            const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            const unread = notifs.filter(n => !n.read).length;

            if (DOMElements.notificationCount) {
                DOMElements.notificationCount.textContent = unread;
                DOMElements.notificationCount.classList.toggle('hidden', unread === 0);
            }

            renderNotifications(notifs);
        });
    };

    const renderNotifications = (notifs) => {
        if (!DOMElements.notificationsList) return;
        
        const list = DOMElements.notificationsList;
        list.innerHTML = '';

        if (notifs.length === 0) {
            list.innerHTML = '<div class="no-notifications">No notifications yet</div>';
            return;
        }

        notifs.forEach(notif => {
            const item = document.createElement('div');
            item.className = `notification-item ${!notif.read ? 'unread' : ''}`;
            item.dataset.notificationId = notif.id;

            const icon = getNotificationIcon(notif.type);
            
            item.innerHTML = `
                <div class="notification-item-icon">${icon}</div>
                <div style="flex: 1;">
                    <div><strong>${notif.senderName}</strong> ${getNotificationText(notif.type, notif.contentSnippet)}</div>
                    <div class="notification-item-time">${formatTime(notif.createdAt)}</div>
                </div>
            `;

            item.onclick = () => markNotificationAsRead(notif.id);
            list.appendChild(item);
        });
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'like': return 'â¤ï¸';
            case 'comment': return 'ðŸ’¬';
            case 'message': return 'ðŸ“©';
            case 'follow': return 'ðŸ‘¥';
            default: return 'ðŸ””';
        }
    };

    const getNotificationText = (type, content) => {
        switch (type) {
            case 'like': return 'liked your post';
            case 'comment': return `commented: "${content}"`;
            case 'message': return `sent you a message: "${content}"`;
            case 'follow': return 'started following you';
            default: return 'sent you a notification';
        }
    };

    const markNotificationAsRead = async (notificationId) => {
        try {
            await updateDoc(doc(db, 'notifications', notificationId), { read: true });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    // --- Enhanced Online Users ---
    const listenForOnlineUsers = () => {
        if (usersListener) usersListener();

        const q = query(
            collection(db, 'users'),
            where('isOnline', '==', true),
            limit(20)
        );

        usersListener = onSnapshot(q, snapshot => {
            const users = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(user => user.id !== currentUser.uid);

            renderOnlineUsers(users);
        });
    };

    const renderOnlineUsers = (users) => {
        if (!DOMElements.onlineUsersList) return;
        
        DOMElements.onlineUsersList.innerHTML = '';

        if (users.length === 0) {
            DOMElements.onlineUsersList.innerHTML = '<div style="color: var(--color-text-secondary); font-size: 12px; padding: 8px;">No other users online</div>';
            return;
        }

        users.forEach(user => {
            const userEl = document.createElement('div');
            userEl.className = 'online-user-item';
            userEl.onclick = () => openChat(user);

            userEl.innerHTML = `
                <div class="online-user-avatar">
                    <img src="${user.photoURL || 'https://via.placeholder.com/32'}" alt="${user.displayName}">
                    <div class="online-indicator"></div>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${user.displayName}
                    </div>
                    <div style="font-size: 12px; color: var(--color-text-secondary);">
                        ${user.status || 'Online'}
                    </div>
                </div>
            `;

            DOMElements.onlineUsersList.appendChild(userEl);
        });
    };

    // --- Enhanced Posts System ---
    const createPost = async () => {
        if (!DOMElements.postInput) return;
        
        const text = DOMElements.postInput.value.trim();
        if (!text || !currentUser) return;

        try {
            await addDoc(collection(db, 'posts'), {
                text,
                author: currentUser.displayName,
                authorId: currentUser.uid,
                authorAvatar: currentUser.photoURL || 'https://via.placeholder.com/40',
                likes: [],
                comments: [],
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

        const q = query(
            collection(db, 'posts'),
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        postsListener = onSnapshot(q, snapshot => {
            const posts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            renderPosts(posts);
        });
    };

    const renderPosts = (posts) => {
        if (!DOMElements.postsContainer) return;
        
        DOMElements.postsContainer.innerHTML = '';

        if (posts.length === 0) {
            DOMElements.postsContainer.innerHTML = `
                <div class="card" style="padding: 24px; text-align: center; color: var(--color-text-secondary);">
                    <h3>Welcome to DeepNet Social!</h3>
                    <p>Be the first to share something with the community.</p>
                </div>
            `;
            return;
        }

        posts.forEach(post => {
            const postEl = document.createElement('article');
            postEl.className = 'post card';

            const isLiked = post.likes?.includes(currentUser.uid);
            const likeCount = post.likes?.length || 0;
            const commentCount = post.comments?.length || 0;

            postEl.innerHTML = `
                <div class="post-header">
                    <div class="post-author-info">
                        <img src="${post.authorAvatar}" alt="${post.author}" class="user-avatar">
                        <div>
                            <div style="font-weight: 600;">${post.author}</div>
                            <div style="font-size: 12px; color: var(--color-text-secondary);">${formatTime(post.createdAt)}</div>
                        </div>
                    </div>
                </div>
                
                <div style="margin: 12px 0;">${post.text}</div>
                
                <div class="post-stats">
                    <span>${likeCount} likes</span>
                    <span>${commentCount} comments</span>
                </div>
                
                <div class="post-actions">
                    <button class="post-action ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}')">
                        ${isLiked ? 'â¤ï¸' : 'ðŸ¤'} Like
                    </button>
                    <button class="post-action" onclick="toggleComments('${post.id}')">
                        ðŸ’¬ Comment
                    </button>
                    <button class="post-action">
                        ðŸ”— Share
                    </button>
                </div>
                
                <div id="comments-${post.id}" class="comments hidden">
                    <div class="comment-form">
                        <input type="text" class="comment-input" placeholder="Write a comment..." onkeypress="if(event.key==='Enter') addComment('${post.id}', this.value); this.value='';">
                        <button class="btn-secondary" onclick="addComment('${post.id}', document.querySelector('#comments-${post.id} .comment-input').value)">Post</button>
                    </div>
                    <div class="comments-list">
                        ${post.comments?.map(comment => `
                            <div class="comment-item">
                                <img src="${comment.authorAvatar}" alt="${comment.author}" class="comment-avatar">
                                <div class="comment-body">
                                    <strong>${comment.author}</strong> ${comment.text}
                                    <div style="font-size: 10px; color: var(--color-text-secondary); margin-top: 4px;">${formatTime(comment.createdAt)}</div>
                                </div>
                            </div>
                        `).join('') || ''}
                    </div>
                </div>
            `;

            DOMElements.postsContainer.appendChild(postEl);
        });
    };

    // Global functions for post interactions
    window.toggleLike = async (postId) => {
        try {
            const postRef = doc(db, 'posts', postId);
            const postSnap = await getDoc(postRef);
            const post = postSnap.data();

            const isLiked = post.likes?.includes(currentUser.uid);

            if (isLiked) {
                await updateDoc(postRef, {
                    likes: arrayRemove(currentUser.uid)
                });
            } else {
                await updateDoc(postRef, {
                    likes: arrayUnion(currentUser.uid)
                });
                // Send notification to post author
                if (post.authorId !== currentUser.uid) {
                    await createNotification(post.authorId, 'like', null, postId);
                }
            }
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    };

    window.toggleComments = (postId) => {
        const commentsEl = document.getElementById(`comments-${postId}`);
        if (commentsEl) commentsEl.classList.toggle('hidden');
    };

    window.addComment = async (postId, text) => {
        if (!text.trim()) return;

        try {
            const comment = {
                text: text.trim(),
                author: currentUser.displayName,
                authorId: currentUser.uid,
                authorAvatar: currentUser.photoURL || 'https://via.placeholder.com/32',
                createdAt: serverTimestamp()
            };

            const postRef = doc(db, 'posts', postId);
            await updateDoc(postRef, {
                comments: arrayUnion(comment)
            });

            // Send notification to post author
            const postSnap = await getDoc(postRef);
            const post = postSnap.data();
            if (post.authorId !== currentUser.uid) {
                await createNotification(post.authorId, 'comment', text.trim(), postId);
            }

            // Clear input
            const input = document.querySelector(`#comments-${postId} .comment-input`);
            if (input) input.value = '';

        } catch (error) {
            console.error('Error adding comment:', error);
        }
    };

    // --- Authentication System ---
    const handleLogin = async (e) => {
        e.preventDefault();
        hideError();
        
        const email = DOMElements.loginEmail?.value.trim();
        const password = DOMElements.loginPassword?.value.trim();

        if (!email || !password) {
            showError('Please fill in all fields');
            return;
        }

        console.log('Attempting login for:', email);
        showLoading();

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('Login successful:', userCredential.user.email);
            showToast('Welcome back!');
        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = 'Login failed. Please try again.';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'No account found with this email.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Invalid password.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many failed attempts. Please try again later.';
                    break;
                default:
                    errorMessage = error.message;
            }
            
            showError(errorMessage);
        } finally {
            hideLoading();
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        hideError();
        
        const name = DOMElements.signupName?.value.trim();
        const email = DOMElements.signupEmail?.value.trim();
        const password = DOMElements.signupPassword?.value.trim();

        if (!name || !email || !password) {
            showError('Please fill in all fields');
            return;
        }

        if (password.length < 6) {
            showError('Password must be at least 6 characters long');
            return;
        }

        console.log('Attempting signup for:', email);
        showLoading();

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log('Signup successful:', userCredential.user.email);
            
            // Update profile
            await updateProfile(userCredential.user, {
                displayName: name
            });

            // Create user document in Firestore
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                displayName: name,
                email: email,
                photoURL: null,
                isOnline: true,
                status: 'Online',
                createdAt: serverTimestamp(),
                lastSeen: serverTimestamp()
            });

            showToast('Account created successfully!');
        } catch (error) {
            console.error('Signup error:', error);
            let errorMessage = 'Account creation failed. Please try again.';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'An account with this email already exists.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password is too weak. Use at least 6 characters.';
                    break;
                default:
                    errorMessage = error.message;
            }
            
            showError(errorMessage);
        } finally {
            hideLoading();
        }
    };

    const handleLogout = async () => {
        try {
            if (currentUser) {
                // Set user as offline
                await updateDoc(doc(db, 'users', currentUser.uid), {
                    isOnline: false,
                    lastSeen: serverTimestamp()
                });
            }
            
            await signOut(auth);
            showToast('Logged out successfully');
        } catch (error) {
            console.error('Logout error:', error);
            showError('Failed to logout');
        }
    };

    const handleAuth = () => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                currentUser = user;
                closeAllModals();

                // Update UI
                const avatarUrl = user.photoURL || 'https://via.placeholder.com/40';
                if (DOMElements.userAvatar) DOMElements.userAvatar.src = avatarUrl;
                if (DOMElements.sidebarAvatar) DOMElements.sidebarAvatar.src = avatarUrl;
                if (DOMElements.composerAvatar) DOMElements.composerAvatar.src = avatarUrl;
                if (DOMElements.profileName) DOMElements.profileName.textContent = user.displayName || 'Anonymous User';
                if (DOMElements.status) DOMElements.status.textContent = 'Online';

                // Set user as online
                await setDoc(doc(db, 'users', user.uid), {
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    isOnline: true,
                    lastSeen: serverTimestamp(),
                    status: 'Online'
                }, { merge: true });

                // Start listening for data
                listenForPosts();
                listenForOnlineUsers();
                listenForNotifications();

                // Apply saved theme
                const savedTheme = localStorage.getItem('theme') || 'light';
                applyTheme(savedTheme);
            } else {
                currentUser = null;
                openModal('loginModal');
                
                // Clean up listeners
                if (postsListener) postsListener();
                if (usersListener) usersListener();
                if (chatListener) chatListener();
                if (typingListener) typingListener();
                if (notificationsListener) notificationsListener();
            }
        });
    };

    // --- Drag & Drop Chat Window ---
    const makeChatDraggable = () => {
        let isDown = false;
        let offset = [0, 0];

        if (!DOMElements.chatHeader) return;

        DOMElements.chatHeader.addEventListener('mousedown', (e) => {
            isDown = true;
            isDragging = false;
            offset = [
                DOMElements.chatContainer?.offsetLeft - e.clientX || 0,
                DOMElements.chatContainer?.offsetTop - e.clientY || 0
            ];
        });

        document.addEventListener('mouseup', () => {
            isDown = false;
            setTimeout(() => isDragging = false, 100);
        });

        document.addEventListener('mousemove', (e) => {
            if (isDown && DOMElements.chatContainer) {
                isDragging = true;
                const x = e.clientX + offset[0];
                const y = e.clientY + offset[1];
                
                // Constrain to viewport
                const maxX = window.innerWidth - DOMElements.chatContainer.offsetWidth;
                const maxY = window.innerHeight - DOMElements.chatContainer.offsetHeight;
                
                DOMElements.chatContainer.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
                DOMElements.chatContainer.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
                DOMElements.chatContainer.style.right = 'auto';
                DOMElements.chatContainer.style.bottom = 'auto';
            }
        });
    };

    // --- Event Listeners ---
    const setupEventListeners = () => {
        // Authentication
        if (DOMElements.loginForm) {
            DOMElements.loginForm.addEventListener('submit', handleLogin);
        }

        if (DOMElements.signupForm) {
            DOMElements.signupForm.addEventListener('submit', handleSignup);
        }

        // Auth form toggle
        if (DOMElements.showSignup) {
            DOMElements.showSignup.addEventListener('click', (e) => {
                e.preventDefault();
                if (DOMElements.loginForm) DOMElements.loginForm.classList.add('hidden');
                if (DOMElements.signupForm) DOMElements.signupForm.classList.remove('hidden');
            });
        }

        if (DOMElements.showLogin) {
            DOMElements.showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                if (DOMElements.signupForm) DOMElements.signupForm.classList.add('hidden');
                if (DOMElements.loginForm) DOMElements.loginForm.classList.remove('hidden');
            });
        }

        // Modal close buttons
        if (DOMElements.closeLoginModal) {
            DOMElements.closeLoginModal.addEventListener('click', () => {
                closeAllModals();
            });
        }

        if (DOMElements.closeAvatarModal) {
            DOMElements.closeAvatarModal.addEventListener('click', () => {
                closeAllModals();
            });
        }

        // Backdrop click to close modals
        if (DOMElements.loginModal) {
            DOMElements.loginModal.addEventListener('click', (e) => {
                if (e.target === DOMElements.loginModal) {
                    closeAllModals();
                }
            });
        }

        if (DOMElements.avatarModal) {
            DOMElements.avatarModal.addEventListener('click', (e) => {
                if (e.target === DOMElements.avatarModal) {
                    closeAllModals();
                }
            });
        }

        // Logout
        if (DOMElements.logoutBtn) {
            DOMElements.logoutBtn.addEventListener('click', handleLogout);
        }

        // Posts
        if (DOMElements.postButton) {
            DOMElements.postButton.addEventListener('click', createPost);
        }

        if (DOMElements.postInput) {
            DOMElements.postInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) createPost();
            });
        }

        // Theme toggle
        if (DOMElements.themeToggle) {
            DOMElements.themeToggle.addEventListener('click', toggleTheme);
        }

        // Notifications toggle
        if (DOMElements.notificationsToggle) {
            DOMElements.notificationsToggle.addEventListener('click', () => {
                if (DOMElements.notificationsPanel) {
                    DOMElements.notificationsPanel.classList.toggle('hidden');
                }
            });
        }

        // Chat
        if (DOMElements.closeChatBtn) {
            DOMElements.closeChatBtn.addEventListener('click', () => {
                closeAllModals();
                if (chatListener) chatListener();
                if (typingListener) typingListener();
                currentChatUser = null;
            });
        }

        if (DOMElements.chatInputForm) {
            DOMElements.chatInputForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const text = DOMElements.chatInput?.value.trim();
                if (text) sendMessage(text);
            });
        }

        // Chat typing indicator
        if (DOMElements.chatInput) {
            DOMElements.chatInput.addEventListener('input', () => {
                sendTypingIndicator();
                
                clearTimeout(typingTimer);
                typingTimer = setTimeout(() => {
                    clearTypingIndicator();
                }, 3000);
            });
        }

        // Profile picture change
        if (DOMElements.changeAvatarBtn) {
            DOMElements.changeAvatarBtn.addEventListener('click', () => {
                openModal('avatarModal');
            });
        }

        if (DOMElements.cancelAvatarBtn) {
            DOMElements.cancelAvatarBtn.addEventListener('click', () => {
                closeAllModals();
            });
        }

        if (DOMElements.uploadAvatarBtn) {
            DOMElements.uploadAvatarBtn.addEventListener('click', async () => {
                const file = DOMElements.avatarInput?.files[0];
                if (!file) {
                    showToast('Please select an image', 'warning');
                    return;
                }

                try {
                    showToast('Uploading...', 'warning');
                    const photoURL = await uploadProfilePicture(file);
                    
                    // Update UI
                    if (DOMElements.userAvatar) DOMElements.userAvatar.src = photoURL;
                    if (DOMElements.sidebarAvatar) DOMElements.sidebarAvatar.src = photoURL;
                    if (DOMElements.composerAvatar) DOMElements.composerAvatar.src = photoURL;
                    
                    closeAllModals();
                    showToast('Profile picture updated!');
                } catch (error) {
                    showToast('Failed to update profile picture', 'error');
                }
            });
        }

        // Chat image sharing
        if (DOMElements.chatImageBtn) {
            DOMElements.chatImageBtn.addEventListener('click', () => {
                if (DOMElements.chatImageInput) DOMElements.chatImageInput.click();
            });
        }

        if (DOMElements.chatImageInput) {
            DOMElements.chatImageInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                try {
                    showToast('Uploading image...', 'warning');
                    const imageUrl = await uploadChatImage(file);
                    await sendMessage('', imageUrl);
                    e.target.value = ''; // Reset input
                } catch (error) {
                    showToast('Failed to upload image', 'error');
                }
            });
        }

        // Close panels when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.notification-wrapper') && DOMElements.notificationsPanel) {
                DOMElements.notificationsPanel.classList.add('hidden');
            }
        });

        // Prevent chat from closing when dragging
        if (DOMElements.chatContainer) {
            DOMElements.chatContainer.addEventListener('click', (e) => {
                if (isDragging) e.stopPropagation();
            });
        }

        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeAllModals();
            }
        });
    };

    // --- Initialize App ---
    const initializeApp = () => {
        // Apply saved theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        applyTheme(savedTheme);

        // Set up event listeners
        setupEventListeners();

        // Make chat draggable
        makeChatDraggable();

        // Handle authentication state
        handleAuth();

        // Handle page visibility for presence
        document.addEventListener('visibilitychange', () => {
            if (currentUser) {
                updateUserPresence(!document.hidden);
            }
        });

        // Handle page unload
        window.addEventListener('beforeunload', () => {
            if (currentUser) {
                updateUserPresence(false);
            }
        });
    };

    // Start the app
    initializeApp();
});
