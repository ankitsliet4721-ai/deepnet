// Application Data
const appData = {
  "users": [
    {
      "id": 1,
      "name": "Dr. Sarah Chen",
      "username": "sarahchen_ai",
      "title": "Senior Research Scientist",
      "institution": "Google DeepMind",
      "avatar": "👩‍🔬",
      "bio": "Leading research in neural architecture search and automated ML. PhD from Stanford.",
      "specializations": ["AutoML", "Neural Architecture Search", "Computer Vision"],
      "followers": 15420,
      "following": 892,
      "publications": 47
    },
    {
      "id": 2,
      "name": "Prof. Marcus Rodriguez",
      "username": "mrodriguez_nlp",
      "title": "Professor of Computer Science",
      "institution": "MIT CSAIL",
      "avatar": "👨‍🎓",
      "bio": "Natural language processing and large language models. Author of 'Deep NLP Fundamentals'.",
      "specializations": ["NLP", "Large Language Models", "Transformers"],
      "followers": 28350,
      "following": 1243,
      "publications": 89
    },
    {
      "id": 3,
      "name": "Dr. Aisha Patel",
      "username": "aisha_robotics",
      "title": "Principal Research Engineer",
      "institution": "OpenAI",
      "avatar": "👩‍💻",
      "bio": "Robotics and embodied AI. Working on multi-modal learning for robotic systems.",
      "specializations": ["Robotics", "Embodied AI", "Multi-modal Learning"],
      "followers": 12890,
      "following": 567,
      "publications": 34
    },
    {
      "id": 4,
      "name": "Dr. James Liu",
      "username": "jliu_vision",
      "title": "Staff Research Scientist",
      "institution": "Meta AI",
      "avatar": "👨‍🔬",
      "bio": "Computer vision and generative models. Focus on diffusion models and image synthesis.",
      "specializations": ["Computer Vision", "Generative AI", "Diffusion Models"],
      "followers": 19760,
      "following": 834,
      "publications": 56
    },
    {
      "id": 5,
      "name": "Dr. Elena Vasquez",
      "username": "evasquez_rl",
      "title": "Senior Research Scientist",
      "institution": "DeepMind",
      "avatar": "👩‍🏫",
      "bio": "Reinforcement learning and game AI. AlphaGo and AlphaStar team member.",
      "specializations": ["Reinforcement Learning", "Game AI", "Multi-agent Systems"],
      "followers": 22140,
      "following": 998,
      "publications": 42
    }
  ],
  "posts": [
    {
      "id": 1,
      "userId": 1,
      "content": "Exciting breakthrough in our latest AutoML research! We've developed a new neural architecture search method that reduces computational cost by 60% while maintaining SOTA performance. Paper coming soon! 🚀 #AutoML #NeuralArchitectureSearch",
      "timestamp": "2 hours ago",
      "likes": 245,
      "comments": 18,
      "shares": 34,
      "type": "research_update"
    },
    {
      "id": 2,
      "userId": 2,
      "content": "Just finished reviewing papers for NeurIPS 2025. The quality of transformer variants this year is remarkable. Seeing incredible innovations in attention mechanisms and efficiency improvements. The field is evolving so rapidly! #NeurIPS2025 #Transformers",
      "timestamp": "4 hours ago",
      "likes": 189,
      "comments": 25,
      "shares": 12,
      "type": "conference_update"
    },
    {
      "id": 3,
      "userId": 3,
      "content": "Working on a fascinating project combining vision and language for robotic manipulation. Teaching robots to understand 'pick up the blue cup next to the laptop' is more complex than it sounds! Multi-modal learning is the key 🤖 #Robotics #MultiModalAI",
      "timestamp": "6 hours ago",
      "likes": 156,
      "comments": 31,
      "shares": 28,
      "type": "research_insight"
    },
    {
      "id": 4,
      "userId": 4,
      "content": "New diffusion model architecture achieving FID scores under 2.0 on CelebA-HQ! The key insight was incorporating spatial attention at multiple resolution scales. Code and pretrained models coming next week 📊 #DiffusionModels #GenerativeAI",
      "timestamp": "8 hours ago",
      "likes": 312,
      "comments": 42,
      "shares": 67,
      "type": "research_result"
    },
    {
      "id": 5,
      "userId": 5,
      "content": "Reflecting on 5 years since AlphaGo. The impact on RL research has been tremendous, but we're just scratching the surface of what's possible with multi-agent learning. Excited about the next breakthroughs! #ReinforcementLearning #AlphaGo",
      "timestamp": "12 hours ago",
      "likes": 428,
      "comments": 56,
      "shares": 89,
      "type": "reflection"
    },
    {
      "id": 6,
      "userId": 1,
      "content": "Question for the community: What are your thoughts on the current state of interpretability in deep learning? Are we making meaningful progress or just creating more complex explanations? Would love to hear different perspectives! 🤔 #Interpretability #DeepLearning",
      "timestamp": "1 day ago",
      "likes": 203,
      "comments": 73,
      "shares": 41,
      "type": "question"
    }
  ],
  "trending_topics": [
    "#NeurIPS2025",
    "#LargeLanguageModels", 
    "#DiffusionModels",
    "#AutoML",
    "#ReinforcementLearning",
    "#ComputerVision",
    "#Robotics",
    "#Interpretability"
  ]
};

