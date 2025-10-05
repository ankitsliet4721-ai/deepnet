// --- Firebase Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  onAuthStateChanged, signOut, sendEmailVerification 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, doc, getDoc, deleteDoc, updateDoc, 
  query, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove, 
  increment, setDoc 
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

// --- DOM Element Cache ---
const DOMElements = {
  loginModal: document.getElementById('loginModal'),
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
};

// --- Utility Functions ---
const showNotification = (message, type = 'success') => {
  DOMElements.notification.textContent = message;
  DOMElements.notification.className = `notification ${type}`;
  DOMElements.notification.classList.add('show');
  setTimeout(() => DOMElements.notification.classList.remove('show'), 3000);
};

const updateStatus = (message, type) => {
  DOMElements.status.textContent = message;
  DOMElements.status.className = `status ${type}`;
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

// --- Draggable Chatbox Logic ---
const makeDraggable = (element, handle) => {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        document.body.classList.add('dragging-no-select');
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        let newTop = element.offsetTop - pos2;
        let newLeft = element.offsetLeft - pos1;

        // Boundary checks
        const maxX = window.innerWidth - element.offsetWidth;
        const maxY = window.innerHeight - element.offsetHeight;

        if (newLeft < 0) newLeft = 0;
        if (newTop < 0) newTop = 0;
        if (newLeft > maxX) newLeft = maxX;
        if (newTop > maxY) newTop = maxY;

        element.style.top = newTop + "px";
        element.style.left = newLeft + "px";
        element.style.bottom = 'auto'; // Override initial positioning
        element.style.right = 'auto'; // Override initial positioning
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        document.body.classList.remove('dragging-no-select');
    }
}


// --- User Presence ---
const updateUserPresence = async (isOnline) => {
  if (!currentUser) return;
  try {
    await setDoc(doc(db, 'users', currentUser.uid), {
      uid: currentUser.uid,
      displayName: currentUser.displayName || currentUser.email.split('@')[0],
      email: currentUser.email,
      photoURL: currentUser.photoURL || `https://i.pravatar.cc/40?u=${currentUser.uid}`,
      presence: {
        state: isOnline ? 'online' : 'offline',
        last_changed: serverTimestamp(),
      },
    }, { merge: true });
  } catch (error) { console.error('Error updating presence:', error); }
};

// --- UI Rendering ---
const renderOnlineUsers = (users) => {
  const { onlineUsersList } = DOMElements;
  if (!onlineUsersList) return;
  onlineUsersList.innerHTML = '';
  users
    .sort((a, b) => (b.presence?.state === 'online') - (a.presence?.state === 'online'))
    .forEach(user => {
      const userEl = document.createElement('div');
      userEl.className = 'online-user-item';
      userEl.onclick = () => openChat(user);
      const isOnline = user.presence?.state === 'online';
      userEl.innerHTML = `
        <div class="online-user-avatar">
          <img src="${user.photoURL}" class="user-avatar" alt="${user.displayName}">
          ${isOnline ? '<div class="online-indicator"></div>' : ''}
        </div>
        <span class="online-user-name">${user.displayName}</span>
      `;
      onlineUsersList.appendChild(userEl);
    });
};

const renderMessages = (messages) => {
  const { messagesList } = DOMElements;
  messagesList.innerHTML = '';
  messages.forEach(message => {
    const msgEl = document.createElement('div');
    msgEl.className = `message ${message.senderId === currentUser.uid ? 'sent' : 'received'}`;
    msgEl.innerHTML = `
      <div class="message-bubble">${message.text}</div>
      <div class="message-timestamp">${formatTime(message.timestamp)}</div>
    `;
    messagesList.appendChild(msgEl);
  });
  DOMElements.messagesContainer.scrollTop = DOMElements.messagesContainer.scrollHeight;
};

const displayPosts = (posts) => {
  const { postsContainer } = DOMElements;
  postsContainer.innerHTML = '';
  if (posts.length === 0) {
    postsContainer.innerHTML = `<div class="card" style="text-align:center; padding:40px;"><h3>No posts yet. Be the first!</h3></div>`;
    return;
  }
  posts.forEach(post => {
    const postEl = createPostElement(post);
    postsContainer.appendChild(postEl);
  });
};

