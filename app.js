// --- Firebase Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  onAuthStateChanged, signOut, sendEmailVerification 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, doc, getDoc, deleteDoc, updateDoc, 
  query, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove, 
  increment, setDoc, where, limit, getDocs
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const firebaseConfig = { apiKey: "AIzaSyALLWz-xkvroabNu_ug6ZVdDEmNF3O2eJs", authDomain: "deep-9656b.firebaseapp.com", projectId: "deep-9656b", storageBucket: "deep-9656b.firebasestorage.app", messagingSenderId: "786248126233", appId: "1:786248126233:web:be8ebed2a68281204eff88" };
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    let currentUser = null;
    let postsListener = null, usersListener = null, chatListener = null, typingListener = null, notificationsListener = null;
    let currentChatUser = null;
    let typingTimer = null;

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

    const showToast = (message, type = 'success') => { DOMElements.notification.textContent = message; DOMElements.notification.className = `toast-notification ${type}`; DOMElements.notification.classList.add('show'); setTimeout(() => DOMElements.notification.classList.remove('show'), 3000); };
    const formatTime = (ts) => { if (!ts?.toDate) return 'a moment ago'; const d = ts.toDate(), now = new Date(), diff = now - d; if (diff < 60000) return 'Just now'; if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`; if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`; return d.toLocaleDateString('en-US',{day:'numeric',month:'short'}); };
    const getChatId = (uid1, uid2) => [uid1, uid2].sort().join('_');
    const applyTheme = (theme) => { DOMElements.html.setAttribute('data-color-scheme', theme); DOMElements.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙'; localStorage.setItem('theme', theme); };
    const toggleTheme = () => { applyTheme((DOMElements.html.getAttribute('data-color-scheme') || 'light') === 'dark' ? 'light' : 'dark'); };

    const createNotification = async (recipientId, type, contentSnippet = null, postId = null) => { if (recipientId === currentUser.uid) return; try { await addDoc(collection(db, 'notifications'), { recipientId, senderId: currentUser.uid, senderName: currentUser.displayName, type, contentSnippet, postId, read: false, createdAt: serverTimestamp() }); } catch (e) { console.error("Notification Error:", e); } };
    
    const listenForNotifications = () => {
        if (notificationsListener) notificationsListener();
        const q = query(collection(db, 'notifications'), where('recipientId', '==', currentUser.uid), orderBy('createdAt', 'desc'), limit(10));
        let isFirstLoad = true;
        notificationsListener = onSnapshot(q, s => {
            const notifs = s.docs.map(d => ({ id: d.id, ...d.data() }));
            const unreadCount = notifs.filter(n => !n.read).length;
            DOMElements.notificationCount.textContent = unreadCount;
            DOMElements.notificationCount.classList.toggle('hidden', unreadCount === 0);
            if (!isFirstLoad && unreadCount > 0) {
                const bell = DOMElements.notificationsToggle;
                bell.classList.add('shake');
                setTimeout(() => bell.classList.remove('shake'), 500);
            }
            renderNotifications(notifs);
            isFirstLoad = false;
        });
    };
    
    const renderNotifications = (notifs) => { const list = DOMElements.notificationsList; list.innerHTML = ''; if (notifs.length === 0) { list.innerHTML = '<div class="no-notifications">No notifications yet.</div>'; return; } notifs.forEach(n => { const item = document.createElement('div'); item.className = `notification-item ${!n.read ? 'unread' : ''}`; item.dataset.type = n.type; item.dataset.senderId = n.senderId; if (n.postId) item.dataset.postId = n.postId; let icon='🔔', text=''; switch(n.type){ case 'like': icon='👍'; text=`<strong>${n.senderName}</strong> liked your post.`; break; case 'comment': icon='💬'; text=`<strong>${n.senderName}</strong> commented: "${n.contentSnippet}"`; break; case 'share': icon='↗️'; text=`<strong>${n.senderName}</strong> shared your post.`; break; case 'message': icon='✉️'; text=`<strong>${n.senderName}</strong> sent you a message.`; break; default: text=`New notification.`; break; } item.innerHTML = `<div class="notification-item-icon">${icon}</div><div class="notification-item-content"><p>${text}</p><div class="notification-item-time">${formatTime(n.createdAt)}</div></div>`; list.appendChild(item); }); };
    const markNotificationsAsRead = async () => { const q = query(collection(db, 'notifications'), where('recipientId', '==', currentUser.uid), where('read', '==', false)); const s = await getDocs(q); s.forEach(d => updateDoc(d.ref, { read: true })); };
    const handleNotificationClick = async (event) => { const target = event.target.closest('.notification-item'); if (!target) return; const { type, senderId, postId } = target.dataset; if (type === 'message' && senderId) { const userSnap = await getDoc(doc(db, 'users', senderId)); if (userSnap.exists()) { openChat(userSnap.data()); DOMElements.notificationsPanel.classList.add('hidden'); } else { showToast('Could not find user.', 'error'); } } if ((type === 'like' || type === 'comment' || type === 'share') && postId) { showToast('Jumping to post...'); DOMElements.notificationsPanel.classList.add('hidden'); /* Future: window.location.hash = postId; */ } };

    const makeDraggable = (element, handle) => { let p1=0,p2=0,p3=0,p4=0; handle.onmousedown = e => { e.preventDefault(); p3=e.clientX; p4=e.clientY; document.onmouseup = ()=>{document.onmouseup=null; document.onmousemove=null; document.body.classList.remove('dragging-no-select');}; document.onmousemove = e => { e.preventDefault(); p1=p3-e.clientX; p2=p4-e.clientY; p3=e.clientX; p4=e.clientY; let top=element.offsetTop-p2, left=element.offsetLeft-p1; const max_X=window.innerWidth-element.offsetWidth, max_Y=window.innerHeight-element.offsetHeight; top=Math.max(0,Math.min(top,max_Y)); left=Math.max(0,Math.min(left,max_X)); element.style.top=top+"px"; element.style.left=left+"px"; element.style.bottom='auto'; element.style.right='auto'; }; document.body.classList.add('dragging-no-select'); }; };

    const updateUserPresence = async (isOnline) => { if (!currentUser) return; await setDoc(doc(db,'users',currentUser.uid),{uid:currentUser.uid,displayName:currentUser.displayName,email:currentUser.email,photoURL:currentUser.photoURL,presence:{state:isOnline?'online':'offline',last_changed:serverTimestamp()}},{merge:true}); };
    const renderOnlineUsers = (users) => { DOMElements.onlineUsersList.innerHTML = ''; users.sort((a,b)=>(b.presence?.state==='online')-(a.presence?.state==='online')).forEach(u=>{const el=document.createElement('div');el.className='online-user-item';el.onclick=()=>openChat(u);el.innerHTML=`<div class="online-user-avatar"><img src="${u.photoURL}" class="user-avatar" alt="${u.displayName}"><div class="online-indicator" style="display:${u.presence?.state==='online'?'block':'none'}"></div></div><span class="online-user-name">${u.displayName}</span>`;DOMElements.onlineUsersList.appendChild(el);});};
    const renderMessages = (messages) => { DOMElements.messagesList.innerHTML = ''; messages.forEach(m => { const el = document.createElement('div'); el.className = `message ${m.senderId === currentUser.uid ? 'sent' : 'received'}`; el.innerHTML = `<div class="message-bubble">${m.text}</div><div class="message-timestamp">${formatTime(m.timestamp)}</div>`; DOMElements.messagesList.appendChild(el); }); DOMElements.messagesContainer.scrollTop = DOMElements.messagesContainer.scrollHeight; };
    const displayPosts = (posts) => { DOMElements.postsContainer.innerHTML = ''; if(posts.length === 0) { DOMElements.postsContainer.innerHTML = `<div class="card" style="text-align:center; padding:40px;"><h3>No posts yet. Be the first!</h3></div>`; return; } posts.forEach(p => DOMElements.postsContainer.appendChild(createPostElement(p))); };
    const renderComments = (postEl, comments = []) => { const listEl = postEl.querySelector('.comment-list'); listEl.innerHTML = ''; comments.forEach(c => { const item = document.createElement('div'); item.className = 'comment-item'; item.innerHTML = `<img src="${c.avatar}" class="comment-avatar"><div><div class="comment-body"><strong>${c.author}</strong> ${c.text}</div><div class="comment-meta">${formatTime(c.createdAt)}${c.userId === currentUser?.uid ? `<button class="delete-comment" onclick="deleteComment('${postEl.dataset.postId}', '${c.id}')">Delete</button>` : ''}</div></div>`; listEl.appendChild(item); }); };
    
    const createPostElement = (post) => { const el = document.createElement('div'); if (post.type === 'share') { el.className = 'post shared-post'; const op = post.originalPost, opId = post.originalPostId; el.innerHTML = `<div class="share-header">🧠 <strong>${post.sharerName}</strong> shared this</div><div class="post-content-wrapper"><div class="post-header"><div class="post-author-info"><img src="${op.authorAvatar}" class="user-avatar"><div><div class="post-author">${op.authorName}</div><div class="post-time">${formatTime(op.createdAt)}</div></div></div></div><div class="post-content">${(op.content||'').replace(/\n/g,'<br>')}</div><div class="post-stats"><span>${op.likes||0} Likes</span><span>${op.commentList?.length||0} Comments</span><span>${op.shareCount||0} Shares</span></div><div class="post-actions"><button class="post-action ${op.likedBy?.includes(currentUser?.uid)?'liked':''}" onclick="toggleLike('${opId}')">👍 Like</button><button class="post-action" onclick="focusCommentInput('${opId}')">💬 Comment</button><button class="post-action" onclick="sharePost('${opId}')">↗️ Share</button></div></div>`; } else { el.className = 'post'; el.dataset.postId = post.id; el.innerHTML = `<div class="post-header"><div class="post-author-info"><img src="${post.authorAvatar}" class="user-avatar"><div><div class="post-author">${post.authorName}</div><div class="post-time">${formatTime(post.createdAt)}</div></div></div>${post.authorId===currentUser?.uid?`<button class="btn-icon" onclick="deletePost('${post.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>`:''}</div><div class="post-content">${post.content.replace(/\n/g,'<br>')}</div><div class="post-stats"><span>${post.likes||0} Likes</span><span>${post.commentList?.length||0} Comments</span><span>${post.shareCount||0} Shares</span></div><div class="post-actions"><button class="post-action ${post.likedBy?.includes(currentUser?.uid)?'liked':''}" onclick="toggleLike('${post.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg> Like</button><button class="post-action" onclick="focusCommentInput('${post.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> Comment</button><button class="post-action" onclick="sharePost('${post.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg> Share</button></div><div class="comments"><div class="comment-list"></div><form class="comment-form" onsubmit="addComment(event, '${post.id}')"><input class="comment-input" type="text" placeholder="Add a comment..."><button type="submit" class="btn btn-primary btn-sm">Post</button></form></div>`; renderComments(el, post.commentList); } return el; };

    const openChat = (user) => { currentChatUser = user; DOMElements.chatUserAvatar.src = user.photoURL; DOMElements.chatUserName.textContent = user.displayName; DOMElements.chatUserStatus.textContent = user.presence?.state === 'online' ? 'Online' : 'Offline'; DOMElements.chatModal.classList.remove('hidden'); DOMElements.chatInput.focus(); const chatId = getChatId(currentUser.uid, user.uid); if (chatListener) chatListener(); const q = query(collection(db,'chats',chatId,'messages'),orderBy('timestamp','asc')); chatListener=onSnapshot(q,s=>renderMessages(s.docs.map(d=>d.data()))); if (typingListener) typingListener(); typingListener=onSnapshot(doc(db,'chats',chatId),s=>{if(!s.exists()||!currentChatUser)return;const t=s.data().typing||{};DOMElements.typingIndicator.classList.toggle('hidden',!t[currentChatUser.uid]);}); };
    const closeChat = () => { if (chatListener) chatListener(); if (typingListener) typingListener(); currentChatUser = null; DOMElements.chatModal.classList.add('hidden'); };
    const sendMessage = async () => { const text=DOMElements.chatInput.value.trim(); if(!text||!currentChatUser)return; DOMElements.chatInput.value='';const chatId=getChatId(currentUser.uid,currentChatUser.uid); await addDoc(collection(db,'chats',chatId,'messages'),{text,senderId:currentUser.uid,timestamp:serverTimestamp()}); await setDoc(doc(db,'chats',chatId),{participants:[currentUser.uid,currentChatUser.uid],lastMessage:text},{merge:true}); createNotification(currentChatUser.uid,'message',text); };
    const updateTypingStatus = async (isTyping) => { if (!currentChatUser) return; await setDoc(doc(db,'chats',getChatId(currentUser.uid,currentChatUser.uid)),{typing:{[currentUser.uid]:isTyping}},{merge:true}); };
    
    window.createPost = async () => { const c=DOMElements.postInput.value.trim(); if(!c)return; DOMElements.postButton.disabled=true; await addDoc(collection(db,'posts'),{type:'original',authorId:currentUser.uid,authorName:currentUser.displayName,authorAvatar:currentUser.photoURL,content:c,createdAt:serverTimestamp(),likes:0,likedBy:[],commentList:[],shareCount:0}); DOMElements.postInput.value=''; DOMElements.postButton.disabled=false; };
    window.deletePost = async(id)=>{if(confirm('Delete post?')){await deleteDoc(doc(db,"posts",id));showToast('Post deleted.');}};
    window.toggleLike = async(id)=>{const ref=doc(db,'posts',id);const snap=await getDoc(ref);if(!snap.exists())return;const data=snap.data();if(data.likedBy?.includes(currentUser.uid)){await updateDoc(ref,{likedBy:arrayRemove(currentUser.uid),likes:increment(-1)})}else{await updateDoc(ref,{likedBy:arrayUnion(currentUser.uid),likes:increment(1)});createNotification(data.authorId,'like',null,id)}};
    window.sharePost = async(id)=>{const ref=doc(db,'posts',id);const snap=await getDoc(ref);if(!snap.exists())return showToast('Post not found.','error');const data=snap.data();await addDoc(collection(db,'posts'),{type:'share',sharerId:currentUser.uid,sharerName:currentUser.displayName,createdAt:serverTimestamp(),originalPostId:id,originalPost:data});await updateDoc(ref,{shareCount:increment(1)});createNotification(data.authorId,'share',null,id);showToast('Post shared!');};
    window.focusCommentInput = (id)=>document.querySelector(`[data-post-id="${id}"] .comment-input`).focus();
    window.addComment = async(e,id)=>{e.preventDefault();const input=e.target.querySelector('.comment-input'),text=input.value.trim();if(!text)return;const c={id:doc(collection(db,'tmp')).id,userId:currentUser.uid,author:currentUser.displayName,avatar:currentUser.photoURL,text,createdAt:new Date()};const ref=doc(db,'posts',id);await updateDoc(ref,{commentList:arrayUnion(c)});input.value='';const snap=await getDoc(ref);createNotification(snap.data().authorId,'comment',text,id)};
    window.deleteComment = async(pid,cid)=>{const ref=doc(db,'posts',pid);const snap=await getDoc(ref);if(!snap.exists())return;const c=snap.data().commentList.find(c=>c.id===cid);if(c){await updateDoc(ref,{commentList:arrayRemove(c)})}};
    
    const setupAuthEventListeners=()=>{document.getElementById('loginTab').addEventListener('click',()=>switchAuthTab('login'));document.getElementById('signupTab').addEventListener('click',()=>switchAuthTab('signup'));document.getElementById('logoutBtn').addEventListener('click',handleLogout);document.getElementById('loginForm').addEventListener('submit',handleLogin);document.getElementById('signupForm').addEventListener('submit',handleSignup)};
    const switchAuthTab=(tab)=>{document.getElementById('loginForm').classList.toggle('hidden',tab!=='login');document.getElementById('signupForm').classList.toggle('hidden',tab==='login');document.getElementById('loginTab').classList.toggle('active',tab==='login');document.getElementById('signupTab').classList.toggle('active',tab!=='login')};
    const handleLogin=async(e)=>{e.preventDefault();const {email,password}=Object.fromEntries(new FormData(e.target));try{const c=await signInWithEmailAndPassword(auth,email,password);if(!c.user.emailVerified){await signOut(auth);document.getElementById('loginMessage').textContent='Please verify your email.'}}catch(err){document.getElementById('loginMessage').textContent=err.message}};
    const handleSignup=async(e)=>{e.preventDefault();const {email,password}=Object.fromEntries(new FormData(e.target));try{const c=await createUserWithEmailAndPassword(auth,email,password);await sendEmailVerification(c.user);await signOut(auth);document.getElementById('signupMessage').textContent='Account created! Please verify your email.'}catch(err){document.getElementById('signupMessage').textContent=err.message}};
    const handleLogout=async()=>{await updateUserPresence(false);await signOut(auth)};

    onAuthStateChanged(auth, async (user) => {
        if (user && user.emailVerified) {
            currentUser={uid:user.uid,displayName:user.displayName||user.email.split('@')[0],email:user.email,photoURL:user.photoURL||`https://i.pravatar.cc/40?u=${user.uid}`};
            DOMElements.app.classList.remove('hidden');
            DOMElements.loginModal.classList.add('hidden');
            [DOMElements.userAvatar,DOMElements.sidebarAvatar,DOMElements.composerAvatar].forEach(el=>el.src=currentUser.photoURL);
            DOMElements.profileName.textContent=currentUser.displayName;
            await updateUserPresence(true);
            if(postsListener)postsListener();const qp=query(collection(db,'posts'),orderBy('createdAt','desc'));postsListener=onSnapshot(qp,s=>displayPosts(s.docs.map(d=>({id:d.id,...d.data()}))));
            if(usersListener)usersListener();const qu=query(collection(db,'users'));usersListener=onSnapshot(qu,s=>renderOnlineUsers(s.docs.map(d=>d.data()).filter(u=>u.uid!==currentUser?.uid)));
            listenForNotifications();
        } else {
            currentUser=null;
            DOMElements.app.classList.add('hidden');
            DOMElements.loginModal.classList.remove('hidden');
            if(postsListener)postsListener();
            if(usersListener)usersListener();
            if(notificationsListener)notificationsListener();
        }
    });

    setupAuthEventListeners();
    applyTheme(localStorage.getItem('theme') || 'dark'); // Default to dark mode
    DOMElements.themeToggle.addEventListener('click', toggleTheme);
    DOMElements.notificationsToggle.addEventListener('click', () => { DOMElements.notificationsPanel.classList.toggle('hidden'); if (!DOMElements.notificationsPanel.classList.contains('hidden')) markNotificationsAsRead(); });
    DOMElements.notificationsList.addEventListener('click', handleNotificationClick);
    DOMElements.postButton.addEventListener('click', window.createPost);
    DOMElements.chatInputForm.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(); });
    DOMElements.chatInput.addEventListener('input', () => { clearTimeout(typingTimer); updateTypingStatus(true); typingTimer = setTimeout(() => updateTypingStatus(false), 2000); });
    document.getElementById('closeChatModal').addEventListener('click', closeChat);
    makeDraggable(DOMElements.chatContainer, DOMElements.chatHeader);
    window.addEventListener('beforeunload', () => { if (auth.currentUser) { updateUserPresence(false); } });
});

