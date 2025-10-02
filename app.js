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

// DOM Elements
const loginModal = document.getElementById('loginModal');
const appDiv = document.getElementById('app');
const userAvatar = document.getElementById('userAvatar');
const sidebarAvatar = document.getElementById('sidebarAvatar');
const composerAvatar = document.getElementById('composerAvatar');
const profileName = document.getElementById('profileName');
const notification = document.getElementById('notification');
const status = document.getElementById('status');
const postsContainer = document.getElementById('postsContainer');
const postInput = document.getElementById('postInput');
const postButton = document.getElementById('postButton');
const onlineUsersList = document.getElementById('onlineUsersList');
const chatModal = document.getElementById('chatModal');
const chatUserAvatar = document.getElementById('chatUserAvatar');
const chatUserName = document.getElementById('chatUserName');
const chatUserStatus = document.getElementById('chatUserStatus');
const chatMessages = document.getElementById('chatMessages');
const messagesList = document.getElementById('messagesList');
const chatInput = document.getElementById('chatInput');
const chatInputForm = document.getElementById('chatInputForm');
const typingIndicator = document.getElementById('typingIndicator');

// --- Utility Functions ---
function showNotification(message, type = 'success') {
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.classList.add('show');
  setTimeout(() => notification.classList.remove('show'), 3000);
}

function updateStatus(message, type = 'online') {
  status.textContent = message;
  status.className = `status ${type}`;
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

function getChatId(userId1, userId2) {
  return [userId1, userId2].sort().join('_');
}
// --- User Presence Functions ---

async function updateUserPresence(isOnline) {
if (!currentUser) return;

try {
await setDoc(doc(db, 'users', currentUser.uid), {
  uid: currentUser.uid,
  displayName: currentUser.displayName || currentUser.email.split('@'),
  email: currentUser.email,
  photoURL: currentUser.photoURL || `https://i.pravatar.cc/40?u=${currentUser.uid}`,
  isOnline: isOnline,
  lastSeen: serverTimestamp()
}, { merge: true });
} catch (error) {
  console.error('Error updating presence:', error);
}
}
// --- Online Users List ---

function listenForOnlineUsers() {
if (onlineUsersListener) onlineUsersListener(); // Unsubscribe old listener

// Filter for users online or just get all users depending on your preference here
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
userEl.title = user.isOnline ? 'Online' : 'Offline';
    userEl.onclick = () => openChat(user);

userEl.innerHTML = `
  <div class="online-user-avatar">
    <img src="${user.photoURL}" class="user-avatar" alt="${user.displayName}">
    ${user.isOnline ? '<div class="online-indicator"></div>' : ''}
  </div>
  <span class="online-user-name">${user.displayName}</span>
`;
onlineUsersList.appendChild(userEl);
});
}

// --- Chat Functions ---

function openChat(user) {
currentChatUser = user;
chatUserAvatar.src = user.photoURL;
chatUserName.textContent = user.displayName;
chatUserStatus.textContent = user.isOnline ? 'Online' : 'Offline';
chatModal.classList.remove('hidden');
chatInput.value = '';
chatInput.focus();

if (messagesListener) messagesListener();
  const chatId = getChatId(currentUser.uid, user.uid);
const messagesRef = collection(db, 'chats', chatId, 'messages');
const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

messagesListener = onSnapshot(messagesQuery, snapshot => {
const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
renderMessages(messages);
}, error => {
console.error('Error fetching chat messages:', error);
});
}
function closeChat() {
chatModal.classList.add('hidden');
if (messagesListener) messagesListener();
currentChatUser = null;
chatMessages.innerHTML = '';
}

