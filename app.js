// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  sendEmailVerification
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

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyALLWz-xkvroabNu_ug6ZVdDEmNF3O2eJs",
  authDomain: "deep-9656b.firebaseapp.com",
  projectId: "deep-9656b",
  storageBucket: "deep-9656b.firebasestorage.app",
  messagingSenderId: "786248126233",
  appId: "1:786248126233:web:be8ebed2a68281204eff88",
  measurementId: "G-FWC45EBFFP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global Variables
let currentUser = null;
let postsListenerUnsubscribe = null;
let onlineUsersListener = null;
let currentChatUser = null;
let messagesListener = null;
let typingTimer = null;
let typingListener = null;

// DOM Elements
const loginModal = document.getElementById('loginModal');
const appDiv = document.getElementById('app');
const userAvatar = document.getElementById('userAvatar');
const sidebarAvatar = document.getElementById('sidebarAvatar');
const composerAvatar = document.getElementById('composerAvatar');
const profileName = document.getElementById('profileName');
const status = document.getElementById('status');
const postsContainer = document.getElementById('postsContainer');
const postInput = document.getElementById('postInput');
const postButton = document.getElementById('postButton');
const onlineUsersList = document.getElementById('onlineUsersList');
const chatModal = document.getElementById('chatModal');
const chatUserAvatar = document.getElementById('chatUserAvatar');
const chatUserName = document.getElementById('chatUserName');
const chatUserStatus = document.getElementById('chatUserStatus');
const messagesContainer = document.getElementById('messagesContainer');
const messagesList = document.getElementById('messagesList');
const chatInput = document.getElementById('chatInput');
const chatInputForm = document.getElementById('chatInputForm');
const typingIndicator = document.getElementById('typingIndicator');
const typingUserName = document.getElementById('typingUserName');

// --- Utility Functions ---
function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  if (!notification) return;
  
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.classList.add('show');
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

function updateStatus(message, type = 'online') {
  if (status) {
    status.textContent = message;
    status.className = `status ${type}`;
  }
}

function formatTime(timestamp) {
  if (!timestamp?.toDate) return 'a moment ago';
  const date = timestamp.toDate();
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return date.toLocaleDateString('en-IN');
}

