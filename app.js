import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, 
  sendEmailVerification, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
  getFirestore, collection, query, onSnapshot, doc, getDoc, setDoc, addDoc, orderBy, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBytov9p2TGFudvnwQZ1hSi5f9oXaSKDAQ",
  authDomain: "deepnet-social-backend.firebaseapp.com",
  projectId: "deepnet-social-backend",
  storageBucket: "deepnet-social-backend.firebasestorage.app",
  messagingSenderId: "689173633913",
  appId: "1:689173633913:web:b5290dc64ea8fd2b2f2da8",
  measurementId: "G-B1ENWRY6JK"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ================= Helpers =================
function showNotification(msg, type='success') {
  const n = document.getElementById('notification');
  n.textContent = msg; n.className = `notification ${type} show`;
  setTimeout(() => n.classList.remove('show'), 3000);
}
function switchAuthTab(tab){
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('signupForm').classList.toggle('hidden', tab !== 'signup');
}
function closeLoginModal(){ document.getElementById('loginModal').style.display = 'none'; }
function openLoginModal(){ document.getElementById('loginModal').style.display = 'block'; }
function showApp(){ document.getElementById('app').classList.remove('hidden'); closeLoginModal(); }

// ==================== Chat UI Elements and State ====================
const chatModal = document.getElementById('chatModal');
const chatUserName = document.getElementById('chatUserName');
const chatCloseBtn = document.getElementById('chatCloseBtn');
const chatMessages = document.getElementById('chatMessages');
const chatInputForm = document.getElementById('chatInputForm');
const chatInput = document.getElementById('chatInput');
const usersList = document.getElementById('usersList');

let currentChatId = null;
let chatListenerUnsubscribe = null;

// ==================== Authentication Handlers ====================

// SIGNUP with user document creation for users collection
document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = e.target.email.value.trim();
  const password = e.target.password.value.trim();
  const msg = document.getElementById('signupMessage');

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(cred.user);
    // Add user to Firestore users collection
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      email: cred.user.email
    });
    msg.className = 'auth-message success';
    msg.textContent = "✅ Account created. Verification email sent. Please verify before logging in.";
    await signOut(auth);
    e.target.reset();
  } catch(err){
    msg.className = 'auth-message error';
    msg.textContent = `❌ ${err.message}`;
  }
});

// LOGIN
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = e.target.email.value.trim();
  const password = e.target.password.value.trim();
  const msg = document.getElementById('loginMessage');

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    if(!cred.user.emailVerified){
      await signOut(auth);
      msg.className='auth-message error';
      msg.innerHTML = `
        ❌ Email not verified.
        <br><button id="resendBtn">Resend verification email</button>
      `;
      document.getElementById('resendBtn').onclick = async () => {
        try {
          const temp = await signInWithEmailAndPassword(auth,email,password);
          await sendEmailVerification(temp.user);
          await signOut(auth);
          showNotification("Verification email resent!");
        } catch(e2){ showNotification("Failed: " + e2.message,'error'); }
      };
      return;
    }
    msg.className='auth-message success';
    msg.textContent = "✅ Login successful!";
    e.target.reset();
    setTimeout(()=>document.getElementById('loginModal').classList.add('hidden'),800);
  } catch(err){
    msg.className='auth-message error';
    msg.textContent = `❌ ${err.message}`;
  }
});

// AUTH STATE CHANGED
onAuthStateChanged(auth, user => {
  const loginModal = document.getElementById('loginModal');
  const appDiv = document.getElementById('app');
  const avatarEl = document.getElementById('currentUserAvatar');

  if (user && user.emailVerified) {
    loginModal.classList.add('hidden');
    appDiv.classList.remove('hidden');
    avatarEl.textContent = user.email[0].toUpperCase();

    renderPosts();
    listenForUsers();  // NEW: start listening for user list to enable chats
  } else {
    loginModal.classList.remove('hidden');
    appDiv.classList.add('hidden');
    avatarEl.textContent = '👤';
    if(chatListenerUnsubscribe) chatListenerUnsubscribe();
    chatListenerUnsubscribe = null;
  }
});

// LOGOUT
window.logoutUser = async () => {
  try { await signOut(auth); showNotification('Logged out'); }
  catch(e){ showNotification('Logout failed: '+e.message,'error'); }
};

// ==================== POSTS ====================
const STORAGE_KEY = "deepnet_posts";
function getPosts(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY))||[]; } catch{ return []; } }
function setPosts(p){ localStorage.setItem(STORAGE_KEY,JSON.stringify(p)); }

function createPost(){
  const user = auth.currentUser;
  if(!user || !user.emailVerified) { alert("Verify email first!"); return; }

  const content = document.getElementById('postContent').value.trim();
  if(!content) return;

  const post = {
    id: Date.now().toString(),
    content,
    authorName: user.email.split('@')[0],
    authorEmail: user.email,
    authorAvatar: `https://i.pravatar.cc/40?u=${user.uid}`,
    createdAt: new Date().toISOString(),
    likes:0, likedBy:[], commentList:[]
  };

  const posts = getPosts();
  posts.unshift(post);
  setPosts(posts);
  document.getElementById('postContent').value='';
  renderPosts();
}