function renderMessages(messages) {
chatMessages.innerHTML = '';
messages.forEach(msg => {
const msgDiv = document.createElement('div');
msgDiv.className = message ${msg.senderId === currentUser.uid ? 'sent' : 'received'};
msgDiv.textContent = msg.text;
chatMessages.appendChild(msgDiv);
});
chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || !currentChatUser) return;

  const chatId = getChatId(currentUser.uid, currentChatUser.uid);

  try {
    // Ensure chat doc exists or create it
    await setDoc(doc(db, 'chats', chatId), {
      participants: [currentUser.uid, currentChatUser.uid],
      lastMessage: text,
      lastMessageTime: serverTimestamp(),
    }, { merge: true });

    // Add message
    await addDoc(collection(db, `chats/${chatId}/messages`), {
      text,
      senderId: currentUser.uid,
      timestamp: serverTimestamp()
    });

    chatInput.value = '';
    stopTyping();
  } catch (error) {
    console.error('Error sending message:', error);
    showNotification('Message send failed: ' + error.message, 'error');
  }
}
// Typing indicator (basic debounced)
function handleTyping() {
clearTimeout(typingTimer);
// TODO: Implement presence typing state (optional)
typingTimer = setTimeout(stopTyping, 3000);
}
function stopTyping() {
clearTimeout(typingTimer);
}
// --- Authentication Functions ---
function setupAuthEventListeners() {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const loginTab = document.getElementById('loginTab');
  const signupTab = document.getElementById('signupTab');
  const closeModal = document.getElementById('closeModal');
  const logoutBtn = document.getElementById('logoutBtn');

  // Tab switching
  loginTab.addEventListener('click', (e) => {
    e.preventDefault();
    switchAuthTab('login');
  });
  
  signupTab.addEventListener('click', (e) => {
    e.preventDefault();
    switchAuthTab('signup');
  });
  
  // Modal close
  closeModal.addEventListener('click', (e) => {
    e.preventDefault();
    loginModal.classList.add('hidden');
  });
  
  // Click outside to close
  loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) {
      loginModal.classList.add('hidden');
    }
  });
  
  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  }

  // Login form
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    const messageEl = document.getElementById('loginMessage');
    
    if (!email || !password) {
      messageEl.className = 'auth-message error';
      messageEl.textContent = '❌ Please fill in all fields';
      return;
    }
    
    try {
      messageEl.className = 'auth-message';
      messageEl.textContent = 'Logging in...';
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (userCredential.user.emailVerified) {
        messageEl.className = 'auth-message success';
        messageEl.textContent = '✅ Login successful!';
        e.target.reset();
      } else {
        await signOut(auth);
        messageEl.className = 'auth-message error';
        messageEl.textContent = '❌ Please verify your email first. A new verification link has been sent.';
        await sendEmailVerification(userCredential.user);
      }
    } catch (error) {
      console.error('Login error:', error);
      messageEl.className = 'auth-message error';
      messageEl.textContent = `❌ ${error.message}`;
    }
  });

  // Signup form
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    const messageEl = document.getElementById('signupMessage');
    
    if (!email || !password) {
      messageEl.className = 'auth-message error';
      messageEl.textContent = '❌ Please fill in all fields';
      return;
    }
    
    if (password.length < 6) {
      messageEl.className = 'auth-message error';
      messageEl.textContent = '❌ Password must be at least 6 characters';
      return;
    }
    
    try {
      messageEl.className = 'auth-message';
      messageEl.textContent = 'Creating account...';
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      await signOut(auth);
      messageEl.className = 'auth-message success';
      messageEl.textContent = '✅ Account created! Please check your inbox to verify your email before logging in.';
      e.target.reset();
      
      // Switch to login tab after successful signup
      setTimeout(() => switchAuthTab('login'), 2000);
    } catch (error) {
      console.error('Signup error:', error);
      messageEl.className = 'auth-message error';
      messageEl.textContent = `❌ ${error.message}`;
    }
  });
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const loginTab = document.getElementById('loginTab');
  const signupTab = document.getElementById('signupTab');
  
  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
  } else {
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
    loginTab.classList.remove('active');
    signupTab.classList.add('active');
  }
  
  // Clear any existing messages
  document.getElementById('loginMessage').textContent = '';
  document.getElementById('signupMessage').textContent = '';
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