function formatMessageTime(timestamp) {
  if (!timestamp?.toDate) return '';
  const date = timestamp.toDate();
  const now = new Date();
  
  if (now.toDateString() === date.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

function getChatId(userId1, userId2) {
  return [userId1, userId2].sort().join('_');
}

// --- User Presence Functions ---
async function updateUserPresence(isOnline) {
  if (!currentUser) return;
  
  try {
    await setDoc(doc(db, 'users', currentUser.uid), {
      uid: currentUser.uid,
      displayName: currentUser.displayName || currentUser.email.split('@')[0],
      email: currentUser.email,
      photoURL: currentUser.photoURL || `https://i.pravatar.cc/40?u=${currentUser.uid}`,
      presence: {
        state: isOnline ? 'online' : 'offline',
        last_changed: serverTimestamp()
      }
    }, { merge: true });
  } catch (error) {
    console.error('Error updating presence:', error);
  }
}

// --- Online Users List ---
function listenForOnlineUsers() {
  if (onlineUsersListener) onlineUsersListener();
  
  // Get all users, both online and offline
  const q = query(collection(db, 'users'));
  onlineUsersListener = onSnapshot(q, (snapshot) => {
    const users = snapshot.docs
      .map(doc => doc.data())
      .filter(user => user.uid !== currentUser?.uid); // Exclude self
    
    renderOnlineUsers(users);
  }, error => {
    console.error('Error listening for user presence:', error);
  });
}

function renderOnlineUsers(users) {
  if (!onlineUsersList) return;
  onlineUsersList.innerHTML = '';

  if (users.length === 0) {
    onlineUsersList.innerHTML = '<div class="no-users-msg">No other users found.</div>';
    return;
  }
  
  users.forEach(user => {
    const userEl = document.createElement('div');
    userEl.className = 'online-user-item';
    userEl.title = user.presence?.state === 'online' ? 'Online' : 'Offline';
    userEl.onclick = () => openChat(user);
    
    const isOnline = user.presence?.state === 'online';
    userEl.innerHTML = `
      <div class="online-user-avatar">
        <img src="${user.photoURL || `https://i.pravatar.cc/40?u=${user.uid}`}" class="user-avatar" alt="${user.displayName || user.email}">
        ${isOnline ? '<div class="online-indicator"></div>' : ''}
      </div>
      <span class="online-user-name">${user.displayName || user.email?.split('@')[0] || 'User'}</span>
    `;
    onlineUsersList.appendChild(userEl);
  });
}

// --- Chat Functions ---
function openChat(user) {
  currentChatUser = user;
  if (chatUserAvatar) chatUserAvatar.src = user.photoURL || `https://i.pravatar.cc/40?u=${user.uid}`;
  if (chatUserName) chatUserName.textContent = user.displayName || user.email?.split('@')[0] || 'User';
  if (chatUserStatus) chatUserStatus.textContent = user.presence?.state === 'online' ? 'Online' : 'Offline';
  
  if (chatModal) chatModal.classList.remove('hidden');
  if (chatInput) {
    chatInput.value = '';
    chatInput.focus();
  }

  // Clean up previous listeners
  if (messagesListener) messagesListener();
  if (typingListener) typingListener();
  
  const chatId = getChatId(currentUser.uid, user.uid);
  
  // Listen for messages with notification support
  listenForMessages(chatId);
  
  // Listen for typing indicators
  listenForTyping(chatId);
}

function listenForMessages(chatId) {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

  messagesListener = onSnapshot(messagesQuery, (snapshot) => {
    // Check for new messages and show notifications
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        const msg = change.doc.data();
        // Only show notification if message is from another user and chat modal is not focused
        if (msg.senderId !== currentUser.uid) {
          showNotification(`New message from ${currentChatUser.displayName || currentChatUser.email?.split('@')[0] || 'a user'}`, 'success');
        }
      }
    });
    
    // Render all messages
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderMessages(messages);
  }, error => {
    console.error('Error fetching chat messages:', error);
  });
}

function listenForTyping(chatId) {
  const chatRef = doc(db, 'chats', chatId);
  
  typingListener = onSnapshot(chatRef, (snapshot) => {
    if (snapshot.exists()) {
      const chatData = snapshot.data();
      const typing = chatData.typing || {};
      
      // Check if other user is typing
      const isOtherUserTyping = typing[currentChatUser.uid] === true;
      
      if (isOtherUserTyping && typingIndicator && typingUserName) {
        typingUserName.textContent = currentChatUser.displayName || currentChatUser.email?.split('@')[0] || 'User';
        typingIndicator.classList.remove('hidden');
      } else if (typingIndicator) {
        typingIndicator.classList.add('hidden');
      }
    }
  }, error => {
    console.error('Error listening for typing:', error);
  });
}

function closeChat() {
  if (chatModal) chatModal.classList.add('hidden');
  if (messagesListener) messagesListener();
  if (typingListener) typingListener();
  currentChatUser = null;
  if (messagesList) messagesList.innerHTML = '';
  if (typingIndicator) typingIndicator.classList.add('hidden');
}

function renderMessages(messages) {
  if (!messagesList) return;
  
  messagesList.innerHTML = '';
  messages.forEach(message => {
    const messageEl = createMessageElement(message);
    messagesList.appendChild(messageEl);
  });
  scrollToBottom();
}

function createMessageElement(message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${message.senderId === currentUser.uid ? 'sent' : 'received'}`;
  
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = message.text;
  
  const timestamp = document.createElement('div');
  timestamp.className = 'message-timestamp';
  timestamp.textContent = formatMessageTime(message.timestamp);
  
  messageDiv.appendChild(bubble);
  messageDiv.appendChild(timestamp);
  
  return messageDiv;
}

async function sendMessage() {
  const text = chatInput?.value?.trim();
  if (!text || !currentChatUser) return;
  
  const chatId = getChatId(currentUser.uid, currentChatUser.uid);
  
  try {
    // Create/Update chat document with enhanced data model
    await setDoc(doc(db, 'chats', chatId), {
      participants: [currentUser.uid, currentChatUser.uid],
      participantInfo: {
        [currentUser.uid]: { 
          displayName: currentUser.displayName || currentUser.email.split('@')[0] 
        },
        [currentChatUser.uid]: { 
          displayName: currentChatUser.displayName || currentChatUser.email?.split('@')[0] || 'User' 
        }
      },
      lastMessage: {
        text: text,
        senderId: currentUser.uid,
        timestamp: serverTimestamp()
      },
      typing: {
        [currentUser.uid]: false,
        [currentChatUser.uid]: false
      }
    }, { merge: true });
    
    // Add message to subcollection
    await addDoc(collection(db, `chats/${chatId}/messages`), {
      text: text,
      senderId: currentUser.uid,
      timestamp: serverTimestamp()
    });
    
    if (chatInput) chatInput.value = '';
    await stopTyping();
  } catch (error) {
    console.error('Error sending message:', error);
    showNotification('Error sending message', 'error');
  }
}

async function handleTyping() {
  if (!currentChatUser) return;
  
  clearTimeout(typingTimer);
  
  const chatId = getChatId(currentUser.uid, currentChatUser.uid);
  
  try {
    // Set typing to true
    await updateDoc(doc(db, 'chats', chatId), {
      [`typing.${currentUser.uid}`]: true
    });
  } catch (error) {
    console.error('Error updating typing status:', error);
  }
  
  // Auto-stop typing after 3 seconds
  typingTimer = setTimeout(stopTyping, 3000);
}

async function stopTyping() {
  if (!currentChatUser) return;
  
  clearTimeout(typingTimer);
  
  const chatId = getChatId(currentUser.uid, currentChatUser.uid);
  
  try {
    // Set typing to false
    await updateDoc(doc(db, 'chats', chatId), {
      [`typing.${currentUser.uid}`]: false
    });
  } catch (error) {
    console.error('Error stopping typing status:', error);
  }
}

function scrollToBottom() {
  if (messagesList) {
    setTimeout(() => {
      messagesList.scrollTop = messagesList.scrollHeight;
    }, 100);
  }
}

// --- Authentication Functions ---
function setupAuthEventListeners() {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const loginTab = document.getElementById('loginTab');
  const signupTab = document.getElementById('signupTab');
  const logoutBtn = document.getElementById('logoutBtn');

  // Tab switching
  if (loginTab) {
    loginTab.addEventListener('click', (e) => {
      e.preventDefault();
      switchAuthTab('login');
    });
  }
  
  if (signupTab) {
    signupTab.addEventListener('click', (e) => {
      e.preventDefault();
      switchAuthTab('signup');
    });
  }
  
  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  }

  // Login form
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const email = formData.get('email');
      const password = formData.get('password');
      const messageEl = document.getElementById('loginMessage');
      
      if (!email || !password) {
        if (messageEl) {
          messageEl.className = 'auth-message error';
          messageEl.textContent = '❌ Please fill in all fields';
        }
        return;
      }
      
      try {
        if (messageEl) {
          messageEl.className = 'auth-message';
          messageEl.textContent = 'Logging in...';
        }
        
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (userCredential.user.emailVerified) {
          if (messageEl) {
            messageEl.className = 'auth-message success';
            messageEl.textContent = '✅ Login successful!';
          }
          e.target.reset();
        } else {
          await signOut(auth);
          if (messageEl) {
            messageEl.className = 'auth-message error';
            messageEl.textContent = '❌ Please verify your email first. A new verification link has been sent.';
          }
          await sendEmailVerification(userCredential.user);
        }
      } catch (error) {
        console.error('Login error:', error);
        if (messageEl) {
          messageEl.className = 'auth-message error';
          messageEl.textContent = `❌ ${error.message}`;
        }
      }
    });
  }

  // Signup form
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const email = formData.get('email');
      const password = formData.get('password');
      const messageEl = document.getElementById('signupMessage');
      
      if (!email || !password) {
        if (messageEl) {
          messageEl.className = 'auth-message error';
          messageEl.textContent = '❌ Please fill in all fields';
        }
        return;
      }
      
      if (password.length < 6) {
        if (messageEl) {
          messageEl.className = 'auth-message error';
          messageEl.textContent = '❌ Password must be at least 6 characters';
        }
        return;
      }
      
      try {
        if (messageEl) {
          messageEl.className = 'auth-message';
          messageEl.textContent = 'Creating account...';
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        await signOut(auth);
        
        if (messageEl) {
          messageEl.className = 'auth-message success';
          messageEl.textContent = '✅ Account created! Please check your inbox to verify your email before logging in.';
        }
        e.target.reset();
        
        // Switch to login tab after successful signup
        setTimeout(() => switchAuthTab('login'), 2000);
      } catch (error) {
        console.error('Signup error:', error);
        if (messageEl) {
          messageEl.className = 'auth-message error';
          messageEl.textContent = `❌ ${error.message}`;
        }
      }
    });
  }
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const loginTab = document.getElementById('loginTab');
  const signupTab = document.getElementById('signupTab');
  
  if (tab === 'login') {
    if (loginForm) loginForm.classList.remove('hidden');
    if (signupForm) signupForm.classList.add('hidden');
    if (loginTab) loginTab.classList.add('active');
    if (signupTab) signupTab.classList.remove('active');
  } else {
    if (loginForm) loginForm.classList.add('hidden');
    if (signupForm) signupForm.classList.remove('hidden');
    if (loginTab) loginTab.classList.remove('active');
    if (signupTab) signupTab.classList.add('active');
  }
  
  // Clear any existing messages
  const loginMessage = document.getElementById('loginMessage');
  const signupMessage = document.getElementById('signupMessage');
  if (loginMessage) loginMessage.textContent = '';
  if (signupMessage) signupMessage.textContent = '';
}

async function handleLogout() {
  try {
    if (currentUser) {
      await updateUserPresence(false);
    }
    await signOut(auth);
    showNotification('Logged out successfully');
  } catch (error) {
    console.error('Logout error:', error);
    showNotification('Error logging out', 'error');
  }
}

// --- Post Functions ---
function setupPostEventListeners() {
  if (postButton) {
    postButton.addEventListener('click', (e) => {
      e.preventDefault();
      createPost();
    });
  }
  
  if (postInput) {
    postInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        createPost();
      }
    });
  }
}

async function createPost() {
  const content = postInput?.value?.trim();
  if (!content) return;
  if (!currentUser) return showNotification('Please log in to post!', 'error');

  if (postButton) postButton.disabled = true;
  try {
    await addDoc(collection(db, "posts"), {
      type: 'original',
      content: content,
      authorId: currentUser.uid,
      authorName: currentUser.displayName || currentUser.email.split('@')[0],
      authorAvatar: currentUser.photoURL || `https://i.pravatar.cc/40?u=${currentUser.uid}`,
      createdAt: serverTimestamp(),
      likes: 0,
      likedBy: [],
      commentList: [],
      shareCount: 0
    });
    if (postInput) postInput.value = '';
    showNotification('Post created successfully!');
  } catch (error) {
    console.error('Error creating post:', error);
    showNotification('Error creating post', 'error');
  } finally {
    if (postButton) postButton.disabled = false;
  }
}

