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
  setDoc,
  where
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Firebase Configuration (Replace with your actual config)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Global State ---
let currentUser = null;
let postsListenerUnsubscribe = null;
let allUsersListenerUnsubscribe = null;
let messagesListenerUnsubscribe = null;
let typingListenerUnsubscribe = null;
let activeChatId = null;
let activeChatRecipient = null;
let lastReceivedMessageText = null;

// --- DOM Elements ---
const loginModal = document.getElementById('login-modal');
const appDiv = document.getElementById('app');
const authMessage = document.getElementById('auth-message');
const postsContainer = document.getElementById('posts-container');
const onlineUsersList = document.getElementById('online-users-list');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const postContentTextArea = document.getElementById('post-content');

// Chat Widget Elements
const chatWidget = document.getElementById('chat-widget');
const chatRecipientName = document.getElementById('chat-recipient-name');
const chatRecipientAvatar = document.getElementById('chat-recipient-avatar');
const chatRecipientStatus = document.getElementById('chat-recipient-status');
const closeChatBtn = document.getElementById('close-chat');
const messagesList = document.getElementById('messages-list');
const messageInput = document.getElementById('message-input');
const sendMessageBtn = document.getElementById('send-message-btn');
const typingIndicator = document.getElementById('typing-indicator');

// Gemini AI Elements
const aiPostModal = document.getElementById('ai-post-modal');
const aiSuggestReplyBtn = document.getElementById('ai-suggest-reply-btn');
const aiReplySuggestionsContainer = document.getElementById('ai-reply-suggestions');


// --- Gemini API Function ---
async function callGemini(prompt, buttonToDisable = null) {
    if (buttonToDisable) {
        buttonToDisable.disabled = true;
        buttonToDisable.textContent = 'Generating...';
    }
    
    const apiKey = ""; // This will be populated by the environment
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`API Error: ${error.error.message}`);
        }

        const result = await response.json();
        const candidate = result.candidates?.[0];

        if (candidate && candidate.content?.parts?.[0]?.text) {
            return candidate.content.parts[0].text;
        } else {
            throw new Error("No content generated or unexpected response structure.");
        }
    } catch (error) {
        console.error("Gemini API call failed:", error);
        showNotification(`AI Error: ${error.message}`);
        return null;
    } finally {
        if (buttonToDisable) {
            buttonToDisable.disabled = false;
        }
    }
}


// --- Utility Functions ---
function showNotification(message) {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.classList.add('show');
  setTimeout(() => {
    notification.classList.remove('show');
  }, 4000);
}

function updateStatus(text, status) {
  statusText.textContent = text;
  statusIndicator.className = `status-indicator ${status}`;
}

function formatTimestamp(timestamp) {
  if (!timestamp) return 'Just now';
  return new Date(timestamp.seconds * 1000).toLocaleString();
}

// --- Authentication ---
function setupAuthEventListeners() {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      authMessage.className = 'auth-message error';
      authMessage.textContent = `❌ ${error.message}`;
    }
  });

  document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      authMessage.className = 'auth-message success';
      authMessage.textContent = '✅ Verification email sent! Please check your inbox.';
    } catch (error) {
      authMessage.className = 'auth-message error';
      authMessage.textContent = `❌ ${error.message}`;
    }
  });

  document.getElementById('logout-button').addEventListener('click', async () => {
    if (currentUser) {
        await updateUserPresence(false);
    }
    await signOut(auth);
  });
}