const createPostElement = (post) => {
    const postEl = document.createElement('div');
    if (post.type === 'share') {
        postEl.className = 'post shared-post';
        const originalPost = post.originalPost;
        const originalPostId = post.originalPostId;
        const isLiked = originalPost.likedBy?.includes(currentUser?.uid);
        postEl.innerHTML = `
            <div class="share-header">🧠 <strong>${post.sharerName}</strong> shared this</div>
            <div class="post-content-wrapper">
                <div class="post-header">
                    <div class="post-author-info">
                        <img src="${originalPost.authorAvatar}" class="user-avatar" alt="${originalPost.authorName}">
                        <div>
                            <div class="post-author">${originalPost.authorName}</div>
                            <div class="post-time">${formatTime(originalPost.createdAt)}</div>
                        </div>
                    </div>
                </div>
                <div class="post-content">${(originalPost.content || '').replace(/\n/g, '<br>')}</div>
                <div class="post-stats">
                    <span>${originalPost.likes || 0} Likes</span>
                    <span>${originalPost.commentList?.length || 0} Comments</span>
                    <span>${originalPost.shareCount || 0} Shares</span>
                </div>
                <div class="post-actions">
                    <button class="post-action ${isLiked ? 'liked' : ''}" onclick="toggleLike('${originalPostId}')">👍 Like</button>
                    <button class="post-action" onclick="focusCommentInput('${originalPostId}')">💬 Comment</button>
                    <button class="post-action" onclick="sharePost('${originalPostId}')">↗️ Share</button>
                </div>
            </div>`;
    } else {
        postEl.className = 'post';
        postEl.dataset.postId = post.id;
        const isLiked = post.likedBy?.includes(currentUser?.uid);
        postEl.innerHTML = `
            <div class="post-header">
                <div class="post-author-info">
                    <img src="${post.authorAvatar}" class="user-avatar" alt="${post.authorName}">
                    <div>
                        <div class="post-author">${post.authorName}</div>
                        <div class="post-time">${formatTime(post.createdAt)}</div>
                    </div>
                </div>
                ${post.authorId === currentUser?.uid ? `<button class="post-menu" onclick="deletePost('${post.id}')">✕</button>` : ''}
            </div>
            <div class="post-content">${post.content.replace(/\n/g, '<br>')}</div>
            <div class="post-stats">
                <span>${post.likes || 0} Likes</span>
                <span>${post.commentList?.length || 0} Comments</span>
                <span>${post.shareCount || 0} Shares</span>
            </div>
            <div class="post-actions">
                <button class="post-action ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}')">👍 Like</button>
                <button class="post-action" onclick="focusCommentInput('${post.id}')">💬 Comment</button>
                <button class="post-action" onclick="sharePost('${post.id}')">↗️ Share</button>
            </div>
            <div class="comments">
                <div class="comment-list"></div>
                <form class="comment-form" onsubmit="addComment(event, '${post.id}')">
                    <input class="comment-input" type="text" placeholder="Add a comment...">
                    <button type="submit" class="comment-btn">Post</button>
                </form>
            </div>`;
        renderComments(postEl, post.commentList);
    }
    return postEl;
};

const renderComments = (postEl, comments = []) => {
  const commentListEl = postEl.querySelector('.comment-list');
  commentListEl.innerHTML = '';
  comments.forEach(comment => {
    const commentEl = document.createElement('div');
    commentEl.className = 'comment-item';
    commentEl.innerHTML = `
      <img src="${comment.avatar}" class="comment-avatar" alt="${comment.author}">
      <div>
        <div class="comment-body"><strong>${comment.author}</strong> ${comment.text}</div>
        <div class="comment-meta">
          ${formatTime(comment.createdAt)}
          ${comment.userId === currentUser?.uid ? `<button class="delete-comment" onclick="deleteComment('${postEl.dataset.postId}', '${comment.id}')">Delete</button>` : ''}
        </div>
      </div>
    `;
    commentListEl.appendChild(commentEl);
  });
};

// --- Real-time Listeners ---
const listenForOnlineUsers = () => {
  if (onlineUsersListener) onlineUsersListener();
  const q = query(collection(db, 'users'));
  onlineUsersListener = onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => doc.data()).filter(user => user.uid !== currentUser?.uid);
    renderOnlineUsers(users);
  });
};