function listenForPosts() {
  if (postsListenerUnsubscribe) postsListenerUnsubscribe();
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
  postsListenerUnsubscribe = onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    displayPosts(posts);
  }, (error) => {
    console.error("Error fetching posts:", error);
    displaySamplePosts();
  });
}

function displaySamplePosts() {
  const samplePosts = [
    {
      id: 'sample1',
      type: 'original',
      content: 'Excited to share our latest research on neural network optimization! The results are promising for real-world applications.',
      authorName: 'Dr. Sarah Chen',
      authorAvatar: 'https://i.pravatar.cc/40?u=sarah',
      authorId: 'sample-user-1',
      createdAt: { toDate: () => new Date(Date.now() - 3600000) },
      likes: 12,
      likedBy: [],
      commentList: [],
      shareCount: 3
    },
    {
      id: 'sample2',
      type: 'original',
      content: 'Working on a fascinating computer vision project. The intersection of AI and healthcare is truly revolutionary!',
      authorName: 'Prof. Michael Rodriguez',
      authorAvatar: 'https://i.pravatar.cc/40?u=michael',
      authorId: 'sample-user-2',
      createdAt: { toDate: () => new Date(Date.now() - 7200000) },
      likes: 8,
      likedBy: [],
      commentList: [],
      shareCount: 1
    }
  ];
  displayPosts(samplePosts);
}