// --- User Presence ---
async function updateUserPresence(isOnline) {
    if (!currentUser) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
    try {
        await setDoc(userDocRef, {
            uid: currentUser.uid,
            displayName: currentUser.displayName || currentUser.email.split('@')[0],
            email: currentUser.email,
            photoURL: currentUser.photoURL || `https://i.pravatar.cc/40?u=${currentUser.uid}`,
            isOnline: isOnline,
            lastSeen: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error("Error updating user presence: ", error);
    }
}


// --- Data Fetching and Rendering ---
function listenForAllUsers() {
    const usersCollection = collection(db, 'users');
    allUsersListenerUnsubscribe = onSnapshot(usersCollection, (snapshot) => {
        onlineUsersList.innerHTML = '';
        const users = [];
        snapshot.forEach(doc => users.push(doc.data()));
        
        users.sort((a, b) => {
            if (a.isOnline && !b.isOnline) return -1;
            if (!a.isOnline && b.isOnline) return 1;
            return a.displayName.localeCompare(b.displayName);
        });

        users.forEach(user => {
            if (user.uid === currentUser.uid) return;
            const userElement = document.createElement('li');
            userElement.className = 'sidebar-item';
            userElement.innerHTML = `
                <img class="avatar" src="${user.photoURL}" alt="${user.displayName}">
                <span>${user.displayName}</span>
                <div class="status-dot ${user.isOnline ? 'online' : 'offline'}"></div>
            `;
            userElement.addEventListener('click', () => openChat(user));
            onlineUsersList.appendChild(userElement);
        });
    });
}

function listenForPosts() {
  const postsQuery = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
  postsListenerUnsubscribe = onSnapshot(postsQuery, (snapshot) => {
    postsContainer.innerHTML = '';
    snapshot.forEach(doc => {
      const post = doc.data();
      const postElement = document.createElement('div');
      postElement.className = 'post-card';
      postElement.innerHTML = `
        <div class="post-header">
          <img class="avatar" src="${post.authorPhotoURL}" alt="${post.authorName}">
          <div>
            <div class="post-author">${post.authorName}</div>
            <div class="post-time">${formatTimestamp(post.timestamp)}</div>
          </div>
        </div>
        <div class="post-content"><p>${post.content}</p></div>
        <div class="post-actions">
        </div>
      `;
      postsContainer.appendChild(postElement);
    });
  });
}

// --- Post Creation & AI ---
function setupPostEventListeners() {
    document.getElementById('post-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = postContentTextArea.value;
        if (content.trim() === '' || !currentUser) return;

        try {
            await addDoc(collection(db, 'posts'), {
                authorId: currentUser.uid,
                authorName: currentUser.displayName || currentUser.email.split('@')[0],
                authorPhotoURL: currentUser.photoURL || `https://i.pravatar.cc/40?u=${currentUser.uid}`,
                content: content,
                timestamp: serverTimestamp()
            });
            postContentTextArea.value = '';
        } catch (error) {
            console.error("Error adding document: ", error);
            showNotification('Error creating post.');
        }
    });

    document.getElementById('ai-generate-post-btn').addEventListener('click', () => {
        aiPostModal.classList.remove('hidden');
    });

    document.getElementById('ai-post-modal-cancel').addEventListener('click', () => {
        aiPostModal.classList.add('hidden');
    });

    document.getElementById('ai-post-modal-generate').addEventListener('click', async () => {
        const prompt = document.getElementById('ai-post-prompt').value;
        if (!prompt.trim()) {
            showNotification("Please enter a prompt for the AI.");
            return;
        }

        const generateBtn = document.getElementById('ai-post-modal-generate');
        const systemPrompt = "You are an AI assistant for DeepNet Social, a platform for AI researchers. Your task is to generate a post based on the user's prompt. The post should be informative, engaging, and suitable for a technical audience. Structure it clearly, and if appropriate, use markdown for formatting (e.g., bullet points with hyphens).";
        const fullPrompt = `${systemPrompt}\n\nUser Prompt: "${prompt}"`;
        
        const generatedContent = await callGemini(fullPrompt, generateBtn);
        generateBtn.textContent = 'Generate'; // Reset button text

        if (generatedContent) {
            postContentTextArea.value = generatedContent;
            aiPostModal.classList.add('hidden');
            document.getElementById('ai-post-prompt').value = '';
            postContentTextArea.focus();
        }
    });
}

// --- Chat Functionality & AI ---
function setupChatEventListeners() {
    closeChatBtn.addEventListener('click', closeChat);
    sendMessageBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    let typingTimeout;
    messageInput.addEventListener('input', () => {
        if (!activeChatId) return;
        updateTypingStatus(true);
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            updateTypingStatus(false);
        }, 2000);
    });

    aiSuggestReplyBtn.addEventListener('click', async () => {
        if (!lastReceivedMessageText) {
            showNotification("No message to reply to.");
            return;
        }

        const prompt = `The last message in a conversation was: "${lastReceivedMessageText}". Generate exactly three short, distinct, and context-appropriate reply suggestions. Each suggestion should be a few words. Format your response as a JSON array of strings, like ["Okay, sounds good.", "Can you explain more?", "I'll look into it."].`;
        
        aiSuggestReplyBtn.textContent = '...'; // Loading indicator
        const result = await callGemini(prompt, aiSuggestReplyBtn);
        aiSuggestReplyBtn.textContent = '✨'; // Reset icon

        if (result) {
            try {
                // Clean the response to ensure it's valid JSON
                const cleanedResult = result.replace(/```json|```/g, '').trim();
                const suggestions = JSON.parse(cleanedResult);
                
                aiReplySuggestionsContainer.innerHTML = '';
                if (Array.isArray(suggestions)) {
                    suggestions.slice(0, 3).forEach(text => {
                        const chip = document.createElement('div');
                        chip.className = 'suggestion-chip';
                        chip.textContent = text;
                        chip.onclick = () => {
                            messageInput.value = text;
                            sendMessage();
                            aiReplySuggestionsContainer.innerHTML = '';
                        };
                        aiReplySuggestionsContainer.appendChild(chip);
                    });
                }
            } catch (e) {
                console.error("Failed to parse AI suggestions:", e);
                showNotification("Could not generate valid reply suggestions.");
            }
        }
    });
}