// Application State
let currentUser = null;
let currentTheme = 'light';
let bookmarkedPosts = new Set();
let likedPosts = new Set();
let currentFilter = 'all';

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM Content Loaded');
  
  // Show login modal initially
  showLoginModal();
  
  // Setup event listeners
  setupEventListeners();
  
  // Initialize theme based on user preference
  initializeTheme();
});

// Event Listeners Setup
function setupEventListeners() {
  console.log('Setting up event listeners');
  
  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      handleLogin();
    });
  }
  
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', function(e) {
      e.preventDefault();
      handleSignup();
    });
  }
  
  // Search functionality
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }
  
  // Post composer
  const postContent = document.getElementById('postContent');
  if (postContent) {
    postContent.addEventListener('input', handlePostInput);
  }
  
  // Close modal when clicking outside
  setupModalHandlers();
  
  // Keyboard shortcuts
  setupKeyboardShortcuts();
}

function setupModalHandlers() {
  // Modal close handlers
  document.addEventListener('click', function(e) {
    const profileModal = document.getElementById('profileModal');
    
    if (e.target === profileModal) {
      closeProfileModal();
    }
  });
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', function(e) {
    // Escape key to close modals
    if (e.key === 'Escape') {
      closeProfileModal();
    }
    
    // Cmd/Ctrl + / to focus search
    if ((e.metaKey || e.ctrlKey) && e.key === '/') {
      e.preventDefault();
      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        searchInput.focus();
      }
    }
  });
}

function initializeTheme() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    currentTheme = 'dark';
    document.documentElement.setAttribute('data-color-scheme', 'dark');
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
      themeToggle.textContent = '☀️';
    }
  }
}

// Quick Login Function
function quickLogin() {
  console.log('Quick login triggered');
  currentUser = appData.users[0]; // Login as Dr. Sarah Chen
  showNotification(`Welcome back, ${currentUser.name}!`, 'success');
  closeLoginModal();
  initializeApp();
}

// Authentication Functions
function handleLogin() {
  console.log('Login form submitted');
  
  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  
  if (!usernameInput || !passwordInput) {
    console.error('Login form elements not found');
    showNotification('Login form error', 'error');
    return;
  }
  
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  
  if (!username) {
    showNotification('Please enter a username', 'error');
    return;
  }
  
  // Find user by username (case-insensitive)
  const user = appData.users.find(u => 
    u.username.toLowerCase() === username.toLowerCase() || 
    u.name.toLowerCase().includes(username.toLowerCase())
  );
  
  if (user) {
    currentUser = user;
    showNotification(`Welcome back, ${user.name}!`, 'success');
    closeLoginModal();
    initializeApp();
  } else {
    showNotification('User not found. Try: sarahchen_ai, mrodriguez_nlp, aisha_robotics, jliu_vision, or evasquez_rl', 'error');
  }
}

function handleSignup() {
  console.log('Signup form submitted');
  showNotification('Sign up functionality would be implemented here. For now, please use the demo login.', 'info');
}

function switchAuthTab(tab) {
  console.log('Switching auth tab to:', tab);
  
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const tabs = document.querySelectorAll('.auth-tab');
  
  if (!loginForm || !signupForm) return;
  
  tabs.forEach(t => t.classList.remove('active'));
  
  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    if (tabs[0]) tabs[0].classList.add('active');
  } else {
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
    if (tabs[1]) tabs[1].classList.add('active');
  }
}

