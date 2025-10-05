// --- Firebase Imports with proper error handling ---
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

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing app...');

    // --- Firebase Configuration ---
    const firebaseConfig = {
        apiKey: "AIzaSyALLWz-xkvroabNu_ug6ZVdDEmNF3O2eJs",
        authDomain: "deep-9656b.firebaseapp.com",
        projectId: "deep-9656b",
        storageBucket: "deep-9656b.firebasestorage.app",
        messagingSenderId: "786248126233",
        appId: "1:786248126233:web:be8ebed2a68281204eff88",
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

    // --- DOM Elements Cache ---
    const elements = {
        // Auth elements
        loginModal: document.getElementById('loginModal'),
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
        
        // Main app elements
        app: document.getElementById('app'),
        userAvatar: document.getElementById('userAvatar'),
        sidebarAvatar: document.getElementById('sidebarAvatar'),
        composerAvatar: document.getElementById('composerAvatar'),
        profileName: document.getElementById('profileName'),
        status: document.getElementById('status'),
        postsContainer: document.getElementById('postsContainer'),
        postInput: document.getElementById('postInput'),
        postButton: document.getElementById('postButton'),
        onlineUsersList: document.getElementById('onlineUsersList'),
        logoutBtn: document.getElementById('logoutBtn'),
        
        // Chat elements
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
        closeChatBtn: document.getElementById('closeChatBtn'),
        chatImageBtn: document.getElementById('chatImageBtn'),
        chatImageInput: document.getElementById('chatImageInput'),
        
        // Other elements
        notification: document.getElementById('notification'),
        themeToggle: document.getElementById('themeToggle'),
        notificationsToggle: document.getElementById('notificationsToggle'),
        notificationCount: document.getElementById('notificationCount'),
        notificationsPanel: document.getElementById('notificationsPanel'),
        notificationsList: document.getElementById('notificationsList'),
        changeAvatarBtn: document.getElementById('changeAvatarBtn'),
        avatarModal: document.getElementById('avatarModal'),
        avatarInput: document.getElementById('avatarInput'),
        uploadAvatarBtn: document.getElementById('uploadAvatarBtn'),
        cancelAvatarBtn: document.getElementById('cancelAvatarBtn'),
        loadingIndicator: document.getElementById('loadingIndicator')
    };

    // --- Utility Functions ---
    const showToast = (message, type = 'success') => {
        console.log(`Toast: ${message} (${type})`);
        if (elements.notification) {
            elements.notification.textContent = message;
            elements.notification.className = `toast-notification ${type} show`;
            setTimeout(() => {
                elements.notification.classList.remove('show');
            }, 4000);
        }
    };

    const showError = (message) => {
        console.error('Error:', message);
        if (elements.authError) {
            elements.authError.textContent = message;
            elements.authError.classList.remove('hidden');
            setTimeout(() => {
                elements.authError.classList.add('hidden');
            }, 5000);
        }
        showToast(message, 'error');
    };

    const hideError = () => {
        if (elements.authError) {
            elements.authError.classList.add('hidden');
        }
    };

    const showLoading = () => {
        if (elements.loadingIndicator) {
            elements.loadingIndicator.classList.remove('hidden');
        }
    };

    const hideLoading = () => {
        if (elements.loadingIndicator) {
            elements.loadingIndicator.classList.add('hidden');
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

    // --- Authentication Functions ---
    const handleLogin = async (e) => {
        e.preventDefault();
        hideError();
        
        const email = elements.loginEmail.value.trim();
        const password = elements.loginPassword.value.trim();

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
        
        const name = elements.signupName.value.trim();
        const email = elements.signupEmail.value.trim();
        const password = elements.signupPassword.value.trim();

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

    // --- Posts Functions ---
    const createPost = async () => {
        if (!currentUser || !elements.postInput) return;
        
        const text = elements.postInput.value.trim();
        if (!text) {
            showError('Please write something to post');
            return;
        }

        try {
            await addDoc(collection(db, 'posts'), {
                text,
                author: currentUser.displayName || 'Anonymous',
                authorId: currentUser.uid,
                authorAvatar: currentUser.photoURL || 'https://via.placeholder.com/40',
                likes: [],
                comments: [],
                createdAt: serverTimestamp()
            });

            elements.postInput.value = '';
            showToast('Post created successfully!');
        } catch (error) {
            console.error('Error creating post:', error);
            showError('Failed to create post');
        }
    };

    const listenForPosts = () => {
        if (!currentUser) return;
        
        if (postsListener) postsListener();

        const q = query(
            collection(db, 'posts'),
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        postsListener = onSnapshot(q, (snapshot) => {
            const posts = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));
            renderPosts(posts);
        }, (error) => {
            console.error('Error listening for posts:', error);
        });
    };

    const renderPosts = (posts) => {
        if (!elements.postsContainer) return;
        
        elements.postsContainer.innerHTML = '';

        if (posts.length === 0) {
            elements.postsContainer.innerHTML = `
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
                        <img src="${post.authorAvatar || 'https://via.placeholder.com/40'}" 
                             alt="${post.author}" class="user-avatar">
                        <div>
                            <div style="font-weight: 600;">${post.author}</div>
                            <div style="font-size: 12px; color: var(--color-text-secondary);">
                                ${formatTime(post.createdAt)}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="margin: 12px 0; white-space: pre-wrap;">${post.text}</div>
                
                <div class="post-stats">
                    <span>${likeCount} likes</span>
                    <span>${commentCount} comments</span>
                </div>
                
                <div class="post-actions">
                    <button class="post-action ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}')">
                        ${isLiked ? '❤️' : '🤍'} Like
                    </button>
                    <button class="post-action" onclick="toggleComments('${post.id}')">
                        💬 Comment
                    </button>
                </div>
                
                <div id="comments-${post.id}" class="comments hidden">
                    <div class="comment-form">
                        <input type="text" class="comment-input" placeholder="Write a comment..." 
                               onkeypress="if(event.key==='Enter') addComment('${post.id}', this.value)">
                        <button class="btn-secondary" onclick="addComment('${post.id}', this.parentElement.querySelector('.comment-input').value)">
                            Post
                        </button>
                    </div>
                </div>
            `;

            elements.postsContainer.appendChild(postEl);
        });
    };

    // --- Online Users Functions ---
    const listenForOnlineUsers = () => {
        if (!currentUser) return;
        
        if (usersListener) usersListener();

        const q = query(
            collection(db, 'users'),
            where('isOnline', '==', true),
            limit(20)
        );

        usersListener = onSnapshot(q, (snapshot) => {
            const users = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(user => user.id !== currentUser.uid);

            renderOnlineUsers(users);
        }, (error) => {
            console.error('Error listening for online users:', error);
        });
    };

    const renderOnlineUsers = (users) => {
        if (!elements.onlineUsersList) return;
        
        elements.onlineUsersList.innerHTML = '';

        if (users.length === 0) {
            elements.onlineUsersList.innerHTML = `
                <div style="color: var(--color-text-secondary); font-size: 12px; padding: 8px;">
                    No other users online
                </div>
            `;
            return;
        }

        users.forEach(user => {
            const userEl = document.createElement('div');
            userEl.className = 'online-user-item';
            userEl.onclick = () => openChat(user);

            userEl.innerHTML = `
                <div class="online-user-avatar">
                    <img src="${user.photoURL || 'https://via.placeholder.com/32'}" 
                         alt="${user.displayName}">
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

            elements.onlineUsersList.appendChild(userEl);
        });
    };

    // --- Chat Functions ---
    const openChat = (user) => {
        currentChatUser = user;
        
        if (elements.chatModal) {
            elements.chatModal.classList.remove('hidden');
        }
        
        if (elements.chatUserAvatar) {
            elements.chatUserAvatar.src = user.photoURL || 'https://via.placeholder.com/32';
        }
        if (elements.chatUserName) {
            elements.chatUserName.textContent = user.displayName;
        }
        if (elements.chatUserStatus) {
            elements.chatUserStatus.textContent = user.isOnline ? 'Online' : 'Offline';
        }

        // Load messages (simplified for basic functionality)
        if (elements.messagesList) {
            elements.messagesList.innerHTML = `
                <div class="message received">
                    <img src="${user.photoURL || 'https://via.placeholder.com/28'}" 
                         alt="${user.displayName}" class="message-avatar">
                    <div class="message-bubble">
                        <div>Hi! This is a demo message. Real-time chat is available in the full version.</div>
                        <span class="message-time">Just now</span>
                    </div>
                </div>
            `;
        }
    };

    // --- Theme Functions ---
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-color-scheme', theme);
        if (elements.themeToggle) {
            elements.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
        localStorage.setItem('theme', theme);
    };

    const toggleTheme = () => {
        const currentTheme = document.documentElement.getAttribute('data-color-scheme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    };

    // --- Global functions for post interactions ---
    window.toggleLike = async (postId) => {
        if (!currentUser) return;
        console.log('Toggle like for post:', postId);
        // Implementation would go here
    };

    window.toggleComments = (postId) => {
        const commentsEl = document.getElementById(`comments-${postId}`);
        if (commentsEl) {
            commentsEl.classList.toggle('hidden');
        }
    };

    window.addComment = async (postId, text) => {
        if (!currentUser || !text.trim()) return;
        console.log('Add comment to post:', postId, text);
        // Implementation would go here
    };

    // --- Auth State Handler ---
    const handleAuthState = () => {
        onAuthStateChanged(auth, async (user) => {
            console.log('Auth state changed:', user ? user.email : 'No user');
            
            if (user) {
                currentUser = user;
                console.log('User logged in:', user.email);
                
                // Hide login modal
                if (elements.loginModal) {
                    elements.loginModal.classList.add('hidden');
                }
                
                // Update UI
                const avatarUrl = user.photoURL || 'https://via.placeholder.com/40';
                if (elements.userAvatar) elements.userAvatar.src = avatarUrl;
                if (elements.sidebarAvatar) elements.sidebarAvatar.src = avatarUrl;
                if (elements.composerAvatar) elements.composerAvatar.src = avatarUrl;
                if (elements.profileName) elements.profileName.textContent = user.displayName || 'Anonymous User';
                if (elements.status) elements.status.textContent = 'Online';

                // Update user status in Firestore
                try {
                    await setDoc(doc(db, 'users', user.uid), {
                        displayName: user.displayName,
                        email: user.email,
                        photoURL: user.photoURL,
                        isOnline: true,
                        lastSeen: serverTimestamp(),
                        status: 'Online'
                    }, { merge: true });
                } catch (error) {
                    console.error('Error updating user status:', error);
                }

                // Start listening for data
                listenForPosts();
                listenForOnlineUsers();

            } else {
                currentUser = null;
                console.log('User logged out');
                
                // Show login modal
                if (elements.loginModal) {
                    elements.loginModal.classList.remove('hidden');
                }
                
                // Clean up listeners
                if (postsListener) postsListener();
                if (usersListener) usersListener();
                if (chatListener) chatListener();
                if (typingListener) typingListener();
                if (notificationsListener) notificationsListener();
            }
        });
    };

    // --- Event Listeners Setup ---
    const setupEventListeners = () => {
        console.log('Setting up event listeners...');
        
        // Authentication forms
        if (elements.loginForm) {
            elements.loginForm.addEventListener('submit', handleLogin);
        } else {
            console.warn('Login form not found');
        }

        if (elements.signupForm) {
            elements.signupForm.addEventListener('submit', handleSignup);
        } else {
            console.warn('Signup form not found');
        }

        // Form toggle links
        if (elements.showSignup) {
            elements.showSignup.addEventListener('click', (e) => {
                e.preventDefault();
                if (elements.loginForm) elements.loginForm.classList.add('hidden');
                if (elements.signupForm) elements.signupForm.classList.remove('hidden');
                hideError();
            });
        }

        if (elements.showLogin) {
            elements.showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                if (elements.signupForm) elements.signupForm.classList.add('hidden');
                if (elements.loginForm) elements.loginForm.classList.remove('hidden');
                hideError();
            });
        }

        // Other buttons
        if (elements.logoutBtn) {
            elements.logoutBtn.addEventListener('click', handleLogout);
        }

        if (elements.postButton) {
            elements.postButton.addEventListener('click', createPost);
        }

        if (elements.postInput) {
            elements.postInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    createPost();
                }
            });
        }

        if (elements.themeToggle) {
            elements.themeToggle.addEventListener('click', toggleTheme);
        }

        if (elements.closeChatBtn) {
            elements.closeChatBtn.addEventListener('click', () => {
                if (elements.chatModal) {
                    elements.chatModal.classList.add('hidden');
                }
                currentChatUser = null;
            });
        }

        // Chat form
        if (elements.chatInputForm) {
            elements.chatInputForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (elements.chatInput) {
                    const text = elements.chatInput.value.trim();
                    if (text) {
                        console.log('Send message:', text);
                        elements.chatInput.value = '';
                    }
                }
            });
        }

        console.log('Event listeners set up successfully');
    };

    // --- Initialize App ---
    const initializeApp = () => {
        console.log('Initializing app...');
        
        // Apply saved theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        applyTheme(savedTheme);

        // Set up event listeners
        setupEventListeners();

        // Handle authentication state
        handleAuthState();

        // Handle page visibility for presence
        document.addEventListener('visibilitychange', async () => {
            if (currentUser) {
                try {
                    await updateDoc(doc(db, 'users', currentUser.uid), {
                        isOnline: !document.hidden,
                        lastSeen: serverTimestamp()
                    });
                } catch (error) {
                    console.error('Error updating presence:', error);
                }
            }
        });

        // Handle page unload
        window.addEventListener('beforeunload', async () => {
            if (currentUser) {
                try {
                    await updateDoc(doc(db, 'users', currentUser.uid), {
                        isOnline: false,
                        lastSeen: serverTimestamp()
                    });
                } catch (error) {
                    console.error('Error updating presence on unload:', error);
                }
            }
        });

        console.log('App initialized successfully');
    };

    // Start the app
    initializeApp();
});