const listenForPosts = () => {
  if (postsListenerUnsubscribe) postsListenerUnsubscribe();
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
  postsListenerUnsubscribe = onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    displayPosts(posts);
  });
};

const listenForMessages = (chatId) => {
  if (messagesListener) messagesListener();
  const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
  messagesListener = onSnapshot(q, snapshot => {
    const messages = snapshot.docs.map(doc => doc.data());
    renderMessages(messages);
  });
};

const listenForTyping = (chatId) => {
  if (typingListener) typingListener();
  typingListener = onSnapshot(doc(db, 'chats', chatId), (snapshot) => {
    if (!snapshot.exists() || !currentChatUser) return;
    const typingUsers = snapshot.data().typing || {};
    if (typingUsers[currentChatUser.uid]) {
      DOMElements.typingUserName.textContent = currentChatUser.displayName;
      DOMElements.typingIndicator.classList.remove('hidden');
    } else {
      DOMElements.typingIndicator.classList.add('hidden');
    }
  });
};

// --- Chat Logic ---
const openChat = (user) => {
  currentChatUser = user;
  const { chatModal, chatUserAvatar, chatUserName, chatUserStatus, chatInput } = DOMElements;
  chatUserAvatar.src = user.photoURL;
  chatUserName.textContent = user.displayName;
  chatUserStatus.textContent = user.presence?.state === 'online' ? 'Online' : 'Offline';
  chatModal.classList.remove('hidden');
  chatInput.focus();
  const chatId = getChatId(currentUser.uid, user.uid);
  listenForMessages(chatId);
  listenForTyping(chatId);
};

const closeChat = () => {
  if (messagesListener) messagesListener();
  if (typingListener) typingListener();
  currentChatUser = null;
  DOMElements.chatModal.classList.add('hidden');
};

const sendMessage = async () => {
  const text = DOMElements.chatInput.value.trim();
  if (!text || !currentChatUser) return;
  DOMElements.chatInput.value = '';
  const chatId = getChatId(currentUser.uid, currentChatUser.uid);
  await addDoc(collection(db, 'chats', chatId, 'messages'), { text, senderId: currentUser.uid, timestamp: serverTimestamp() });
  await setDoc(doc(db, 'chats', chatId), { participants: [currentUser.uid, currentChatUser.uid], lastMessage: text }, { merge: true });
};

const updateTypingStatus = async (isTyping) => {
  if (!currentChatUser) return;
  const chatId = getChatId(currentUser.uid, currentChatUser.uid);
  await setDoc(doc(db, 'chats', chatId), { typing: { [currentUser.uid]: isTyping } }, { merge: true });
};

// --- Post & Comment Logic ---
const createPost = async () => {
  const content = DOMElements.postInput.value.trim();
  if (!content) return;
  DOMElements.postButton.disabled = true;
  await addDoc(collection(db, 'posts'), { type: 'original', authorId: currentUser.uid, authorName: currentUser.displayName, authorAvatar: currentUser.photoURL, content, createdAt: serverTimestamp(), likes: 0, likedBy: [], commentList: [], shareCount: 0 });
  DOMElements.postInput.value = '';
  DOMElements.postButton.disabled = false;
};

// --- Global Functions for inline event handlers ---
window.deletePost = async (postId) => { if (confirm('Are you sure?')) { await deleteDoc(doc(db, "posts", postId)); showNotification('Post deleted.', 'success'); } };
window.toggleLike = async (postId) => { const postRef = doc(db, 'posts', postId); const postSnap = await getDoc(postRef); if (!postSnap.exists()) return; const likedBy = postSnap.data().likedBy || []; await updateDoc(postRef, { likedBy: likedBy.includes(currentUser.uid) ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid), likes: increment(likedBy.includes(currentUser.uid) ? -1 : 1) }); };
window.sharePost = async (originalPostId) => {
  if (!currentUser) return showNotification('Please log in.', 'error');
  const postRef = doc(db, 'posts', originalPostId);
  const postSnap = await getDoc(postRef);
  if (!postSnap.exists()) return showNotification('Post not found.', 'error');
  await addDoc(collection(db, 'posts'), { type: 'share', sharerId: currentUser.uid, sharerName: currentUser.displayName, sharerAvatar: currentUser.photoURL, createdAt: serverTimestamp(), originalPostId: originalPostId, originalPost: postSnap.data() });
  await updateDoc(postRef, { shareCount: increment(1) });
  showNotification('Post shared!', 'success');
};
window.focusCommentInput = (postId) => document.querySelector(`[data-post-id="${postId}"] .comment-input`).focus();
window.addComment = async (event, postId) => { event.preventDefault(); const input = event.target.querySelector('.comment-input'); const text = input.value.trim(); if (!text) return; const comment = { id: doc(collection(db, 'tmp')).id, userId: currentUser.uid, author: currentUser.displayName, avatar: currentUser.photoURL, text, createdAt: new Date() }; await updateDoc(doc(db, 'posts', postId), { commentList: arrayUnion(comment) }); input.value = ''; };
window.deleteComment = async (postId, commentId) => { const postRef = doc(db, 'posts', postId); const postSnap = await getDoc(postRef); if (!postSnap.exists()) return; const commentToDelete = postSnap.data().commentList.find(c => c.id === commentId); if (commentToDelete) { await updateDoc(postRef, { commentList: arrayRemove(commentToDelete) }); } };