function showLoginModal() {
  console.log('Showing login modal');
  const loginModal = document.getElementById('loginModal');
  const app = document.getElementById('app');
  
  if (loginModal && app) {
    loginModal.classList.remove('hidden');
    app.classList.add('hidden');
  }
}

function closeLoginModal() {
  console.log('Closing login modal');
  const loginModal = document.getElementById('loginModal');
  const app = document.getElementById('app');
  
  if (loginModal && app) {
    loginModal.classList.add('hidden');
    app.classList.remove('hidden');
  }
}

// App Initialization
function initializeApp() {
  console.log('Initializing app for user:', currentUser);
  updateCurrentUserUI();
  renderPosts();
  renderTrendingTopics();
  renderSuggestedUsers();
}

function updateCurrentUserUI() {
  if (currentUser) {
    const currentUserAvatar = document.getElementById('currentUserAvatar');
    if (currentUserAvatar) {
      currentUserAvatar.textContent = currentUser.avatar;
      currentUserAvatar.onclick = () => showUserProfile(currentUser.id);
    }
  }
}

// Post Rendering
function renderPosts(posts = appData.posts) {
  const container = document.getElementById('postsContainer');
  if (!container) return;
  
  if (posts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No posts found</h3>
        <p>Try adjusting your search or filter criteria.</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = posts.map(post => {
    const user = appData.users.find(u => u.id === post.userId);
    if (!user) return '';
    
    const isLiked = likedPosts.has(post.id);
    const isBookmarked = bookmarkedPosts.has(post.id);
    
    return `
      <article class="post">
        <header class="post-header">
          <div class="post-avatar" onclick="showUserProfile(${user.id})">${user.avatar}</div>
          <div class="post-info">
            <div class="post-author" onclick="showUserProfile(${user.id})">${user.name}</div>
            <div class="post-meta">${user.title} • ${user.institution} • ${post.timestamp}</div>
          </div>
        </header>
        <div class="post-content">${post.content}</div>
        <footer class="post-actions">
          <div class="post-actions-left">
            <button type="button" class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike(${post.id})">
              <span>${isLiked ? '❤️' : '🤍'}</span>
              <span class="action-count">${post.likes + (isLiked ? 1 : 0)}</span>
            </button>
            <button type="button" class="action-btn" onclick="showComments(${post.id})">
              <span>💬</span>
              <span class="action-count">${post.comments}</span>
            </button>
            <button type="button" class="action-btn" onclick="sharePost(${post.id})">
              <span>🔄</span>
              <span class="action-count">${post.shares}</span>
            </button>
          </div>
          <button type="button" class="action-btn ${isBookmarked ? 'bookmarked' : ''}" onclick="toggleBookmark(${post.id})">
            <span>${isBookmarked ? '🔖' : '📑'}</span>
          </button>
        </footer>
      </article>
    `;
  }).join('');
}

function renderTrendingTopics() {
  const container = document.getElementById('trendingTopics');
  if (!container) return;
  
  container.innerHTML = appData.trending_topics.map(topic => 
    `<a href="#" class="trending-topic" onclick="searchByTopic('${topic}')">${topic}</a>`
  ).join('');
}

function renderSuggestedUsers() {
  const container = document.getElementById('suggestedUsers');
  if (!container) return;
  
  const suggestedUsers = appData.users.filter(user => user.id !== currentUser?.id).slice(0, 3);
  
  container.innerHTML = suggestedUsers.map(user => `
    <div class="suggested-user" onclick="showUserProfile(${user.id})">
      <div class="suggested-user-avatar">${user.avatar}</div>
      <div class="suggested-user-info">
        <h4>${user.name}</h4>
        <p>${user.title}</p>
      </div>
    </div>
  `).join('');
}

// User Profile Functions
function showUserProfile(userId) {
  console.log('Showing profile for user ID:', userId);
  const user = appData.users.find(u => u.id === userId);
  if (!user) return;
  
  const modal = document.getElementById('profileModal');
  const content = document.getElementById('profileModalContent');
  
  if (!modal || !content) return;
  
  content.innerHTML = `
    <div class="profile-content">
      <div class="profile-avatar-large">${user.avatar}</div>
      <h2 class="profile-name">${user.name}</h2>
      <p class="profile-title">${user.title} at ${user.institution}</p>
      
      <div class="profile-stats">
        <div class="profile-stat">
          <span class="profile-stat-value">${user.followers.toLocaleString()}</span>
          <span class="profile-stat-label">Followers</span>
        </div>
        <div class="profile-stat">
          <span class="profile-stat-value">${user.following.toLocaleString()}</span>
          <span class="profile-stat-label">Following</span>
        </div>
        <div class="profile-stat">
          <span class="profile-stat-value">${user.publications}</span>
          <span class="profile-stat-label">Publications</span>
        </div>
      </div>
      
      <div class="profile-bio">
        <p>${user.bio}</p>
      </div>
      
      <div class="profile-specializations">
        ${user.specializations.map(spec => `<span class="specialization-tag">${spec}</span>`).join('')}
      </div>
    </div>
  `;
  
  modal.classList.remove('hidden');
}

function closeProfileModal() {
  console.log('Closing profile modal');
  const modal = document.getElementById('profileModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Post Interaction Functions
function toggleLike(postId) {
  console.log('Toggling like for post:', postId);
  if (likedPosts.has(postId)) {
    likedPosts.delete(postId);
    showNotification('Post unliked', 'info');
  } else {
    likedPosts.add(postId);
    showNotification('Post liked!', 'success');
  }
  renderPosts(getFilteredPosts());
}

function toggleBookmark(postId) {
  console.log('Toggling bookmark for post:', postId);
  if (bookmarkedPosts.has(postId)) {
    bookmarkedPosts.delete(postId);
    showNotification('Post removed from bookmarks', 'info');
  } else {
    bookmarkedPosts.add(postId);
    showNotification('Post bookmarked!', 'success');
  }
  renderPosts(getFilteredPosts());
}

function showComments(postId) {
  const post = appData.posts.find(p => p.id === postId);
  if (post) {
    showNotification(`Comments for this post would be shown here (${post.comments} comments)`, 'info');
  }
}

function sharePost(postId) {
  if (navigator.share) {
    const post = appData.posts.find(p => p.id === postId);
    const user = appData.users.find(u => u.id === post.userId);
    navigator.share({
      title: `Post by ${user.name}`,
      text: post.content,
      url: window.location.href
    });
  } else {
    showNotification('Post shared!', 'success');
  }
}

// Post Creation Functions
function handlePostInput() {
  const content = document.getElementById('postContent');
  if (content && content.value.length > 500) {
    showNotification('Post is getting long! Consider breaking it into multiple posts.', 'warning');
  }
}

function togglePostType(type) {
  console.log('Toggling post type to:', type);
  const buttons = document.querySelectorAll('.composer-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  
  // Find and activate the clicked button
  const clickedButton = Array.from(buttons).find(btn => btn.textContent.includes(type === 'text' ? 'Text' : type === 'code' ? 'Code' : type === 'paper' ? 'Paper' : 'Poll'));
  if (clickedButton) {
    clickedButton.classList.add('active');
  }
  
  // Update placeholder text
  const textarea = document.getElementById('postContent');
  if (textarea) {
    switch(type) {
      case 'code':
        textarea.placeholder = 'Share your code snippet or algorithm...';
        break;
      case 'paper':
        textarea.placeholder = 'Share your research paper or findings...';
        break;
      case 'poll':
        textarea.placeholder = 'Ask a question to the community...';
        break;
      default:
        textarea.placeholder = 'Share your research insights...';
    }
  }
}

function createPost() {
  console.log('Creating new post');
  const contentElement = document.getElementById('postContent');
  const privacyElement = document.querySelector('.privacy-select');
  
  if (!contentElement || !privacyElement) return;
  
  const content = contentElement.value.trim();
  const privacy = privacyElement.value;
  
  if (!content) {
    showNotification('Please write something before posting!', 'error');
    return;
  }
  
  if (!currentUser) {
    showNotification('You must be logged in to post', 'error');
    return;
  }
  
  // Create new post
  const newPost = {
    id: appData.posts.length + 1,
    userId: currentUser.id,
    content: content,
    timestamp: 'just now',
    likes: 0,
    comments: 0,
    shares: 0,
    type: 'user_post'
  };
  
  // Add to posts array
  appData.posts.unshift(newPost);
  
  // Clear composer
  contentElement.value = '';
  
  // Re-render posts
  renderPosts(getFilteredPosts());
  
  // Show success message
  showNotification('Post created successfully!', 'success');
}

// Search and Filter Functions
function handleSearch() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;
  
  const query = searchInput.value.toLowerCase().trim();
  
  if (!query) {
    renderPosts(getFilteredPosts());
    return;
  }
  
  const filteredPosts = appData.posts.filter(post => {
    const user = appData.users.find(u => u.id === post.userId);
    if (!user) return false;
    
    return post.content.toLowerCase().includes(query) ||
           user.name.toLowerCase().includes(query) ||
           user.specializations.some(spec => spec.toLowerCase().includes(query));
  });
  
  renderPosts(filteredPosts);
}

function searchByTopic(topic) {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = topic;
    handleSearch();
  }
}

function filterFeed(filterType) {
  console.log('Filtering feed to:', filterType);
  currentFilter = filterType;
  
  // Update active sidebar link
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.classList.remove('active');
  });
  
  // Find and activate the correct sidebar link
  const sidebarLinks = document.querySelectorAll('.sidebar-link');
  sidebarLinks.forEach(link => {
    const linkText = link.textContent.toLowerCase();
    if ((filterType === 'all' && linkText.includes('feed')) ||
        (filterType === 'trending' && linkText.includes('trending')) ||
        (filterType === 'communities' && linkText.includes('communities')) ||
        (filterType === 'bookmarks' && linkText.includes('bookmarks'))) {
      link.classList.add('active');
    }
  });
  
  renderPosts(getFilteredPosts());
}