function openChat(recipient) {
    if (!currentUser) return;
    activeChatRecipient = recipient;

    activeChatId = currentUser.uid > recipient.uid 
        ? `${currentUser.uid}_${recipient.uid}` 
        : `${recipient.uid}_${currentUser.uid}`;

    chatRecipientName.textContent = recipient.displayName;
    chatRecipientAvatar.src = recipient.photoURL;
    chatRecipientStatus.className = `status-dot ${recipient.isOnline ? 'online' : 'offline'}`;
    
    chatWidget.classList.remove('hidden');
    messageInput.focus();

    listenForMessages();
    listenForTypingStatus();
}

function closeChat() {
    chatWidget.classList.add('hidden');
    if (messagesListenerUnsubscribe) messagesListenerUnsubscribe();
    if (typingListenerUnsubscribe) typingListenerUnsubscribe();
    updateTypingStatus(false);
    activeChatId = null;
    activeChatRecipient = null;
    messagesList.innerHTML = '';
    aiReplySuggestionsContainer.innerHTML = '';
    lastReceivedMessageText = null;
}

async function sendMessage() {
    const text = messageInput.value.trim();
    if (text === '' || !currentUser || !activeChatId || !activeChatRecipient) return;
    
    messageInput.value = '';
    updateTypingStatus(false);
    aiReplySuggestionsContainer.innerHTML = ''; // Clear suggestions after sending

    try {
        const messagesColRef = collection(db, 'chats', activeChatId, 'messages');
        await addDoc(messagesColRef, {
            text: text,
            senderId: currentUser.uid,
            receiverId: activeChatRecipient.uid,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Error sending message:", error);
        showNotification('Failed to send message.');
    }
}

function listenForMessages() {
    if (messagesListenerUnsubscribe) messagesListenerUnsubscribe(); 
    
    const messagesQuery = query(collection(db, 'chats', activeChatId, 'messages'), orderBy('timestamp', 'asc'));
    messagesListenerUnsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        let isFirstRender = messagesList.innerHTML === '';
        
        snapshot.docChanges().forEach(change => {
            if (change.type === "added") {
                const message = change.doc.data();
                const messageEl = document.createElement('div');
                messageEl.textContent = message.text;
                messageEl.classList.add('message');
                const isSent = message.senderId === currentUser.uid;
                messageEl.classList.add(isSent ? 'sent' : 'received');
                messagesList.appendChild(messageEl);

                if (!isSent) {
                    lastReceivedMessageText = message.text;
                    aiSuggestReplyBtn.classList.remove('hidden');
                    if (!isFirstRender) {
                        showNotification(`${activeChatRecipient.displayName}: ${message.text}`);
                    }
                } else {
                    lastReceivedMessageText = null;
                    aiSuggestReplyBtn.classList.add('hidden');
                }
            }
        });

        messagesList.scrollTop = messagesList.scrollHeight;
    });
}

async function updateTypingStatus(isTyping) {
    if (!activeChatId || !currentUser) return;
    const typingDocRef = doc(db, 'chats', activeChatId, 'typing', currentUser.uid);
    try {
        await setDoc(typingDocRef, { isTyping: isTyping });
    } catch (error) {
        console.error('Error updating typing status:', error);
    }
}

function listenForTypingStatus() {
    if (typingListenerUnsubscribe) typingListenerUnsubscribe();
    if (!activeChatId || !activeChatRecipient) return;

    const typingDocRef = doc(db, 'chats', activeChatId, 'typing', activeChatRecipient.uid);
    typingListenerUnsubscribe = onSnapshot(typingDocRef, (doc) => {
        if (doc.exists() && doc.data().isTyping) {
            typingIndicator.classList.remove('hidden');
        } else {
            typingIndicator.classList.add('hidden');
        }
    });
}


// --- Auth State Observer ---
onAuthStateChanged(auth, async (user) => {
  const [userAvatar, sidebarAvatar, composerAvatar] = [
    document.getElementById('user-avatar'),
    document.getElementById('sidebar-avatar'),
    document.getElementById('composer-avatar')
  ];
  const profileName = document.getElementById('profile-name');

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
    
    await updateUserPresence(true);
    
    listenForPosts();
    listenForAllUsers();
    
    updateStatus('✅ Connected', 'online');
    showNotification(`Welcome back, ${userName}!`);
    
    window.addEventListener('beforeunload', () => updateUserPresence(false));

  } else {
    if (currentUser) {
        await updateUserPresence(false);
    }
    currentUser = null;
    appDiv.classList.add('hidden');
    loginModal.classList.remove('hidden');
    
    if (postsListenerUnsubscribe) postsListenerUnsubscribe();
    if (allUsersListenerUnsubscribe) allUsersListenerUnsubscribe();
    closeChat();
    
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
  updateStatus('🔄 Connecting...', 'offline');
});