// --- Authentication ---
const setupAuthEventListeners = () => {
  document.getElementById('loginTab').addEventListener('click', () => switchAuthTab('login'));
  document.getElementById('signupTab').addEventListener('click', () => switchAuthTab('signup'));
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('signupForm').addEventListener('submit', handleSignup);
};

const switchAuthTab = (tab) => {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  loginForm.classList.toggle('hidden', tab !== 'login');
  signupForm.classList.toggle('hidden', tab === 'login');
  document.getElementById('loginTab').classList.toggle('active', tab === 'login');
  document.getElementById('signupTab').classList.toggle('active', tab !== 'login');
};

const handleLogin = async (e) => { e.preventDefault(); const { email, password } = Object.fromEntries(new FormData(e.target)); const msgEl = document.getElementById('loginMessage'); try { const cred = await signInWithEmailAndPassword(auth, email, password); if (!cred.user.emailVerified) { await signOut(auth); msgEl.textContent = 'Please verify your email.'; } } catch (error) { msgEl.textContent = error.message; } };
const handleSignup = async (e) => { e.preventDefault(); const { email, password } = Object.fromEntries(new FormData(e.target)); const msgEl = document.getElementById('signupMessage'); try { const cred = await createUserWithEmailAndPassword(auth, email, password); await sendEmailVerification(cred.user); await signOut(auth); msgEl.textContent = 'Account created! Please verify your email.'; } catch (error) { msgEl.textContent = error.message; } };
const handleLogout = async () => { await updateUserPresence(false); await signOut(auth); };

// --- App Initialization & Auth State ---
onAuthStateChanged(auth, async (user) => {
  if (user && user.emailVerified) {
    currentUser = { uid: user.uid, displayName: user.displayName || user.email.split('@')[0], email: user.email, photoURL: user.photoURL || `https://i.pravatar.cc/40?u=${user.uid}` };
    DOMElements.app.classList.remove('hidden');
    DOMElements.loginModal.classList.add('hidden');
    [DOMElements.userAvatar, DOMElements.sidebarAvatar, DOMElements.composerAvatar].forEach(el => el.src = currentUser.photoURL);
    DOMElements.profileName.textContent = currentUser.displayName;
    await updateUserPresence(true);
    listenForPosts();
    listenForOnlineUsers();
    updateStatus('Online', 'online');
  } else {
    currentUser = null;
    DOMElements.app.classList.add('hidden');
    DOMElements.loginModal.classList.remove('hidden');
    if (postsListenerUnsubscribe) postsListenerUnsubscribe();
    if (onlineUsersListener) onlineUsersListener();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  setupAuthEventListeners();
  DOMElements.postButton.addEventListener('click', createPost);
  DOMElements.chatInputForm.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(); });
  DOMElements.chatInput.addEventListener('input', () => { clearTimeout(typingTimer); updateTypingStatus(true); typingTimer = setTimeout(() => updateTypingStatus(false), 2000); });
  document.getElementById('closeChatModal').addEventListener('click', closeChat);
  
  // Initialize draggable functionality
  makeDraggable(DOMElements.chatContainer, DOMElements.chatHeader);
});

window.addEventListener('beforeunload', () => { if (auth.currentUser) { updateUserPresence(false); } });