function getFilteredPosts() {
  switch(currentFilter) {
    case 'trending':
      return appData.posts.filter(post => post.likes > 200);
    case 'bookmarks':
      return appData.posts.filter(post => bookmarkedPosts.has(post.id));
    case 'communities':
      return appData.posts.filter(post => post.type === 'conference_update');
    default:
      return appData.posts;
  }
}

// Theme Functions
function toggleTheme() {
  console.log('Toggling theme from:', currentTheme);
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-color-scheme', currentTheme);
  
  // Update theme toggle button
  const themeToggle = document.querySelector('.theme-toggle');
  if (themeToggle) {
    themeToggle.textContent = currentTheme === 'light' ? '🌙' : '☀️';
  }
  
  showNotification(`Switched to ${currentTheme} mode`, 'info');
}

// Navigation Functions
function showSection(section) {
  console.log('Showing section:', section);
  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  
  // Find and activate the correct nav link
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    if (link.textContent.toLowerCase().includes(section.toLowerCase())) {
      link.classList.add('active');
    }
  });
  
  // Handle different sections
  switch(section) {
    case 'home':
      currentFilter = 'all';
      renderPosts(getFilteredPosts());
      break;
    case 'profile':
      if (currentUser) {
        showUserProfile(currentUser.id);
      }
      break;
    case 'research':
      currentFilter = 'trending';
      renderPosts(getFilteredPosts());
      break;
    case 'messages':
      showNotification('Messages feature would be implemented here', 'info');
      break;
  }
}