function renderPosts(){
  const container = document.getElementById('postsContainer');
  container.innerHTML='';
  getPosts().forEach(p=>{
    const div = document.createElement('div');
    div.className='card post';
    div.dataset.postId = p.id;
    const isLiked = p.likedBy.includes(auth.currentUser?.uid);
    div.innerHTML=`
      <div class="post-header">
        <img src="${p.authorAvatar}" class="user-avatar">
        <b>${p.authorName}</b> <small>${new Date(p.createdAt).toLocaleString()}</small>
      </div>
      <div class="post-content">${p.content}</div>
      <div class="post-stats">
        <span>${p.likes} reactions • <span class="comment-count">${p.commentList.length}</span> comments</span>
      </div>
      <div class="post-actions">
        <button onclick="toggleLike('${p.id}')" class="${isLiked?'liked':''}">👍 Like</button>
        <button onclick="focusCommentInput('${p.id}')">💬 Comment</button>
      </div>
      <div class="comments">
        <div class="comment-list"></div>
        <input class="comment-input" placeholder="Write a comment..." onkeydown="commentKeydown(event,'${p.id}')">
      </div>
    `;
    container.appendChild(div);
    renderComments(div,p);
  });
}

function toggleLike(postId){
  const posts = getPosts();
  const idx = posts.findIndex(p=>p.id===postId); if(idx===-1) return;
  const uid = auth.currentUser?.uid; if(!uid) return;
  const liked = posts[idx].likedBy.includes(uid);
  liked ? (posts[idx].likedBy = posts[idx].likedBy.filter(x=>x!==uid), posts[idx].likes--) : (posts[idx].likedBy.push(uid), posts[idx].likes++);
  setPosts(posts); renderPosts();
}

function focusCommentInput(postId){ document.querySelector(`[data-post-id="${postId}"] .comment-input`).focus(); }
function commentKeydown(e,postId){ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); addComment(postId); } }
function addComment(postId){
  const posts = getPosts();
  const idx = posts.findIndex(p=>p.id===postId); if(idx===-1) return;
  const input = document.querySelector(`[data-post-id="${postId}"] .comment-input`);
  const text = input.value.trim(); if(!text) return;
  posts[idx].commentList.push({ userId:auth.currentUser.uid, author:auth.currentUser.email.split('@')[0], text, createdAt:new Date().toISOString() });
  setPosts(posts); renderPosts();
}
function renderComments(postEl, post){
  const list = postEl.querySelector('.comment-list'); list.innerHTML='';
  (post.commentList||[]).forEach((c,idx)=>{
    const item = document.createElement('div');
    item.innerHTML = `<b>${c.author}</b>: ${c.text} ${auth.currentUser?.uid===c.userId?`<button onclick="deleteComment('${post.id}',${idx})">Delete</button>`:''}`;
    list.appendChild(item);
  });
}
function deleteComment(postId,idx){ const posts=getPosts(); const i=posts.findIndex(p=>p.id===postId); if(i===-1) return; if(auth.currentUser.uid!==posts[i].commentList[idx].userId) return alert("Not allowed"); posts[i].commentList.splice(idx,1); setPosts(posts); renderPosts(); }

// ============== USER MESSAGING FEATURE ===================

// Listen for all users to populate user list in sidebar
function listenForUsers() {
  const usersRef = collection(db, 'users');
  const q = query(usersRef);
  onSnapshot(q, snapshot => {
    usersList.innerHTML = '';
    snapshot.forEach(doc => {
      const user = doc.data();
      if (user.uid === auth.currentUser.uid) return; // Skip current user
      const userElem = document.createElement('a');
      userElem.href = "#";
      userElem.textContent = user.email.split('@')[0];
      userElem.style.display = "block";
      userElem.style.cursor = "pointer";
      userElem.style.margin = "5px 0";
      userElem.onclick = (e) => {
        e.preventDefault();
        openChat(user.uid, user.email.split('@')[0]);
      };
      usersList.appendChild(userElem);
    });
  });
}

// Open chat modal for user and listen for messages
async function openChat(targetUserId, targetUserName) {
  if (chatListenerUnsubscribe) chatListenerUnsubscribe();
  currentChatId = [auth.currentUser.uid, targetUserId].sort().join('_');

  const chatRef = doc(db, 'chats', currentChatId);
  const chatDoc = await getDoc(chatRef);

  if (!chatDoc.exists()) {
    await setDoc(chatRef, {
      participants: [auth.currentUser.uid, targetUserId],
      createdAt: serverTimestamp()
    });
  }

  chatUserName.textContent = targetUserName;
  chatModal.classList.remove('hidden');
  chatMessages.innerHTML = '';

  const messagesRef = collection(db, 'chats', currentChatId, 'messages');
  const messagesQuery = query(messagesRef, orderBy('createdAt', 'asc'));

  chatListenerUnsubscribe = onSnapshot(messagesQuery, (snapshot) => {
    chatMessages.innerHTML = '';
    snapshot.forEach(doc => {
      const msg = doc.data();
      const msgDiv = document.createElement('div');
      msgDiv.textContent = `${msg.senderId === auth.currentUser.uid ? 'You: ' : targetUserName + ': '}${msg.text}`;
      chatMessages.appendChild(msgDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  });
}

// Close chat modal button listener
chatCloseBtn.addEventListener('click', () => {
  chatModal.classList.add('hidden');
  chatInput.value = '';
  if (chatListenerUnsubscribe) chatListenerUnsubscribe();
  chatListenerUnsubscribe = null;
  currentChatId = null;
});

// Send message form handler
chatInputForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentChatId || !chatInput.value.trim()) return;

  const messagesRef = collection(db, 'chats', currentChatId, 'messages');
  await addDoc(messagesRef, {
    text: chatInput.value.trim(),
    senderId: auth.currentUser.uid,
    createdAt: serverTimestamp()
  });
  chatInput.value = '';
});