function displayPosts(posts) {
  if (!postsContainer) return;
  
  postsContainer.innerHTML = '';
  if (posts.length === 0) {
    postsContainer.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px;">
        <h3>Welcome! 🎉</h3>
        <p>Be the first to share your insights!</p>
      </div>
    `;
    updateStatus('📚 Ready to post', 'online');
    return;
  }
  
  posts.forEach(post => {
    const postElement = createPostElement(post);
    postsContainer.appendChild(postElement);
  });
  updateStatus(`📡 Online • ${posts.length} posts loaded`, 'online');
}

function createPostElement(postData) {
  if (postData.type === 'share') {
    const originalPost = postData.originalPost;
    const originalPostId = postData.originalPostId;
    
    const postDiv = document.createElement('div');
    postDiv.className = 'card post';
    
    const isLiked = originalPost.likedBy?.includes(currentUser?.uid);
    const commentCount = originalPost.commentList?.length || 0;

    postDiv.innerHTML = `
      <div style="font-size: 14px; color: var(--color-text-secondary); margin-bottom: 12px;">
        🧠 <strong>${postData.sharerName}</strong> shared this
      </div>
      <div class="post-header">
        <div class="post-author-info">
          <img src="${originalPost.authorAvatar}" class="user-avatar" alt="${originalPost.authorName}">
          <div>
            <div class="post-author">${originalPost.authorName}</div>
            <div class="post-time">${formatTime(originalPost.createdAt)}</div>
          </div>
        </div>
        ${currentUser?.uid === originalPost.authorId ? 
          `<button class="post-menu" onclick="deletePost('${originalPostId}')">⋯</button>` 
          : ''}
      </div>
      <div class="post-content">${(originalPost.content || '').replace(/\n/g, '<br>')}</div>
      <div class="post-stats">
        <span>${originalPost.likes || 0} reactions • ${commentCount} comments</span>
        <span>${originalPost.shareCount || 0} shares</span>
      </div>
      <div class="post-actions">
        <button class="post-action ${isLiked ? 'liked' : ''}" onclick="toggleLike('${originalPostId}')">👍 Like</button>
        <button class="post-action" onclick="focusCommentInput('${originalPostId}')">💬 Comment</button>
        <button class="post-action" onclick="sharePost('${originalPostId}')">↗️ Share</button>
      </div>
    `;
    return postDiv;
  } else {
    const postDiv = document.createElement('div');
    postDiv.className = 'card post';
    postDiv.dataset.postId = postData.id;

    const isLiked = postData.likedBy?.includes(currentUser?.uid);
    const commentCount = postData.commentList?.length || 0;

    postDiv.innerHTML = `
      <div class="post-header">
        <div class="post-author-info">
          <img src="${postData.authorAvatar}" class="user-avatar" alt="${postData.authorName}">
          <div>
            <div class="post-author">${postData.authorName}</div>
            <div class="post-time">${formatTime(postData.createdAt)}</div>
          </div>
        </div>
        ${currentUser?.uid === postData.authorId ? 
          `<button class="post-menu" onclick="deletePost('${postData.id}')">⋯</button>` 
          : ''}
      </div>
      <div class="post-content">${(postData.content || '').replace(/\n/g, '<br>')}</div>
      <div class="post-stats">
        <span>${postData.likes || 0} reactions • ${commentCount} comments</span>
        <span>${postData.shareCount || 0} shares</span>
      </div>
      <div class="post-actions">
        <button class="post-action ${isLiked ? 'liked' : ''}" onclick="toggleLike('${postData.id}')">👍 Like</button>
        <button class="post-action" onclick="focusCommentInput('${postData.id}')">💬 Comment</button>
        <button class="post-action" onclick="sharePost('${postData.id}')">↗️ Share</button>
      </div>
      <div class="comments">
        <div class="comment-list"></div>
        <div class="comment-form">
          <input type="text" class="comment-input" placeholder="Write a comment..." onkeydown="commentKeydown(event, '${postData.id}')">
          <button class="comment-btn" onclick="addComment('${postData.id}')">Post</button>
        </div>
      </div>
    `;
    renderComments(postDiv, postData);
    return postDiv;
  }
}

function renderComments(postEl, post) {
  const listEl = postEl.querySelector('.comment-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  (post.commentList || []).forEach((comment) => {
    const item = document.createElement('div');
    item.className = 'comment-item';
    item.innerHTML = `
      <img src="${comment.avatar}" class="comment-avatar" alt="${comment.author}">
      <div>
        <div class="comment-body">
          <strong>${comment.author}</strong><br>${(comment.text || '').replace(/\n/g, '<br>')}
        </div>
        <div class="comment-meta">
          ${formatTime(comment.createdAt)}
          ${currentUser?.uid === comment.userId ? 
            `<button class="delete-comment" onclick="deleteComment('${post.id}', '${comment.id}')">Delete</button>` 
            : ''}
        </div>
      </div>
    `;
    listEl.appendChild(item);
  });
}

// --- Chat Event Listeners ---
function setupChatEventListeners() {
  const chatToggle = document.getElementById('chatToggle');
  const closeChatModal = document.getElementById('closeChatModal');
  
  if (chatToggle) {
    chatToggle.addEventListener('click', (e) => {
      e.preventDefault();
      showNotification('Click on an online user in the left sidebar to start chatting!');
    });
  }
  
  if (closeChatModal) {
    closeChatModal.addEventListener('click', (e) => {
      e.preventDefault();
      closeChat();
    });
  }
  
  if (chatInputForm) {
    chatInputForm.addEventListener('submit', (e) => {
      e.preventDefault();
      sendMessage();
    });
  }
  
  if (chatInput) {
    chatInput.addEventListener('input', handleTyping);
  }
  
  // Close chat modal when clicking outside
  if (chatModal) {
    chatModal.addEventListener('click', (e) => {
      if (e.target === chatModal) {
        closeChat();
      }
    });
  }
}

// --- Global Functions for onclick handlers ---
window.deletePost = async function(postId) {
  if (!confirm('Are you sure you want to delete this post?')) return;
  try {
    await deleteDoc(doc(db, "posts", postId));
    showNotification('Post deleted successfully!');
  } catch (error) {
    console.error('Error deleting post:', error);
    showNotification('Error deleting post', 'error');
  }
};

window.toggleLike = async function(postId) {
  if (!currentUser) return showNotification('Please log in to like posts!', 'error');

  const postRef = doc(db, 'posts', postId);
  try {
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) return;
    const postData = postSnap.data();
    
    if (postData.likedBy?.includes(currentUser.uid)) {
      await updateDoc(postRef, {
        likedBy: arrayRemove(currentUser.uid),
        likes: increment(-1)
      });
    } else {
      await updateDoc(postRef, {
        likedBy: arrayUnion(currentUser.uid),
        likes: increment(1)
      });
    }
  } catch (error) {
    console.error("Error toggling like:", error);
  }
};

window.sharePost = async function(originalPostId) {
  if (!currentUser) return showNotification('Please log in to share!', 'error');

  const originalPostRef = doc(db, 'posts', originalPostId);
  try {
    const postSnap = await getDoc(originalPostRef);
    if (!postSnap.exists()) return showNotification('This post no longer exists.', 'error');

    const originalPostData = postSnap.data();

    await addDoc(collection(db, "posts"), {
      type: 'share',
      sharerId: currentUser.uid,
      sharerName: currentUser.displayName || currentUser.email.split('@')[0],
      sharerAvatar: currentUser.photoURL || `https://i.pravatar.cc/40?u=${currentUser.uid}`,
      createdAt: serverTimestamp(),
      originalPostId: originalPostId,
      originalPost: originalPostData
    });

    await updateDoc(originalPostRef, {
      shareCount: increment(1)
    });

    showNotification('Post shared successfully!');
  } catch (error) {
    console.error("Error sharing post:", error);
    showNotification('Error sharing post', 'error');
  }
};