function showSettings() {
  showNotification('Settings panel would be implemented here', 'info');
}

// Utility Functions
function showNotification(message, type = 'info') {
  console.log('Notification:', message, type);
  
  // Remove any existing notifications
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // Create a new notification
  const notification = document.createElement('div');
  notification.className = `notification notification--${type}`;
  notification.textContent = message;
  
  // Style the notification
  const colors = {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6'
  };
  
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 20px',
    borderRadius: '8px',
    color: 'white',
    backgroundColor: colors[type] || colors.info,
    zIndex: '1001',
    animation: 'fadeIn 0.3s ease-out',
    maxWidth: '300px',
    fontSize: '14px',
    fontWeight: '500',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
  });
  
  document.body.appendChild(notification);
  
  // Remove after 4 seconds
  setTimeout(() => {
    if (notification && notification.parentNode) {
      notification.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => {
        if (notification && notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }
  }, 4000);
}

// Make functions globally available
window.quickLogin = quickLogin;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.switchAuthTab = switchAuthTab;
window.closeLoginModal = closeLoginModal;
window.showUserProfile = showUserProfile;
window.closeProfileModal = closeProfileModal;
window.toggleLike = toggleLike;
window.toggleBookmark = toggleBookmark;
window.showComments = showComments;
window.sharePost = sharePost;
window.togglePostType = togglePostType;
window.createPost = createPost;
window.searchByTopic = searchByTopic;
window.filterFeed = filterFeed;
window.toggleTheme = toggleTheme;
window.showSection = showSection;
window.showSettings = showSettings;