// --- User Presence Functions ---
async function updateUserPresence(isOnline) {
  if (!currentUser) return;
  
  try {
    await setDoc(doc(db, 'users', currentUser.uid), {
      uid: currentUser.uid,
      displayName: currentUser.displayName || currentUser.email.split('@')[0],
      email: currentUser.email,
      photoURL: currentUser.photoURL || `https://i.pravatar.cc/40?u=${currentUser.uid}`,
      isOnline: isOnline,
      lastSeen: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error updating presence:', error);
  }
}

function listenForOnlineUsers() {
  if (onlineUsersListener) onlineUsersListener();
  
  const q = query(collection(db, 'users'), where('isOnline', '==', true));
  onlineUsersListener = onSnapshot(q, (snapshot) => {
    const onlineUsers = snapshot.docs
      .map(doc => doc.data())
      .filter(user => user.uid !== currentUser?.uid);
    
    renderOnlineUsers(onlineUsers);
  }, (error) => {
    console.error('Error listening for online users:', error);
  });
}

function renderOnlineUsers(users) {
  if (!onlineUsersList) return;
  
  onlineUsersList.innerHTML = '';
  users.forEach(user => {
    const userEl = document.createElement('div');
    userEl.className = 'online-user-item';
    userEl.onclick = () => openChat(user);
    
    userEl.innerHTML = `
      <div class="online-user-avatar">
        <img src="${user.photoURL}" class="user-avatar" alt="${user.displayName}">
        <div class="online-indicator"></div>
      </div>
      <span class="online-user-name">${user.displayName}</span>
    `;
    
    onlineUsersList.appendChild(userEl);
  });
  
  // Show message if no online users
  if (users.length === 0) {
    onlineUsersList.innerHTML = '<div style="padding: 8px; color: var(--color-text-secondary); font-size: 14px;">No users online</div>';
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
  const content = postInput.value.trim();
  if (!content) return;
  if (!currentUser) return showNotification('Please log in to post!', 'error');

  postButton.disabled = true;
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
    postInput.value = '';
    showNotification('Post created successfully!');
  } catch (error) {
    console.error('Error creating post:', error);
    showNotification('Error creating post', 'error');
  } finally {
    postButton.disabled = false;
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
    // Show sample posts if Firebase fails
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
      <div class="post-content">${originalPost.content.replace(/\n/g, '<br>')}</div>
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
      <div class="post-content">${postData.content.replace(/\n/g, '<br>')}</div>
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
          <strong>${comment.author}</strong><br>${comment.text.replace(/\n/g, '<br>')}
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

// --- Chat Functions ---
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

async function openChat(user) {
  currentChatUser = user;
  chatUserAvatar.src = user.photoURL;
  chatUserName.textContent = user.displayName;
  chatUserStatus.textContent = user.isOnline ? 'Online' : 'Offline';
  
  chatModal.classList.remove('hidden');
  chatInput.focus();
  
  // Listen for messages
  listenForMessages(user.uid);
}

function closeChat() {
  chatModal.classList.add('hidden');
  currentChatUser = null;
  if (messagesListener) messagesListener();
  messagesList.innerHTML = '';
}

function listenForMessages(otherUserId) {
  if (messagesListener) messagesListener();
  
  const chatId = getChatId(currentUser.uid, otherUserId);
  const q = query(
    collection(db, `chats/${chatId}/messages`),
    orderBy('timestamp', 'asc')
  );
  
  messagesListener = onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderMessages(messages);
  }, (error) => {
    console.error('Error listening for messages:', error);
  });
}

function renderMessages(messages) {
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

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || !currentChatUser) return;
  
  const chatId = getChatId(currentUser.uid, currentChatUser.uid);
  
  try {
    // Create chat document if it doesn't exist
    await setDoc(doc(db, 'chats', chatId), {
      participants: [currentUser.uid, currentChatUser.uid],
      lastMessage: text,
      lastMessageTime: serverTimestamp()
    }, { merge: true });
    
    // Add message
    await addDoc(collection(db, `chats/${chatId}/messages`), {
      text: text,
      senderId: currentUser.uid,
      timestamp: serverTimestamp()
    });
    
    chatInput.value = '';
    stopTyping();
  } catch (error) {
    console.error('Error sending message:', error);
    showNotification('Error sending message', 'error');
  }
}

function handleTyping() {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(stopTyping, 3000);
}

function stopTyping() {
  clearTimeout(typingTimer);
}

function scrollToBottom() {
  if (messagesList) {
    setTimeout(() => {
      messagesList.scrollTop = messagesList.scrollHeight;
    }, 100);
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

window.focusCommentInput = (postId) => document.querySelector(`[data-post-id="${postId}"] .comment-input`)?.focus();

window.commentKeydown = (e, postId) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    addComment(postId);
  }
};

// --- Auth State Observer ---
onAuthStateChanged(auth, async (user) => {
  if (user && user.emailVerified) {
    currentUser = user;
    appDiv.classList.remove('hidden');
    loginModal.classList.add('hidden');
    
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
    window.addEventListener('beforeunload', () => updateUserPresence(false));
  } else {
    currentUser = null;
    appDiv.classList.add('hidden');
    loginModal.classList.remove('hidden');
    
    if (postsListenerUnsubscribe) postsListenerUnsubscribe();
    if (onlineUsersListener) onlineUsersListener();
    if (messagesListener) messagesListener();
    
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