window.addComment = async function(postId) {
  if (!currentUser) return showNotification('Please log in to comment!', 'error');
  
  const input = document.querySelector(`[data-post-id="${postId}"] .comment-input`);
  if (!input) return;
  
  const text = input.value.trim();
  if (!text) return;

  const comment = {
    id: Date.now().toString() + currentUser.uid.slice(0, 5),
    userId: currentUser.uid,
    author: currentUser.displayName || currentUser.email.split('@')[0],
    avatar: currentUser.photoURL || `https://i.pravatar.cc/28?u=${currentUser.uid}`,
    text: text,
    createdAt: new Date()
  };

  try {
    await updateDoc(doc(db, 'posts', postId), { commentList: arrayUnion(comment) });
    input.value = '';
  } catch (error) {
    console.error("Error adding comment:", error);
  }
};

window.deleteComment = async function(postId, commentId) {
  if (!currentUser) return;
  try {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) return;
    
    const commentList = postSnap.data().commentList || [];
    const commentToDelete = commentList.find(c => c.id === commentId && c.userId === currentUser.uid);

    if (commentToDelete) {
      await updateDoc(postRef, { commentList: arrayRemove(commentToDelete) });
    } else {
      showNotification("You can only delete your own comments.", "error");
    }
  } catch (error) {
    console.error("Error deleting comment:", error);
  }
};

