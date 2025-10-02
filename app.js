// === Firebase SDK Imports (from import-map in index.html) ===
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, updateDoc, doc, setDoc, getDoc, arrayUnion, arrayRemove } from "firebase/firestore";

const App = {
    // === Firebase Config ===
    firebaseConfig: {
        apiKey: "AIzaSyALLWz-xkvroabNu_ug6ZVdDEmNF3O2eJs",
        authDomain: "deep-9656b.firebaseapp.com",
        projectId: "deep-9656b",
        storageBucket: "deep-9656b.firebasestorage.app",
        messagingSenderId: "786248126233",
        appId: "1:786248126233:web:be8ebed2a68281204eff88",
        measurementId: "G-FWC45EBFFP"
    },

    // === App State ===
    db: null,
    auth: null,
    analytics: null,
    isLoginMode: true,
    currentUser: null,
    postsListener: () => {},
    usersListener: () => {},
    chatListener: () => {},
    currentChatId: null,

    // === DOM Elements ===
    elements: {},

    // === App Initialization ===
    init() {
        const app = initializeApp(this.firebaseConfig);
        this.auth = getAuth(app);
        this.db = getFirestore(app);
        this.analytics = getAnalytics(app);
        
        this.cacheDOMElements();
        this.initEventListeners();
        this.handleAuthState();
    },

    cacheDOMElements() {
        this.elements = {
            // Auth
            authDialog: document.getElementById("authDialog"),
            authTitle: document.getElementById("authTitle"),
            authForm: document.getElementById("authForm"),
            authEmail: document.getElementById("authEmail"),
            authPassword: document.getElementById("authPassword"),
            authActionBtn: document.getElementById("authActionBtn"),
            toggleAuthModeBtn: document.getElementById("toggleAuthModeBtn"),
            authMessage: document.getElementById("authMessage"),
            logoutBtn: document.getElementById("logoutBtn"),
            // Main Content
            mainContent: document.getElementById("mainContent"),
            // Posts
            postForm: document.getElementById("postForm"),
            postInput: document.getElementById("postInput"),
            postsContainer: document.getElementById("postsContainer"),
            // Users & Chat
            usersList: document.getElementById("usersList"),
            chatDialog: document.getElementById("chatDialog"),
            chatUserName: document.getElementById("chatUserName"),
            chatCloseBtn: document.getElementById("chatCloseBtn"),
            chatMessages: document.getElementById("chatMessages"),
            chatInputForm: document.getElementById("chatInputForm"),
            chatInput: document.getElementById("chatInput"),
        };
    },
    
    // ... (initEventListeners and other methods remain the same) ...
     initEventListeners() {
        this.elements.toggleAuthModeBtn.addEventListener("click", () => this.toggleAuthMode());
        this.elements.authForm.addEventListener("submit", (e) => this.handleAuthAction(e));
        this.elements.logoutBtn.addEventListener("click", () => signOut(this.auth));
        this.elements.postForm.addEventListener("submit", (e) => this.createPost(e));

        this.elements.postsContainer.addEventListener("click", (e) => {
            const likeButton = e.target.closest("[data-like-id]");
            const deleteButton = e.target.closest("[data-delete-comment-id]");
            if (likeButton) this.toggleLike(likeButton.dataset.likeId);
            if (deleteButton) this.deleteComment(deleteButton.dataset.deleteCommentId, deleteButton.dataset.commentIndex);
        });
        this.elements.postsContainer.addEventListener("submit", (e) => {
            if (e.target.matches(".comment-form")) this.addComment(e);
        });

        this.elements.chatCloseBtn.addEventListener("click", () => this.closeChat());
        this.elements.chatInputForm.addEventListener("submit", (e) => this.sendMessage(e));
    },

    // === Authentication ===
    handleAuthState() {
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                this.currentUser = user;
                this.elements.authDialog.close();
                this.elements.mainContent.classList.remove("hidden");
                this.elements.logoutBtn.classList.remove("hidden");
                this.listenForPosts();
                this.listenForUsers();
            } else {
                this.currentUser = null;
                this.elements.mainContent.classList.add("hidden");
                this.elements.logoutBtn.classList.add("hidden");
                // Check if dialog is already open to prevent errors
                if (!this.elements.authDialog.open) {
                    this.elements.authDialog.showModal();
                }
                this.postsListener(); // Unsubscribe
                this.usersListener(); // Unsubscribe
                this.closeChat();
            }
        });
    },

    toggleAuthMode() {
        this.isLoginMode = !this.isLoginMode;
        this.elements.authTitle.textContent = this.isLoginMode ? "Login" : "Sign Up";
        this.elements.authActionBtn.textContent = this.isLoginMode ? "Login" : "Sign Up";
        this.elements.toggleAuthModeBtn.textContent = this.isLoginMode ? "Don’t have an account? Sign up" : "Already have an account? Login";
        this.elements.authMessage.textContent = "";
        this.elements.authForm.reset();
    },

    // =================================================================
    // === THIS IS THE CORRECTED FUNCTION ===
    // =================================================================
    async handleAuthAction(e) {
        e.preventDefault();
        const email = this.elements.authEmail.value;
        const password = this.elements.authPassword.value;
        this.elements.authActionBtn.disabled = true; // Prevent double submission
        this.elements.authMessage.textContent = "";

        try {
            if (this.isLoginMode) {
                await signInWithEmailAndPassword(this.auth, email, password);
            } else {
                // Step 1: Create the user in Firebase Auth
                const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
                const user = userCredential.user;

                // Step 2 (FIX): Update the new user's Auth profile with a display name
                // We'll derive a name from the email for simplicity
                const displayName = email.split('@')[0];
                await updateProfile(user, { displayName });

                // Step 3 (FIX): Create the user document in the 'users' collection in Firestore
                // This is what other users' listeners will detect
                await setDoc(doc(this.db, "users", user.uid), {
                    uid: user.uid,
                    email: user.email,
                    displayName: displayName
                });
            }
            this.elements.authForm.reset();
        } catch (err) {
            this.elements.authMessage.textContent = err.message;
        } finally {
            this.elements.authActionBtn.disabled = false; // Re-enable button
        }
    },
    // =================================================================
    // === END OF CORRECTION ===
    // =================================================================

    // === Posts & Comments ===
    async createPost(e) {
        e.preventDefault();
        const content = this.elements.postInput.value.trim();
        if (!content || !this.currentUser) return;
        try {
            await addDoc(collection(this.db, "posts"), {
                content,
                authorId: this.currentUser.uid,
                authorEmail: this.currentUser.email,
                authorName: this.currentUser.displayName || this.currentUser.email.split('@')[0], // Use displayName
                createdAt: serverTimestamp(),
                likes: [],
                comments: []
            });
            this.elements.postForm.reset();
        } catch (error) {
            console.error("Error creating post:", error);
        }
    },

    listenForPosts() {
        const q = query(collection(this.db, "posts"), orderBy("createdAt", "desc"));
        this.postsListener = onSnapshot(q, (snapshot) => {
            this.elements.postsContainer.innerHTML = "";
            snapshot.forEach(docSnap => {
                const postEl = this.createPostElement(docSnap.id, docSnap.data());
                this.elements.postsContainer.appendChild(postEl);
            });
        });
    },

    createPostElement(id, post) {
        const postEl = document.createElement("article");
        postEl.className = "card post";
        const liked = post.likes.includes(this.currentUser.uid);
        const time = post.createdAt?.toDate().toLocaleString() || "just now";
        const authorName = post.authorName || post.authorEmail; // Fallback to email

        postEl.innerHTML = `
            <header class="post-header">
                <div><div class="post-author">${authorName}</div><div class="post-time">${time}</div></div>
            </header>
            <div class="post-content"></div>
            <footer class="post-actions">
                <button class="post-action ${liked ? "liked" : ""}" data-like-id="${id}">👍 ${post.likes.length}</button>
                <button class="post-action">💬 ${post.comments.length}</button>
            </footer>
            <div class="comments"></div>`;
        postEl.querySelector('.post-content').textContent = post.content;
        
        const commentsContainer = postEl.querySelector('.comments');
        (post.comments || []).forEach((comment, index) => {
            commentsContainer.appendChild(this.createCommentElement(id, index, comment));
        });

        const commentForm = document.createElement('form');
        commentForm.className = 'comment-form';
        commentForm.dataset.postId = id;
        commentForm.innerHTML = `
            <label for="comment-input-${id}" class="visually-hidden">Write a comment</label>
            <input id="comment-input-${id}" class="comment-input" placeholder="Write a comment..." required />
            <button class="comment-btn" type="submit">Post</button>`;
        commentsContainer.appendChild(commentForm);

        return postEl;
    },
    
    createCommentElement(postId, index, comment) {
        const commentEl = document.createElement('div');
        commentEl.className = 'comment-item';
        const authorName = comment.userName || comment.userEmail;
        commentEl.innerHTML = `
            <div class="comment-avatar">${authorName[0].toUpperCase()}</div>
            <div>
                <div class="comment-body"></div>
                <div class="comment-meta">
                    <strong>${authorName}</strong>
                    ${comment.uid === this.currentUser.uid ? `<button class="delete-comment" data-delete-comment-id="${postId}" data-comment-index="${index}">Delete</button>` : ""}
                </div>
            </div>`;
        commentEl.querySelector('.comment-body').textContent = comment.text;
        return commentEl;
    },

    async toggleLike(postId) {
        if (!this.currentUser) return;
        const ref = doc(this.db, "posts", postId);
        const postSnap = await getDoc(ref);
        if (!postSnap.exists()) return;
        const likes = postSnap.data().likes || [];
        const newLikes = likes.includes(this.currentUser.uid) ? arrayRemove(this.currentUser.uid) : arrayUnion(this.currentUser.uid);
        await updateDoc(ref, { likes: newLikes });
    },

    async addComment(e) {
        e.preventDefault();
        const form = e.target;
        const input = form.querySelector('input');
        const text = input.value.trim();
        const postId = form.dataset.postId;
        if (!text || !this.currentUser) return;
        const newComment = { 
            uid: this.currentUser.uid, 
            userEmail: this.currentUser.email,
            userName: this.currentUser.displayName || this.currentUser.email.split('@')[0],
            text 
        };
        const ref = doc(this.db, "posts", postId);
        await updateDoc(ref, { comments: arrayUnion(newComment) });
        form.reset();
    },

    async deleteComment(postId, index) {
        const ref = doc(this.db, "posts", postId);
        const postSnap = await getDoc(ref);
        if (!postSnap.exists()) return;
        const postData = postSnap.data();
        if (postData.comments[index].uid !== this.currentUser.uid) return;
        const newComments = [...postData.comments];
        newComments.splice(index, 1);
        await updateDoc(ref, { comments: newComments });
    },

    // === Users & Chat ===
    listenForUsers() {
        const q = query(collection(this.db, "users"));
        this.usersListener = onSnapshot(q, (snapshot) => {
            this.elements.usersList.innerHTML = '';
            snapshot.forEach((docSnap) => {
                const user = docSnap.data();
                if (user.uid === this.currentUser.uid) return;
                const userEl = document.createElement('a');
                userEl.href = "#";
                userEl.className = "user-item";
                userEl.textContent = user.displayName || user.email; // Use displayName
                userEl.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.openChat(user.uid, user.displayName || user.email);
                });
                this.elements.usersList.appendChild(userEl);
            });
        });
    },

    async openChat(targetUserId, targetUserName) {
        this.chatListener();
        this.currentChatId = [this.currentUser.uid, targetUserId].sort().join('_');
        const chatRef = doc(this.db, 'chats', this.currentChatId);
        const chatSnap = await getDoc(chatRef);
        if (!chatSnap.exists()) {
            await setDoc(chatRef, { 
                participants: [this.currentUser.uid, targetUserId],
                participantNames: {
                    [this.currentUser.uid]: this.currentUser.displayName,
                    [targetUserId]: targetUserName
                }
            });
        }
        this.elements.chatUserName.textContent = `Chat with ${targetUserName}`;
        this.elements.chatDialog.showModal();
        const messagesQuery = query(collection(this.db, 'chats', this.currentChatId, 'messages'), orderBy('createdAt', 'asc'));
        this.chatListener = onSnapshot(messagesQuery, (snapshot) => {
            this.elements.chatMessages.innerHTML = '';
            snapshot.forEach(doc => {
                const msg = doc.data();
                const bubble = document.createElement('div');
                bubble.className = 'message-bubble';
                bubble.textContent = msg.text;
                bubble.classList.add(msg.senderId === this.currentUser.uid ? 'sent' : 'received');
                this.elements.chatMessages.appendChild(bubble);
            });
            this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
        });
    },
    
    closeChat() {
        if(this.chatListener) this.chatListener();
        this.currentChatId = null;
        if(this.elements.chatDialog.open) {
            this.elements.chatDialog.close();
        }
    },
    
    async sendMessage(e) {
        e.preventDefault();
        const text = this.elements.chatInput.value.trim();
        if (!text || !this.currentChatId) return;
        this.elements.chatInputForm.reset();
        await addDoc(collection(this.db, 'chats', this.currentChatId, 'messages'), {
            text,
            senderId: this.currentUser.uid,
            senderName: this.currentUser.displayName || this.currentUser.email.split('@')[0],
            createdAt: serverTimestamp()
        });
    },
};

App.init();