window.focusCommentInput = (postId) => {
  const input = document.querySelector(`[data-post-id="${postId}"] .comment-input`);
  if (input) input.focus();
};

window.commentKeydown = (e, postId) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    addComment(postId);
  }
};

// Make openChat available globally
window.openChat = openChat;

// --- Auth State Observer ---
onAuthStateChanged(auth, async (user) => {
  if (user && user.emailVerified) {
    currentUser = user;
    if (appDiv) appDiv.classList.remove('hidden');
    if (loginModal) loginModal.classList.add('hidden');
    
    const avatarUrl = user.photoURL || `https://i.pravatar.cc/40?u=${user.uid}`;
    const userName = user.displayName || user.email.split('@')[0];
    
    [userAvatar, sidebarAvatar, composerAvatar].forEach(el => {
      if (el) el.src = avatarUrl;
    });
    if (profileName) profileName.textContent = userName;
    
    // Update user presence
    await updateUserPresence(true);
    
    // Start listening for data
    listenForPosts();
    listenForOnlineUsers();
    
    updateStatus('✅ Logged in', 'online');
    showNotification(`Welcome back, ${userName}!`);
    
    // Handle page unload
    window.addEventListener('beforeunload', () => {
      if (currentUser) {
        updateUserPresence(false);
      }
    });
  } else {
    currentUser = null;
    if (appDiv) appDiv.classList.add('hidden');
    if (loginModal) loginModal.classList.remove('hidden');
    
    if (postsListenerUnsubscribe) postsListenerUnsubscribe();
    if (onlineUsersListener) onlineUsersListener();
    if (messagesListener) messagesListener();
    if (typingListener) typingListener();
    
    if (postsContainer) postsContainer.innerHTML = '';
    if (onlineUsersList) onlineUsersList.innerHTML = '';
    updateStatus('🔄 Please log in', 'offline');
  }
});

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing DeepNet Social...');
  
  setupAuthEventListeners();
  setupPostEventListeners();
  setupChatEventListeners();
  
  // Initialize status
  updateStatus('🔄 Connecting...', 'offline');
  
  // Show welcome message
  setTimeout(() => {
    if (!currentUser) {
      updateStatus('👋 Welcome to DeepNet Social', 'offline');
    }
  }, 1000);
});
