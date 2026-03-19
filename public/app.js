// ===========================
// Cookie Consent
// ===========================
function showCookieConsent() {
  if (localStorage.getItem('cookie-consent')) return;
  const banner = document.getElementById('cookie-consent');
  if (banner) banner.style.display = '';
}

function acceptCookies() {
  localStorage.setItem('cookie-consent', 'accepted');
  document.getElementById('cookie-consent').style.display = 'none';
}

function rejectCookies() {
  localStorage.setItem('cookie-consent', 'rejected');
  document.getElementById('cookie-consent').style.display = 'none';
}

// ===========================
// API Helper
// ===========================
const API_BASE = '/api';

function getAuthToken() { return localStorage.getItem('token'); }
function setAuthToken(token) { localStorage.setItem('token', token); }
function clearAuthToken() { localStorage.removeItem('token'); }

async function api(path, options = {}) {
  const token = getAuthToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(API_BASE + path, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ===========================
// Quiz / Tournament Data
// Loaded from server API on init.
// ===========================
let QUIZ_DATA = [];

async function loadAllQuizzes() {
  try {
    const { quizzes } = await api('/quizzes');
    QUIZ_DATA = quizzes;
  } catch (err) {
    console.error('Failed to load quizzes:', err);
    showToast('Failed to load quizzes from server', 'error');
  }
}

// ===========================
// Quiz Persistence (API-based)
// ===========================
async function saveUserQuiz(quizPayload) {
  try {
    const { quiz } = await api('/quizzes', { method: 'POST', body: quizPayload });
    QUIZ_DATA.unshift(quiz);
    return quiz;
  } catch (err) {
    showToast(err.message || 'Failed to save quiz', 'error');
    return null;
  }
}

async function deleteUserQuiz(id) {
  try {
    await api(`/quizzes/${id}`, { method: 'DELETE' });
    const idx = QUIZ_DATA.findIndex(q => q.id === id);
    if (idx !== -1) QUIZ_DATA.splice(idx, 1);
    return true;
  } catch (err) {
    showToast(err.message || 'Failed to delete quiz', 'error');
    return false;
  }
}

// ===========================
// Auth System (API + JWT)
// ===========================
async function loadCurrentUser() {
  const token = getAuthToken();
  if (!token) { state.currentUser = null; return; }
  try {
    const { user } = await api('/auth/me');
    state.currentUser = user;
  } catch {
    clearAuthToken();
    state.currentUser = null;
  }
}

async function doSignUp(username, email, password) {
  try {
    const result = await api('/auth/signup', {
      method: 'POST', body: { username, email, password }
    });
    if (result.needsVerification) {
      return { needsVerification: true, email: result.email };
    }
    setAuthToken(result.token);
    state.currentUser = result.user;
    updateAuthUI();
    buildSidebar();
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

async function verifySignUp(email, code) {
  try {
    const { user, token } = await api('/auth/verify-signup', {
      method: 'POST', body: { email, code }
    });
    setAuthToken(token);
    state.currentUser = user;
    updateAuthUI();
    buildSidebar();
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

async function doSignIn(usernameOrEmail, password) {
  try {
    const result = await api('/auth/signin', {
      method: 'POST', body: { usernameOrEmail, password }
    });
    if (result.needsVerification) {
      return { needsVerification: true, email: result.email };
    }
    setAuthToken(result.token);
    state.currentUser = result.user;
    updateAuthUI();
    buildSidebar();
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

async function verifySignIn(email, code) {
  try {
    const { user, token } = await api('/auth/verify-signin', {
      method: 'POST', body: { email, code }
    });
    setAuthToken(token);
    state.currentUser = user;
    updateAuthUI();
    buildSidebar();
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

function doSignOut() {
  clearAuthToken();
  state.currentUser = null;
  updateAuthUI();
  buildSidebar();
  showToast('Signed out', 'info');
  navigate('browse');
}

function updateAuthUI() {
  const user = state.currentUser;
  const authArea = $('auth-area');
  if (!authArea) return;

  if (user) {
    const initial = user.username.charAt(0).toUpperCase();
    authArea.innerHTML = `
      <div class="user-menu" id="user-menu">
        <button class="user-menu-btn" id="user-menu-btn" type="button">
          <div class="user-avatar-sm">${initial}</div>
          <span class="user-menu-name">${escHtml(user.username)}${user.is_admin ? ' <span class="admin-badge">ADMIN</span>' : ''}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="user-dropdown" id="user-dropdown">
          <div class="user-dropdown-header">
            <div class="user-avatar-lg">${initial}</div>
            <div>
              <div style="font-weight:600">${escHtml(user.username)}${user.is_admin ? ' <span class="admin-badge">ADMIN</span>' : ''}</div>
              <div style="font-size:0.75rem;color:var(--text-faint)">${escHtml(user.email)}</div>
            </div>
          </div>
          <div class="user-dropdown-divider"></div>
          <a class="user-dropdown-item" href="#" onclick="navigate('profile'); closeUserDropdown(); return false;">
            <span>👤</span> My Profile
          </a>
          <a class="user-dropdown-item" href="#" onclick="navigate('my-quizzes'); closeUserDropdown(); return false;">
            <span>🏆</span> My Quizzes
          </a>
          ${user.is_admin ? `
          <div class="user-dropdown-divider"></div>
          <a class="user-dropdown-item" href="#" onclick="navigate('admin'); closeUserDropdown(); return false;">
            <span>🛡️</span> Admin Dashboard
          </a>` : ''}
          <div class="user-dropdown-divider"></div>
          <a class="user-dropdown-item" href="#" onclick="doSignOut(); return false;">
            <span>🚪</span> Sign Out
          </a>
        </div>
      </div>`;

    const btn = $('user-menu-btn');
    if (btn) {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        $('user-dropdown').classList.toggle('open');
      });
    }
  } else {
    authArea.innerHTML = `
      <button class="btn btn-ghost btn-sm" onclick="navigate('signin')">Sign In</button>
      <button class="btn btn-primary btn-sm" onclick="navigate('signup')">Sign Up</button>`;
  }
}

function closeUserDropdown() {
  const dd = $('user-dropdown');
  if (dd) dd.classList.remove('open');
}

// ===========================
// DOM Helpers
// ===========================
const $ = id => document.getElementById(id);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  if (hours < 24) return `about ${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function showToast(msg, type = 'info') {
  const container = $('toast-container');
  const toast = el('div', `toast ${type}`, `${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'} ${msg}`);
  container.appendChild(toast);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

function nprogress() {
  const bar = $('nprogress');
  bar.classList.remove('loading');
  void bar.offsetWidth;
  bar.classList.add('loading');
  setTimeout(() => bar.classList.remove('loading'), 800);
}

// ===========================
// Theme
// ===========================
function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const btn = $('theme-toggle');
  if (btn) btn.innerHTML = theme === 'dark'
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
}

// ===========================
// Sidebar
// ===========================
function applySidebar() {
  const sidebar = $('sidebar');
  const main = $('main');
  if (state.sidebarCollapsed) {
    sidebar.classList.add('collapsed');
    main.classList.add('sidebar-collapsed');
  } else {
    sidebar.classList.remove('collapsed');
    main.classList.remove('sidebar-collapsed');
  }
}

function toggleSidebar() {
  if (window.innerWidth <= 768) {
    state.sidebarMobileOpen = !state.sidebarMobileOpen;
    const sidebar = $('sidebar');
    const overlay = $('sidebar-overlay');
    sidebar.classList.toggle('mobile-open', state.sidebarMobileOpen);
    overlay.classList.toggle('visible', state.sidebarMobileOpen);
  } else {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    localStorage.setItem('sidebar-collapsed', state.sidebarCollapsed);
    applySidebar();
  }
}

function closeMobileSidebar() {
  state.sidebarMobileOpen = false;
  $('sidebar').classList.remove('mobile-open');
  $('sidebar-overlay').classList.remove('visible');
}

// ===========================
// App State
// ===========================
const state = {
  theme: localStorage.getItem('theme') || 'dark',
  sidebarCollapsed: localStorage.getItem('sidebar-collapsed') === 'true',
  sidebarMobileOpen: false,
  currentPage: 'browse',
  currentFilter: 'latest',
  currentType: 'all',
  currentCategory: null,
  searchQuery: '',
  likedQuizzes: [],
  page: 1,
  sectionCollapsed: {},

  // Tournament state
  currentQuiz: null,
  tournament: null,

  // Auth
  currentUser: null,
};

// ===========================
// Navigation / Pages
// ===========================
function buildUrl(page, data) {
  switch (page) {
    case 'browse': return data.category ? `/?category=${data.category}` : '/';
    case 'search': return data.q ? `/search?q=${encodeURIComponent(data.q)}` : '/search';
    case 'quiz': return `/quiz/${data.id}`;
    case 'edit': return `/edit/${data.id}`;
    case 'create': return '/create';
    case 'signin': return '/signin';
    case 'signup': return '/signup';
    case 'profile': return '/profile';
    case 'my-quizzes': return '/my-quizzes';
    case 'user-profile': return `/user/${encodeURIComponent(data.username)}`;
    case 'bookmarks': return '/bookmarks';
    case 'forgot-password': return '/forgot-password';
    case 'admin': return '/admin';
    default: return `/${page}`;
  }
}

function parseUrl() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  if (path.startsWith('/quiz/')) return { page: 'quiz', data: { id: path.slice(6) } };
  if (path.startsWith('/edit/')) return { page: 'edit', data: { id: path.slice(6) } };
  if (path === '/create') return { page: 'create', data: {} };
  if (path === '/signin') return { page: 'signin', data: {} };
  if (path === '/signup') return { page: 'signup', data: {} };
  if (path === '/profile') return { page: 'profile', data: {} };
  if (path === '/my-quizzes') return { page: 'my-quizzes', data: {} };
  if (path === '/bookmarks') return { page: 'bookmarks', data: {} };
  if (path === '/forgot-password') return { page: 'forgot-password', data: {} };
  if (path === '/admin') return { page: 'admin', data: {} };
  if (path.startsWith('/user/')) return { page: 'user-profile', data: { username: decodeURIComponent(path.slice(6)) } };
  if (path === '/search') return { page: 'search', data: { q: params.get('q') || '' } };
  // Default: browse
  const category = params.get('category');
  return { page: 'browse', data: category ? { category } : {} };
}

let _skipPushState = false;

function navigate(page, data = {}) {
  nprogress();
  state.currentPage = page;
  state.currentCategory = data.category || null;
  state.searchQuery = data.q || '';

  // Push browser history (skip when handling popstate)
  if (!_skipPushState) {
    history.pushState({ page, data }, '', buildUrl(page, data));
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page &&
      (!item.dataset.category || item.dataset.category === state.currentCategory));
  });

  switch (page) {
    case 'browse': renderBrowse(); break;
    case 'search': renderSearch(data.q); break;
    case 'quiz': renderQuizLobby(data.id); break;
    case 'create': renderCreateQuiz(); break;
    case 'edit': renderEditQuiz(data.id); break;
    case 'signin': renderSignIn(); break;
    case 'signup': renderSignUp(); break;
    case 'profile': renderProfile(); break;
    case 'my-quizzes': renderMyQuizzes(); break;
    case 'user-profile': renderUserProfile(data.username); break;
    case 'bookmarks': renderBookmarks(); break;
    case 'contact': renderContactPage(); break;
    case 'forgot-password': renderForgotPassword(); break;
    case 'admin': renderAdminDashboard(); break;
    default: break;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  closeMobileSidebar();
}

/** Helper: can current user edit this quiz? */
function canEditQuiz(quiz) {
  if (!state.currentUser) return false;
  if (state.currentUser.is_admin) return true;
  return quiz.creator_id === state.currentUser.id;
}

// ===========================
// Browse / Home Page
// ===========================
function getFilteredQuizzes() {
  let quizzes = [...QUIZ_DATA];

  if (state.currentCategory) {
    quizzes = quizzes.filter(q =>
      q.category.toLowerCase() === state.currentCategory.toLowerCase()
    );
  }

  if (state.currentType !== 'all') {
    quizzes = quizzes.filter(q => q.type === state.currentType);
  }

  switch (state.currentFilter) {
    case 'trending':
      quizzes.sort((a, b) => b.plays - a.plays);
      break;
    case 'most-played':
      quizzes.sort((a, b) => b.plays - a.plays);
      break;
    default:
      quizzes.sort((a, b) => b.createdAt - a.createdAt);
  }

  return quizzes;
}

function renderBrowse() {
  const quizzes = getFilteredQuizzes();
  const grid = $('quiz-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const pageSize = 12;
  const visible = quizzes.slice(0, state.page * pageSize);

  if (visible.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-title">No quizzes found</div>
        <div class="empty-state-desc">Try a different category or filter</div>
        <button class="btn btn-primary" onclick="state.currentCategory=null;navigate('browse')">Browse All</button>
      </div>`;
    return;
  }

  visible.forEach(quiz => grid.appendChild(createQuizCard(quiz)));

  const loadMoreContainer = $('load-more-container');
  if (loadMoreContainer) {
    loadMoreContainer.style.display = visible.length < quizzes.length ? 'flex' : 'none';
  }

  const titleEl = $('browse-page-title');
  if (titleEl) {
    if (state.currentCategory) {
      titleEl.textContent = state.currentCategory + ' Quizzes';
    } else {
      const labels = { latest: 'Latest Quizzes', trending: 'Trending Now', 'most-played': 'Most Played' };
      titleEl.textContent = labels[state.currentFilter] || 'Browse Quizzes';
    }
  }
}

function createQuizCard(quiz) {
  const isLiked = quiz.liked || false;
  const itemCount = quiz.items.length;
  const card = el('div', 'quiz-card');
  card.innerHTML = `
    <div class="quiz-card-thumb">
      <img src="${quiz.thumbnail}" alt="${quiz.title}" loading="lazy">
      <span class="quiz-card-type-badge ${quiz.type}">${quiz.type}</span>
      <div class="quiz-card-play-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </div>
      <span class="quiz-card-count-badge">${itemCount} Items</span>
    </div>
    <div class="quiz-card-body">
      <div class="quiz-card-title">${quiz.title}</div>
      <div class="quiz-card-meta">
        <span class="quiz-card-creator" onclick="event.stopPropagation(); navigate('user-profile', {username:'${escHtml(quiz.creator)}'})">@${quiz.creator}</span>
        <span class="quiz-card-time">${timeAgo(quiz.createdAt)}</span>
      </div>
      <div class="quiz-card-stats">
        <span class="quiz-card-stat">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          ${formatNumber(quiz.plays)} plays
        </span>
      </div>
      <div class="quiz-card-tags">
        <span class="quiz-tag">${quiz.category}</span>
      </div>
      <div class="quiz-card-actions">
        <button class="quiz-card-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike(event, '${quiz.id}')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          ${formatNumber(quiz.likes)}
        </button>
        <button class="quiz-card-action-btn" onclick="shareQuiz(event, '${quiz.id}')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          Share
        </button>
        ${canEditQuiz(quiz) ? `<button class="quiz-card-action-btn" onclick="event.stopPropagation(); navigate('edit', {id:'${quiz.id}'})">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          Edit
        </button>` : ''}
      </div>
    </div>
  `;
  card.querySelector('.quiz-card-thumb').addEventListener('click', () => navigate('quiz', { id: quiz.id }));
  card.querySelector('.quiz-card-title').addEventListener('click', () => navigate('quiz', { id: quiz.id }));
  return card;
}

async function toggleLike(e, id) {
  e.stopPropagation();
  if (!state.currentUser) {
    showToast('Sign in to like quizzes', 'info');
    navigate('signin');
    return;
  }
  try {
    const { liked } = await api(`/quizzes/${id}/like`, { method: 'POST' });
    const quiz = QUIZ_DATA.find(q => q.id === id);
    if (quiz) {
      quiz.liked = liked;
      quiz.likes += liked ? 1 : -1;
    }
    showToast(liked ? 'Added to favorites!' : 'Removed from favorites', liked ? 'success' : 'info');
    if (state.currentPage === 'quiz') {
      // Update like button in lobby without full re-render
      renderQuizLobby(id);
    } else {
      renderBrowse();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function shareQuiz(e, id) {
  e.stopPropagation();
  const url = window.location.origin + '/quiz/' + id;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url);
  }
  showToast('Link copied to clipboard!', 'success');
}

// ===========================
// TOURNAMENT ENGINE
// ===========================

/**
 * Build a fresh tournament state from a quiz.
 * Shuffles items, splits into pairs for Round 1.
 */
function buildTournament(quiz, size) {
  const items = [...quiz.items].sort(() => Math.random() - 0.5).slice(0, size);

  const roundNames = {
    128: 'Round of 128',
    64: 'Round of 64',
    32: 'Round of 32',
    16: 'Round of 16',
    8:  'Quarter-Finals',
    4:  'Semi-Finals',
    2:  'Grand Final',
  };

  return {
    quizId: quiz.id,
    allItems: items,
    currentRound: items,
    winners: [],
    matchIndex: 0,
    history: [],
    roundNumber: 1,
    totalRounds: Math.log2(size),
    size,
    roundName: roundNames[size] || `Round of ${size}`,
    done: false,
    champion: null,
    undoStack: [],
  };
}

function getTournamentRoundName(remaining) {
  const names = { 128: 'Round of 128', 64: 'Round of 64', 32: 'Round of 32', 16: 'Round of 16', 8: 'Quarter-Finals', 4: 'Semi-Finals', 2: 'Grand Final' };
  return names[remaining] || `Round of ${remaining}`;
}

function getCurrentPair(t) {
  const idx = t.matchIndex * 2;
  return [t.currentRound[idx], t.currentRound[idx + 1]];
}

function snapshotTournament(t) {
  return {
    currentRound: [...t.currentRound],
    winners:      [...t.winners],
    matchIndex:   t.matchIndex,
    history:      t.history.map(h => ({ ...h })),
    roundNumber:  t.roundNumber,
    roundName:    t.roundName,
    done:         t.done,
    champion:     t.champion,
  };
}

function pickWinner(winnerIndex) {
  const t = state.tournament;
  if (!t || t.done) return;

  t.undoStack.push(snapshotTournament(t));

  const [left, right] = getCurrentPair(t);
  const winner = winnerIndex === 0 ? left : right;
  const loser  = winnerIndex === 0 ? right : left;

  t.history.push({ winner, loser, round: t.roundName, roundNum: t.roundNumber });
  t.winners.push(winner);
  t.matchIndex++;

  const totalMatchesThisRound = t.currentRound.length / 2;
  if (t.matchIndex >= totalMatchesThisRound) {
    if (t.winners.length === 1) {
      t.done = true;
      t.champion = t.winners[0];
      renderTournamentWinner();
      return;
    }
    t.currentRound = [...t.winners];
    t.winners = [];
    t.matchIndex = 0;
    t.roundNumber++;
    t.roundName = getTournamentRoundName(t.currentRound.length);
  }

  saveTournamentProgress();
  renderTournamentMatch();
}

function undoPick() {
  const t = state.tournament;
  if (!t || t.undoStack.length === 0) {
    showToast('Nothing to undo', 'info');
    return;
  }
  const snap = t.undoStack.pop();
  t.currentRound = snap.currentRound;
  t.winners      = snap.winners;
  t.matchIndex   = snap.matchIndex;
  t.history      = snap.history;
  t.roundNumber  = snap.roundNumber;
  t.roundName    = snap.roundName;
  t.done         = snap.done;
  t.champion     = snap.champion;
  saveTournamentProgress();
  renderTournamentMatch();
}

// ===========================
// Quiz Lobby
// ===========================
function renderQuizLobby(id) {
  const quiz = QUIZ_DATA.find(q => q.id === id || q.id === String(id));
  if (!quiz) { navigate('browse'); return; }
  state.currentQuiz = quiz;
  state.tournament = null;

  const container = $('quiz-play-content');
  if (!container) return;

  const sizes = [4, 8, 16, 32, 64, 128].filter(s => s <= quiz.items.length);
  const savedProgress = loadTournamentProgress(quiz.id);

  container.innerHTML = `
    <!-- Breadcrumb -->
    <div class="quiz-breadcrumb">
      <a href="#" onclick="navigate('browse'); return false;">Browse</a>
      <span>›</span>
      <a href="#" onclick="navigate('browse', {category: '${quiz.category}'}); return false;">${quiz.category}</a>
      <span>›</span>
      <span>${quiz.title}</span>
    </div>

    <!-- Title & Info -->
    <div class="quiz-play-header">
      <h1 class="quiz-play-title">${quiz.title}</h1>
      <div class="quiz-play-info">
        <span>By <a class="creator" href="#" onclick="navigate('user-profile', {username:'${escHtml(quiz.creator)}'}); return false;">@${quiz.creator}</a></span>
        <span>•</span>
        <span>${quiz.items.length} Items</span>
        <span>•</span>
        <span>${quiz.type.charAt(0).toUpperCase() + quiz.type.slice(1)}</span>
        <span>•</span>
        <span>${formatNumber(quiz.plays)} plays</span>
        <span class="badge-new">NEW</span>
      </div>
      <div class="quiz-play-actions">
        <button class="btn btn-outline" onclick="toggleLike(event, '${quiz.id}')">
          ♥ ${formatNumber(quiz.likes)} Likes
        </button>
        <button class="btn btn-outline" onclick="shareQuiz(event, '${quiz.id}')">⤴ Share</button>
        ${canEditQuiz(quiz) ? `<button class="btn btn-outline" onclick="navigate('edit', {id:'${quiz.id}'})">✏️ Edit</button>` : ''}
      </div>
    </div>

    <!-- Lobby Card -->
    <div class="lobby-card">
      <div class="lobby-preview-grid" id="lobby-preview">
        ${quiz.items.slice(0, 8).map(item => {
          const img = getItemDisplayImage(item);
          return `
          <div class="lobby-preview-item">
            ${img ? `<img src="${img}" alt="${escHtml(item.name)}" loading="lazy">` : `<div class="lobby-preview-text">${escHtml(item.name)}</div>`}
            <span>${escHtml(item.name)}</span>
          </div>`;
        }).join('')}
      </div>

      <div class="lobby-info">
        <div class="lobby-title">Pick your favourite to advance!</div>
        <div class="lobby-desc">
          Two options appear at a time. Choose the one you prefer — it advances to the next round.
          The last one standing is your personal champion!
        </div>

        <div class="lobby-size-selector">
          <div class="lobby-size-label">Tournament Size</div>
          <div class="lobby-sizes">
            ${sizes.map(s => {
              const rNames = { 4: 'Top 4', 8: 'Top 8', 16: 'Top 16', 32: 'Top 32', 64: 'Top 64', 128: 'Top 128' };
              const rounds = Math.log2(s);
              return `<button class="lobby-size-btn ${s === sizes[Math.floor(sizes.length/2)] ? 'selected' : ''}"
                data-size="${s}" onclick="selectTournamentSize(this)">
                <span class="size-num">${s}</span>
                <span class="size-label">${rNames[s] || s + ' items'}</span>
                <span class="size-rounds">${rounds} rounds</span>
              </button>`;
            }).join('')}
          </div>
        </div>

        <button class="lobby-start-btn" id="lobby-start-btn" onclick="startTournament()">
          ▶ &nbsp;Start Quiz
        </button>
      </div>
    </div>

    <!-- Stats sidebar -->
    <div class="quiz-play-sidebar">
      <div class="quiz-stats-title">Stats</div>
      <div class="quiz-stat-row"><span class="label">Total Plays</span><span class="value">${formatNumber(quiz.plays)}</span></div>
      <div class="quiz-stat-row"><span class="label">Likes</span><span class="value">${formatNumber(quiz.likes)}</span></div>
      <div class="quiz-stat-row"><span class="label">Items</span><span class="value">${quiz.items.length}</span></div>
      <div class="quiz-stat-row"><span class="label">Type</span><span class="value">${quiz.type.charAt(0).toUpperCase() + quiz.type.slice(1)}</span></div>
      <div class="quiz-stat-row"><span class="label">Category</span><span class="value">${quiz.category}</span></div>
      <div class="quiz-stat-row"><span class="label">Created</span><span class="value">${timeAgo(quiz.createdAt)}</span></div>
      <button class="btn btn-outline btn-sm" style="width:100%;margin-top:0.75rem" onclick="toggleBookmark(event, '${quiz.id}')">🔖 Bookmark</button>
    </div>

    ${savedProgress ? `
    <div class="lobby-resume-banner">
      <div class="resume-info">
        <strong>Tournament in progress!</strong>
        <span>${savedProgress.history.length} / ${savedProgress.size - 1} matches · ${savedProgress.roundName}</span>
      </div>
      <div class="resume-actions">
        <button class="btn btn-primary btn-sm" onclick="resumeTournament()">▶ Resume</button>
        <button class="btn btn-outline btn-sm" onclick="discardProgress('${quiz.id}')">Discard</button>
      </div>
    </div>` : ''}

    <div id="quiz-leaderboard"></div>
    <div id="quiz-comments"></div>
  `;

  // Load leaderboard and comments
  loadLeaderboard(quiz.id);
  loadComments(quiz.id);
}

function selectTournamentSize(btn) {
  document.querySelectorAll('.lobby-size-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function startTournament() {
  const selectedBtn = document.querySelector('.lobby-size-btn.selected');
  const size = selectedBtn ? parseInt(selectedBtn.dataset.size) : 8;
  state.tournament = buildTournament(state.currentQuiz, size);
  // Increment play count on fresh start
  api(`/quizzes/${state.currentQuiz.id}/play`, { method: 'POST' }).catch(() => {});
  renderTournamentMatch();
}

// ===========================
// Tournament Match Screen
// ===========================
function getItemDisplayImage(item) {
  if (item.image) return item.image;
  if (item.video) {
    const m = item.video.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (m) return `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg`;
  }
  return '';
}

function renderOptionHtml(item, side, index) {
  const img = getItemDisplayImage(item);
  if (img) {
    return `
      <div class="tournament-option ${side}-option" id="opt-${side}" onclick="pickWinnerWithAnim(${index})">
        <div class="option-img-wrap">
          <img src="${img}" alt="${escHtml(item.name)}" loading="lazy">
          <div class="option-overlay"><span class="option-pick-label">PICK</span></div>
        </div>
        <div class="option-name">${escHtml(item.name)}</div>
      </div>`;
  }
  // Text-only fallback
  const colors = ['#3b82f6','#ef4444','#22c55e','#f59e0b','#8b5cf6','#ec4899','#06b6d4'];
  const color = colors[item.id % colors.length];
  return `
    <div class="tournament-option ${side}-option" id="opt-${side}" onclick="pickWinnerWithAnim(${index})">
      <div class="option-text-wrap" style="background:${color}20;border:2px solid ${color}">
        <div class="option-text-name" style="color:${color}">${escHtml(item.name)}</div>
        <div class="option-overlay"><span class="option-pick-label">PICK</span></div>
      </div>
      <div class="option-name">${escHtml(item.name)}</div>
    </div>`;
}

function renderTournamentMatch() {
  const t = state.tournament;
  const container = $('quiz-play-content');
  if (!container || !t) return;

  const [left, right] = getCurrentPair(t);
  const totalMatches = t.currentRound.length / 2;
  const matchNum = t.matchIndex + 1;
  const totalMatchesAllRounds = t.size - 1;
  const completedMatches = t.history.length;
  const progressPct = Math.round((completedMatches / totalMatchesAllRounds) * 100);

  const canUndo = t.undoStack.length > 0;

  container.innerHTML = `
    <div class="tournament-header">
      <div class="tournament-round-label">
        <span class="round-badge">${t.roundName}</span>
        <span class="match-counter">Match ${matchNum} of ${totalMatches}</span>
        <button class="undo-btn${canUndo ? '' : ' undo-btn--disabled'}"
          onclick="undoPick()" title="Undo last pick"
          ${canUndo ? '' : 'disabled'}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
          Undo${canUndo ? ` (${t.undoStack.length})` : ''}
        </button>
      </div>
      <div class="tournament-progress">
        <div class="tournament-progress-bar" style="width:${progressPct}%"></div>
      </div>
      <div class="tournament-progress-text">${completedMatches} / ${totalMatchesAllRounds} matches completed</div>
    </div>

    <div class="tournament-arena" id="tournament-arena">
      ${renderOptionHtml(left, 'left', 0)}

      <div class="vs-divider">
        <div class="vs-text">VS</div>
      </div>

      ${renderOptionHtml(right, 'right', 1)}
    </div>

    ${t.history.length > 0 ? `
    <div class="match-history">
      <div class="match-history-title">Recent Picks</div>
      <div class="match-history-list">
        ${t.history.slice(-5).reverse().map(h => {
          const wImg = getItemDisplayImage(h.winner);
          return `
          <div class="match-history-item">
            ${wImg ? `<img src="${wImg}" alt="${escHtml(h.winner.name)}">` : ''}
            <span class="mh-winner">${escHtml(h.winner.name)}</span>
            <span class="mh-beat">beat</span>
            <span class="mh-loser">${escHtml(h.loser.name)}</span>
            <span class="mh-round">${h.round}</span>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}
  `;
}

function pickWinnerWithAnim(index) {
  const winnerEl = $(index === 0 ? 'opt-left' : 'opt-right');
  const loserEl  = $(index === 0 ? 'opt-right' : 'opt-left');
  if (!winnerEl || !loserEl) return;

  const arena = $('tournament-arena');
  if (arena) arena.style.pointerEvents = 'none';

  winnerEl.classList.add('winner-chosen');
  loserEl.classList.add('loser-rejected');

  setTimeout(() => {
    pickWinner(index);
  }, 500);
}

// ===========================
// Tournament Winner Screen
// ===========================
function renderTournamentWinner() {
  const t = state.tournament;
  const champion = t.champion;
  const container = $('quiz-play-content');
  if (!container) return;

  // Record result and clear saved progress
  clearTournamentProgress(t.quizId);
  api(`/quizzes/${t.quizId}/result`, {
    method: 'POST',
    body: { championItemId: champion.id, tournamentSize: t.size }
  }).catch(() => {});

  const roundGroups = {};
  t.history.forEach(h => {
    if (!roundGroups[h.roundNum]) roundGroups[h.roundNum] = { name: h.round, matches: [] };
    roundGroups[h.roundNum].matches.push(h);
  });

  container.innerHTML = `
    <div class="winner-screen">
      <div class="winner-confetti" id="confetti-canvas"></div>

      <div class="winner-card">
        <div class="winner-crown">👑</div>
        <div class="winner-label">Your Champion</div>
        ${getItemDisplayImage(champion)
          ? `<img class="winner-img" src="${getItemDisplayImage(champion)}" alt="${escHtml(champion.name)}">`
          : `<div class="winner-img-text">${escHtml(champion.name)}</div>`}
        <div class="winner-name">${escHtml(champion.name)}</div>
        <div class="winner-subtitle">Won out of ${t.size} contestants in ${t.totalRounds} rounds</div>
        <div class="winner-actions">
          <button class="btn btn-primary" onclick="startTournamentFromLobby()">▶ Play Again</button>
          <button class="btn btn-outline" onclick="navigate('browse')">← Browse More</button>
          <button class="btn btn-outline" onclick="shareResult('${escHtml(champion.name)}', '${t.quizId}')">⤴ Share Result</button>
        </div>
      </div>

      <div class="bracket-summary">
        <div class="bracket-summary-title">🏆 Tournament Bracket</div>
        ${Object.values(roundGroups).map(group => `
          <div class="bracket-round">
            <div class="bracket-round-name">${group.name}</div>
            <div class="bracket-matches">
              ${group.matches.map(m => {
                const wI = getItemDisplayImage(m.winner);
                const lI = getItemDisplayImage(m.loser);
                return `
                <div class="bracket-match">
                  <span class="bm-winner">
                    ${wI ? `<img src="${wI}" alt="${escHtml(m.winner.name)}">` : ''} ${escHtml(m.winner.name)}
                  </span>
                  <span class="bm-vs">beat</span>
                  <span class="bm-loser">
                    ${lI ? `<img src="${lI}" alt="${escHtml(m.loser.name)}">` : ''} ${escHtml(m.loser.name)}
                  </span>
                </div>`;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  spawnConfetti();
}

function startTournamentFromLobby() {
  renderQuizLobby(state.currentQuiz.id);
}

function shareResult(name, quizId) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(`My champion in "${QUIZ_DATA.find(q=>q.id===quizId)?.title}" is "${name}"! Play at ${window.location.origin}/quiz/${quizId}`);
  }
  showToast('Result copied to clipboard!', 'success');
}

// ===========================
// Confetti
// ===========================
function spawnConfetti() {
  const colors = ['#3b82f6','#ef4444','#22c55e','#f59e0b','#8b5cf6','#ec4899','#06b6d4'];
  const container = $('confetti-canvas');
  if (!container) return;

  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left: ${Math.random() * 100}%;
      animation-delay: ${Math.random() * 2}s;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      width: ${6 + Math.random() * 8}px;
      height: ${6 + Math.random() * 8}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `;
    container.appendChild(piece);
  }
}

// ===========================
// Create Quiz Page
// ===========================
let createItems = [];
let createItemNextId = 1;
let createTournamentSize = 8;
let createItemType = 'image';

function makeCreateItem() {
  return { id: createItemNextId++, name: '', image: '', imageData: null, videoUrl: '' };
}

function renderCreateQuiz() {
  createItemNextId = 1;
  createTournamentSize = 8;
  createItemType = 'image';
  createThumbnailData = null;
  createItems = Array.from({ length: createTournamentSize }, makeCreateItem);

  const sizeSelect = $('tournament-size-select');
  if (sizeSelect) sizeSelect.value = '8';
  const imgRadio = document.getElementById('type-image');
  if (imgRadio) imgRadio.checked = true;

  const form = $('create-quiz-form');
  if (form) form.reset();
  if (imgRadio) imgRadio.checked = true;
  if (sizeSelect) sizeSelect.value = '8';

  const thumbArea = $('thumbnail-upload-area');
  if (thumbArea) {
    thumbArea.style.padding = '2.5rem';
    thumbArea.innerHTML = `
      <div style="font-size:2rem;margin-bottom:0.5rem">📤</div>
      <div style="font-size:0.9rem;font-weight:500;margin-bottom:0.25rem">Click to upload thumbnail</div>
      <div style="font-size:0.78rem;color:var(--text-faint)">PNG, JPG, GIF up to 5MB (16:9 recommended)</div>
    `;
  }

  renderItemList();
  wireTournamentSizeSelect();
  wireItemTypeRadios();
  wireThumbnailUpload();
}

function wireTournamentSizeSelect() {
  const sizeSelect = $('tournament-size-select');
  if (!sizeSelect) return;
  sizeSelect.onchange = () => {
    createTournamentSize = parseInt(sizeSelect.value, 10);
    while (createItems.length < createTournamentSize) createItems.push(makeCreateItem());
    if (createItems.length > createTournamentSize) createItems = createItems.slice(0, createTournamentSize);
    renderItemList();
  };
}

function wireItemTypeRadios() {
  ['type-image', 'type-video', 'type-text'].forEach(id => {
    const radio = document.getElementById(id);
    if (!radio) return;
    radio.onchange = () => {
      if (radio.checked) { createItemType = radio.value; renderItemList(); }
    };
  });
}

function wireThumbnailUpload() {
  const area = $('thumbnail-upload-area');
  const fileInput = $('thumbnail-file-input');
  if (!area || !fileInput) return;
  area.onclick = () => fileInput.click();
  fileInput.onchange = () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      createThumbnailData = ev.target.result;
      area.style.padding = '1rem';
      area.innerHTML = `
        <img src="${ev.target.result}" style="max-height:130px;max-width:100%;border-radius:var(--radius-sm);object-fit:cover;display:block;margin:0 auto 0.5rem">
        <div style="font-size:0.78rem;color:var(--text-faint)">${escHtml(file.name)} — click to change</div>
      `;
      area.onclick = () => fileInput.click();
    };
    reader.readAsDataURL(file);
  };
}

function renderItemList() {
  const list = $('item-list');
  if (!list) return;
  list.innerHTML = '';

  createItems.forEach((item, idx) => {
    const div = el('div', 'question-item');

    let mediaColHtml = '';
    if (createItemType === 'image') {
      const preview = item.imageData
        ? `<img src="${item.imageData}" style="max-height:64px;border-radius:4px;object-fit:cover;display:block;margin:0 auto 0.25rem">
           <div style="font-size:0.7rem;color:var(--text-faint)">Click to change</div>`
        : `<div style="font-size:1.5rem;margin-bottom:0.2rem">📷</div>
           <div style="font-size:0.75rem;font-weight:500">Click to upload</div>
           <div style="font-size:0.7rem;color:var(--text-faint);margin-top:0.1rem">or paste URL below</div>`;
      mediaColHtml = `
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Image</label>
          <input type="file" id="item-file-${item.id}" accept="image/*" style="display:none">
          <div id="item-img-zone-${item.id}" style="border:2px dashed var(--border);border-radius:var(--radius-sm);padding:0.6rem;text-align:center;cursor:pointer;min-height:90px;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:border-color var(--transition),background var(--transition)" onmouseover="this.style.borderColor='var(--primary)';this.style.background='var(--primary-light)'" onmouseout="this.style.borderColor='var(--border)';this.style.background='transparent'">
            ${preview}
          </div>
          <input type="text" class="form-input" data-item-id="${item.id}" data-field="image"
            placeholder="…or paste image URL" value="${escHtml(item.image)}" style="margin-top:0.4rem;font-size:0.8rem">
        </div>`;
    } else if (createItemType === 'video') {
      mediaColHtml = `
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">YouTube URL</label>
          <input type="text" class="form-input" data-item-id="${item.id}" data-field="videoUrl"
            placeholder="https://youtube.com/watch?v=…" value="${escHtml(item.videoUrl)}">
        </div>`;
    }

    const cols = createItemType === 'text' ? '1fr' : '1fr 1fr';
    div.innerHTML = `
      <div class="question-item-header">
        <span style="display:flex;align-items:center;gap:0.5rem">
          <span class="q-num">${idx + 1}</span>
          Item ${idx + 1}
        </span>
      </div>
      <div style="display:grid;grid-template-columns:${cols};gap:0.75rem;">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Name / Title</label>
          <input type="text" class="form-input" data-item-id="${item.id}" data-field="name"
            placeholder="e.g. Pikachu, BTS Jimin, Pizza…" value="${escHtml(item.name)}">
        </div>
        ${mediaColHtml}
      </div>
    `;

    div.querySelectorAll('input[data-item-id]').forEach(inp => {
      inp.addEventListener('input', () => {
        const it = createItems.find(x => x.id === item.id);
        if (it) it[inp.dataset.field] = inp.value;
      });
    });

    if (createItemType === 'image') {
      const fileInp = div.querySelector(`#item-file-${item.id}`);
      const zone = div.querySelector(`#item-img-zone-${item.id}`);
      if (fileInp && zone) {
        zone.addEventListener('click', () => fileInp.click());
        fileInp.addEventListener('change', () => {
          const file = fileInp.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = ev => {
            const it = createItems.find(x => x.id === item.id);
            if (it) { it.imageData = ev.target.result; it.image = ''; }
            const urlInp = div.querySelector('input[data-field="image"]');
            if (urlInp) urlInp.value = '';
            zone.innerHTML = `
              <img src="${ev.target.result}" style="max-height:64px;border-radius:4px;object-fit:cover;display:block;margin:0 auto 0.25rem">
              <div style="font-size:0.7rem;color:var(--text-faint)">Click to change</div>`;
            zone.addEventListener('click', () => fileInp.click());
          };
          reader.readAsDataURL(file);
        });
      }
    }

    list.appendChild(div);
  });
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

let createThumbnailData = null;

async function submitCreateQuiz(e) {
  e.preventDefault();

  if (!state.currentUser) {
    showToast('Please sign in to create a Quiz', 'error');
    navigate('signin');
    return;
  }

  const title = document.getElementById('quiz-title-input').value.trim();
  if (!title) { showToast('Please enter a Quiz title', 'error'); return; }

  const emptyNames = createItems.filter(it => !it.name.trim());
  if (emptyNames.length) {
    showToast(`Item ${createItems.indexOf(emptyNames[0]) + 1} is missing a name`, 'error');
    return;
  }

  const categorySelect = $('create-category-select');
  const category = categorySelect ? categorySelect.value : '';
  const descEl = document.querySelector('#create-quiz-form .form-textarea');
  const description = descEl ? descEl.value.trim() : '';

  if (!category) { showToast('Please select a category', 'error'); return; }

  // Upload images if any have imageData (base64 from file uploads)
  const processedItems = [];
  for (const item of createItems) {
    let imageUrl = item.image || '';
    if (item.imageData && item.imageData.startsWith('data:')) {
      try {
        const blob = await fetch(item.imageData).then(r => r.blob());
        const formData = new FormData();
        formData.append('image', blob, `item-${item.id}.jpg`);
        const result = await api('/upload', { method: 'POST', body: formData });
        imageUrl = result.url;
      } catch (err) {
        console.error('Upload failed for item', item.id, err);
      }
    }
    processedItems.push({
      name: item.name.trim(),
      image: imageUrl,
      video: item.videoUrl || '',
    });
  }

  // Upload thumbnail if it's a data URL
  let thumbnailUrl = '';
  if (createThumbnailData && createThumbnailData.startsWith('data:')) {
    try {
      const blob = await fetch(createThumbnailData).then(r => r.blob());
      const formData = new FormData();
      formData.append('image', blob, 'thumbnail.jpg');
      const result = await api('/upload', { method: 'POST', body: formData });
      thumbnailUrl = result.url;
    } catch (err) {
      console.error('Thumbnail upload failed:', err);
    }
  }

  const quizPayload = {
    title,
    description,
    type: createItemType,
    category,
    thumbnail: thumbnailUrl,
    items: processedItems,
    shuffle: true,
    visibility: 'public',
    allowComments: true,
  };

  const quiz = await saveUserQuiz(quizPayload);
  if (!quiz) return;

  showToast('Quiz created! 🎉', 'success');
  createThumbnailData = null;
  await loadAllQuizzes();
  setTimeout(() => navigate('quiz', { id: quiz.id }), 400);
}

// ===========================
// Edit Quiz Page
// ===========================
let editQuizId = null;
let editItems = [];
let editItemNextId = 1;
let editItemType = 'image';
let editThumbnailData = null;

function renderEditQuiz(id) {
  const quiz = QUIZ_DATA.find(q => q.id === id || q.id === String(id));
  if (!quiz) { showToast('Quiz not found', 'error'); navigate('browse'); return; }
  if (!canEditQuiz(quiz)) { showToast('Not authorized to edit this quiz', 'error'); navigate('browse'); return; }

  editQuizId = quiz.id;
  editItemType = quiz.type;
  editThumbnailData = null;
  editItemNextId = 1;
  editItems = quiz.items.map(item => ({
    id: editItemNextId++,
    name: item.name,
    image: item.image || '',
    imageData: null,
    videoUrl: item.video || '',
  }));

  // Fill in form fields
  const titleInput = $('edit-quiz-title-input');
  if (titleInput) titleInput.value = quiz.title;
  const descInput = $('edit-quiz-description');
  if (descInput) descInput.value = quiz.description || '';
  const catSelect = $('edit-category-select');
  if (catSelect) catSelect.value = quiz.category;

  // Set item type radio
  const typeRadio = document.getElementById(`edit-type-${editItemType}`);
  if (typeRadio) typeRadio.checked = true;

  // Show current thumbnail
  const thumbArea = $('edit-thumbnail-upload-area');
  if (thumbArea) {
    if (quiz.thumbnail) {
      thumbArea.style.padding = '1rem';
      thumbArea.innerHTML = `
        <img src="${quiz.thumbnail}" style="max-height:130px;max-width:100%;border-radius:var(--radius-sm);object-fit:cover;display:block;margin:0 auto 0.5rem">
        <div style="font-size:0.78rem;color:var(--text-faint)">Click to change</div>`;
    } else {
      thumbArea.style.padding = '2.5rem';
      thumbArea.innerHTML = `
        <div style="font-size:2rem;margin-bottom:0.5rem">📤</div>
        <div style="font-size:0.9rem;font-weight:500;margin-bottom:0.25rem">Click to upload thumbnail</div>
        <div style="font-size:0.78rem;color:var(--text-faint)">PNG, JPG, GIF up to 5MB</div>`;
    }
  }

  renderEditItemList();
  wireEditThumbnailUpload();
  wireEditItemTypeRadios();

  // Wire form submit
  const form = $('edit-quiz-form');
  if (form) form.onsubmit = submitEditQuiz;
}

function wireEditThumbnailUpload() {
  const area = $('edit-thumbnail-upload-area');
  const fileInput = $('edit-thumbnail-file-input');
  if (!area || !fileInput) return;
  area.onclick = () => fileInput.click();
  fileInput.onchange = () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      editThumbnailData = ev.target.result;
      area.style.padding = '1rem';
      area.innerHTML = `
        <img src="${ev.target.result}" style="max-height:130px;max-width:100%;border-radius:var(--radius-sm);object-fit:cover;display:block;margin:0 auto 0.5rem">
        <div style="font-size:0.78rem;color:var(--text-faint)">${escHtml(file.name)} — click to change</div>`;
      area.onclick = () => fileInput.click();
    };
    reader.readAsDataURL(file);
  };
}

function wireEditItemTypeRadios() {
  ['edit-type-image', 'edit-type-video', 'edit-type-text'].forEach(id => {
    const radio = document.getElementById(id);
    if (!radio) return;
    radio.onchange = () => {
      if (radio.checked) { editItemType = radio.value; renderEditItemList(); }
    };
  });
}

function renderEditItemList() {
  const list = $('edit-item-list');
  if (!list) return;
  list.innerHTML = '';

  editItems.forEach((item, idx) => {
    const div = el('div', 'question-item');

    let mediaColHtml = '';
    if (editItemType === 'image') {
      const currentImg = item.imageData || item.image;
      const preview = currentImg
        ? `<img src="${currentImg}" style="max-height:64px;border-radius:4px;object-fit:cover;display:block;margin:0 auto 0.25rem">
           <div style="font-size:0.7rem;color:var(--text-faint)">Click to change</div>`
        : `<div style="font-size:1.5rem;margin-bottom:0.2rem">📷</div>
           <div style="font-size:0.75rem;font-weight:500">Click to upload</div>`;
      mediaColHtml = `
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Image</label>
          <input type="file" id="edit-item-file-${item.id}" accept="image/*" style="display:none">
          <div id="edit-item-img-zone-${item.id}" style="border:2px dashed var(--border);border-radius:var(--radius-sm);padding:0.6rem;text-align:center;cursor:pointer;min-height:90px;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:border-color var(--transition),background var(--transition)">
            ${preview}
          </div>
          <input type="text" class="form-input" data-item-id="${item.id}" data-field="image"
            placeholder="…or paste image URL" value="${escHtml(item.image)}" style="margin-top:0.4rem;font-size:0.8rem">
        </div>`;
    } else if (editItemType === 'video') {
      mediaColHtml = `
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">YouTube URL</label>
          <input type="text" class="form-input" data-item-id="${item.id}" data-field="videoUrl"
            placeholder="https://youtube.com/watch?v=…" value="${escHtml(item.videoUrl)}">
        </div>`;
    }

    const cols = editItemType === 'text' ? '1fr' : '1fr 1fr';
    div.innerHTML = `
      <div class="question-item-header">
        <span style="display:flex;align-items:center;gap:0.5rem">
          <span class="q-num">${idx + 1}</span>
          Item ${idx + 1}
        </span>
      </div>
      <div style="display:grid;grid-template-columns:${cols};gap:0.75rem;">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Name / Title</label>
          <input type="text" class="form-input" data-item-id="${item.id}" data-field="name"
            placeholder="e.g. Pikachu, BTS Jimin, Pizza…" value="${escHtml(item.name)}">
        </div>
        ${mediaColHtml}
      </div>
    `;

    div.querySelectorAll('input[data-item-id]').forEach(inp => {
      inp.addEventListener('input', () => {
        const it = editItems.find(x => x.id === item.id);
        if (it) it[inp.dataset.field] = inp.value;
      });
    });

    if (editItemType === 'image') {
      const fileInp = div.querySelector(`#edit-item-file-${item.id}`);
      const zone = div.querySelector(`#edit-item-img-zone-${item.id}`);
      if (fileInp && zone) {
        zone.addEventListener('click', () => fileInp.click());
        fileInp.addEventListener('change', () => {
          const file = fileInp.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = ev => {
            const it = editItems.find(x => x.id === item.id);
            if (it) { it.imageData = ev.target.result; it.image = ''; }
            const urlInp = div.querySelector('input[data-field="image"]');
            if (urlInp) urlInp.value = '';
            zone.innerHTML = `
              <img src="${ev.target.result}" style="max-height:64px;border-radius:4px;object-fit:cover;display:block;margin:0 auto 0.25rem">
              <div style="font-size:0.7rem;color:var(--text-faint)">Click to change</div>`;
            zone.addEventListener('click', () => fileInp.click());
          };
          reader.readAsDataURL(file);
        });
      }
    }

    list.appendChild(div);
  });
}

async function submitEditQuiz(e) {
  e.preventDefault();

  const title = $('edit-quiz-title-input').value.trim();
  if (!title) { showToast('Please enter a title', 'error'); return; }

  const emptyNames = editItems.filter(it => !it.name.trim());
  if (emptyNames.length) {
    showToast(`Item ${editItems.indexOf(emptyNames[0]) + 1} is missing a name`, 'error');
    return;
  }

  const category = $('edit-category-select').value;
  const description = $('edit-quiz-description').value.trim();

  // Upload new images
  const processedItems = [];
  for (const item of editItems) {
    let imageUrl = item.image || '';
    if (item.imageData && item.imageData.startsWith('data:')) {
      try {
        const blob = await fetch(item.imageData).then(r => r.blob());
        const formData = new FormData();
        formData.append('image', blob, `item-${item.id}.jpg`);
        const result = await api('/upload', { method: 'POST', body: formData });
        imageUrl = result.url;
      } catch (err) {
        console.error('Upload failed for item', item.id, err);
      }
    }
    processedItems.push({ name: item.name.trim(), image: imageUrl, video: item.videoUrl || '' });
  }

  // Upload thumbnail if changed
  let thumbnailUrl = undefined; // undefined = keep existing
  if (editThumbnailData && editThumbnailData.startsWith('data:')) {
    try {
      const blob = await fetch(editThumbnailData).then(r => r.blob());
      const formData = new FormData();
      formData.append('image', blob, 'thumbnail.jpg');
      const result = await api('/upload', { method: 'POST', body: formData });
      thumbnailUrl = result.url;
    } catch (err) {
      console.error('Thumbnail upload failed:', err);
    }
  }

  const payload = {
    title, description, type: editItemType, category,
    items: processedItems,
  };
  if (thumbnailUrl !== undefined) payload.thumbnail = thumbnailUrl;

  try {
    await api(`/quizzes/${editQuizId}`, { method: 'PATCH', body: payload });
    showToast('Quiz updated!', 'success');
    await loadAllQuizzes();
    navigate('quiz', { id: editQuizId });
  } catch (err) {
    showToast(err.message || 'Failed to update quiz', 'error');
  }
}

// ===========================
// Search
// ===========================
function renderSearch(query = '') {
  const input = $('search-input-main');
  if (input && query) input.value = query;

  const results = query
    ? QUIZ_DATA.filter(q =>
        q.title.toLowerCase().includes(query.toLowerCase()) ||
        q.category.toLowerCase().includes(query.toLowerCase()) ||
        q.creator.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const grid = $('search-grid');
  const label = $('search-results-label');

  if (label) {
    label.innerHTML = query
      ? `Found <strong>${results.length}</strong> result${results.length !== 1 ? 's' : ''} for "<strong>${query}</strong>"`
      : 'Type something to search...';
  }

  if (!grid) return;
  grid.innerHTML = '';

  if (!query) return;

  if (results.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-title">No results found</div>
        <div class="empty-state-desc">Try different keywords or browse by category</div>
        <button class="btn btn-primary" onclick="navigate('browse')">Browse All</button>
      </div>`;
    return;
  }

  results.forEach(quiz => grid.appendChild(createQuizCard(quiz)));
}

function doSearch() {
  const query = $('header-search-input').value.trim();
  if (!query) return;
  navigate('search', { q: query });
  const si = $('search-input-main');
  if (si) si.value = query;
}

// ===========================
// Auth Pages
// ===========================
function showVerificationInput(form, email, purpose) {
  // Hide the original form fields
  Array.from(form.querySelectorAll('.form-group, .auth-footer, button[type="submit"]')).forEach(el => el.style.display = 'none');

  const sectionId = `${purpose}-verify-section`;
  if (document.getElementById(sectionId)) return;

  const section = document.createElement('div');
  section.id = sectionId;
  section.className = 'verify-section';
  section.innerHTML = `
    <div style="text-align:center;margin-bottom:1.5rem">
      <div style="font-size:2rem;margin-bottom:0.5rem">📧</div>
      <h3 style="margin-bottom:0.5rem">Check your email</h3>
      <p style="color:var(--text-muted);font-size:0.9rem">We sent a 6-digit code to <strong>${escHtml(email)}</strong></p>
    </div>
    <div class="form-group">
      <label class="form-label">Verification Code</label>
      <input type="text" id="${purpose}-verify-code" class="form-input" placeholder="Enter 6-digit code" maxlength="6" style="text-align:center;font-size:1.5rem;letter-spacing:0.3em" autocomplete="one-time-code">
    </div>
    <button type="button" id="${purpose}-verify-btn" class="btn btn-primary" style="width:100%;margin-top:0.5rem">Verify & Continue</button>
    <p style="text-align:center;margin-top:1rem;font-size:0.8rem;color:var(--text-faint)">Code expires in 10 minutes</p>
  `;
  form.appendChild(section);

  const codeInput = document.getElementById(`${purpose}-verify-code`);
  codeInput.focus();

  document.getElementById(`${purpose}-verify-btn`).addEventListener('click', async () => {
    const code = codeInput.value.trim();
    if (code.length !== 6) { showToast('Please enter the 6-digit code', 'error'); return; }

    const verifyFn = purpose === 'signup' ? verifySignUp : verifySignIn;
    const result = await verifyFn(email, code);
    if (result.error) { showToast(result.error, 'error'); return; }
    showToast(purpose === 'signup'
      ? `Welcome to Brktz, ${escHtml(state.currentUser.username)}!`
      : `Welcome back, ${escHtml(state.currentUser.username)}!`, 'success');
    navigate('browse');
  });
}

function renderSignIn() {
  const form = $('signin-form');
  if (!form) return;
  form.reset();
  // Remove any previous verification UI
  const existingVerify = document.getElementById('signin-verify-section');
  if (existingVerify) existingVerify.remove();

  form.onsubmit = async e => {
    e.preventDefault();
    const username = $('signin-username').value.trim();
    const password = $('signin-password').value;
    if (!username || !password) { showToast('Please fill in all fields', 'error'); return; }
    const result = await doSignIn(username, password);
    if (result.error) { showToast(result.error, 'error'); return; }
    if (result.needsVerification) {
      showToast('Verification code sent to your email!', 'success');
      showVerificationInput(form, result.email, 'signin');
      return;
    }
    showToast(`Welcome back, ${escHtml(state.currentUser.username)}!`, 'success');
    navigate('browse');
  };
}

function renderSignUp() {
  const form = $('signup-form');
  if (!form) return;
  form.reset();
  const existingVerify = document.getElementById('signup-verify-section');
  if (existingVerify) existingVerify.remove();

  form.onsubmit = async e => {
    e.preventDefault();
    const username = $('signup-username').value.trim();
    const email = $('signup-email').value.trim();
    const password = $('signup-password').value;
    const confirm = $('signup-confirm').value;
    if (!username || !email || !password) { showToast('Please fill in all fields', 'error'); return; }
    if (username.length < 3) { showToast('Username must be at least 3 characters', 'error'); return; }
    if (password.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
    if (password !== confirm) { showToast('Passwords do not match', 'error'); return; }
    const result = await doSignUp(username, email, password);
    if (result.error) { showToast(result.error, 'error'); return; }
    if (result.needsVerification) {
      showToast('Verification code sent to your email!', 'success');
      showVerificationInput(form, result.email, 'signup');
      return;
    }
    showToast(`Welcome to Brktz, ${escHtml(username)}!`, 'success');
    navigate('browse');
  };
}

function renderProfile() {
  const container = $('profile-content');
  if (!container) return;
  const user = state.currentUser;

  if (!user) {
    container.innerHTML = `
      <div class="auth-container">
        <div class="auth-card" style="text-align:center">
          <div style="font-size:2.5rem;margin-bottom:1rem">🔒</div>
          <h2 style="margin-bottom:0.5rem">Sign in required</h2>
          <p style="color:var(--text-muted);margin-bottom:1.5rem">You need to sign in to view your profile.</p>
          <button class="btn btn-primary" onclick="navigate('signin')">Sign In</button>
        </div>
      </div>`;
    return;
  }

  const userQuizzes = QUIZ_DATA.filter(q => q.creator === user.username);
  const totalPlays = userQuizzes.reduce((sum, q) => sum + q.plays, 0);
  const totalLikes = userQuizzes.reduce((sum, q) => sum + q.likes, 0);
  const initial = user.username.charAt(0).toUpperCase();

  container.innerHTML = `
    <div class="profile-container">
      <div class="profile-header-card">
        <div class="profile-avatar">${initial}</div>
        <div class="profile-info">
          <h1 class="profile-username">${escHtml(user.username)}${user.is_admin ? ' <span class="admin-badge">ADMIN</span>' : ''}</h1>
          <div class="profile-email">${escHtml(user.email)}</div>
          <div class="profile-joined">Joined ${user.created_at ? timeAgo(new Date(user.created_at + 'Z').getTime()) : 'recently'}</div>
        </div>
        <div class="profile-stats-row">
          <div class="profile-stat">
            <div class="profile-stat-num">${userQuizzes.length}</div>
            <div class="profile-stat-label">Quizzes</div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-num">${formatNumber(totalPlays)}</div>
            <div class="profile-stat-label">Total Plays</div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-num">${formatNumber(totalLikes)}</div>
            <div class="profile-stat-label">Total Likes</div>
          </div>
        </div>
      </div>

      ${userQuizzes.length > 0 ? `
        <h2 style="font-size:1.2rem;font-weight:700;margin:1.5rem 0 1rem">My Quizzes</h2>
        <div class="quiz-grid">
          ${userQuizzes.map(q => {
            const card = createQuizCard(q);
            return card.outerHTML;
          }).join('')}
        </div>
      ` : `
        <div style="text-align:center;padding:3rem 1rem;color:var(--text-muted)">
          <div style="font-size:2rem;margin-bottom:0.75rem">🏆</div>
          <p>You haven't created any Quizzes yet.</p>
          <button class="btn btn-primary" style="margin-top:1rem" onclick="navigate('create')">Create Your First</button>
        </div>
      `}
    </div>`;
}

function renderMyQuizzes() {
  const container = $('my-quizzes-content');
  if (!container) return;
  const user = state.currentUser;

  if (!user) {
    container.innerHTML = `
      <div class="auth-container">
        <div class="auth-card" style="text-align:center">
          <div style="font-size:2.5rem;margin-bottom:1rem">🔒</div>
          <h2 style="margin-bottom:0.5rem">Sign in required</h2>
          <p style="color:var(--text-muted);margin-bottom:1.5rem">Sign in to manage your Quizzes.</p>
          <button class="btn btn-primary" onclick="navigate('signin')">Sign In</button>
        </div>
      </div>`;
    return;
  }

  const userQuizzes = QUIZ_DATA.filter(q => q.creator === user.username);

  container.innerHTML = `
    <div class="my-quizzes-container">
      <div class="my-quizzes-header">
        <h1 style="font-size:1.4rem;font-weight:700">🏆 My Quizzes</h1>
        <button class="btn btn-primary" onclick="navigate('create')">+ Create New</button>
      </div>

      ${userQuizzes.length > 0 ? `
        <div class="my-quizzes-list">
          ${userQuizzes.map(q => {
            const img = q.thumbnail || `https://picsum.photos/seed/q${q.id}/480/270`;
            return `
            <div class="my-quiz-row">
              <img class="my-quiz-thumb" src="${img}" alt="${escHtml(q.title)}">
              <div class="my-quiz-info">
                <div class="my-quiz-title">${escHtml(q.title)}</div>
                <div class="my-quiz-meta">${q.items.length} items · ${q.type} · ${formatNumber(q.plays)} plays · ${timeAgo(q.createdAt)}</div>
              </div>
              <div class="my-quiz-actions">
                <button class="btn btn-outline btn-sm" onclick="navigate('quiz', {id:'${q.id}'})">Play</button>
                <button class="btn btn-outline btn-sm" onclick="navigate('edit', {id:'${q.id}'})">Edit</button>
                <button class="btn btn-outline btn-sm" style="color:var(--warning)" onclick="confirmDeleteQuiz('${q.id}')">Delete</button>
              </div>
            </div>`;
          }).join('')}
        </div>
      ` : `
        <div style="text-align:center;padding:3rem 1rem;color:var(--text-muted)">
          <div style="font-size:2rem;margin-bottom:0.75rem">📝</div>
          <p>No Quizzes yet. Create your first one!</p>
        </div>
      `}
    </div>`;
}

async function confirmDeleteQuiz(id) {
  const quiz = QUIZ_DATA.find(q => q.id === id);
  if (!quiz) return;
  if (confirm(`Delete "${quiz.title}"? This cannot be undone.`)) {
    const success = await deleteUserQuiz(id);
    if (success) {
      showToast('Quiz deleted', 'info');
      renderMyQuizzes();
    }
  }
}

// ===========================
// Sidebar Nav Builder
// ===========================
function buildSidebar() {
  const nav = $('sidebar-nav');
  if (!nav) return;
  nav.innerHTML = '';

  const mainItems = [
    { icon: '🏠', label: 'Browse', page: 'browse' },
    { icon: '➕', label: 'Create', page: 'create' },
    { icon: '🔍', label: 'Search', page: 'search' },
  ];

  mainItems.forEach(item => {
    const navItem = el('div', `nav-item${state.currentPage === item.page ? ' active' : ''}`);
    navItem.dataset.page = item.page;
    navItem.innerHTML = `<span class="nav-icon">${item.icon}</span><span class="nav-label">${item.label}</span>`;
    navItem.addEventListener('click', () => navigate(item.page));
    nav.appendChild(navItem);
  });

  nav.appendChild(el('div', 'nav-divider'));

  const sections = [
    {
      label: 'Entertainment',
      icon: '🎭',
      items: ['kpop', 'gaming', 'entertainment', 'food', 'anime']
    },
    {
      label: 'Knowledge',
      icon: '📚',
      items: ['other']
    }
  ];

  const catIcons = {
    'kpop':'🎵','gaming':'🎮','entertainment':'🎉','food':'🍜','anime':'⛩️','other':'🌍'
  };

  const catLabels = {
    'kpop':'K-Pop','gaming':'Gaming','entertainment':'Entertainment','food':'Food','anime':'Anime','other':'Other'
  };

  sections.forEach(section => {
    const sectionEl = el('div', 'nav-section');
    const collapsed = state.sectionCollapsed[section.label];

    const header = el('div', `nav-section-header${collapsed ? ' collapsed-section' : ''}`);
    header.innerHTML = `
      <span class="section-icon">${section.icon}</span>
      <span class="section-label">${section.label}</span>
      <svg class="chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
    `;
    header.addEventListener('click', () => {
      state.sectionCollapsed[section.label] = !state.sectionCollapsed[section.label];
      buildSidebar();
    });
    sectionEl.appendChild(header);

    const itemsEl = el('div', `nav-section-items${collapsed ? ' hidden' : ''}`);
    itemsEl.style.maxHeight = collapsed ? '0' : (section.items.length * 42) + 'px';

    section.items.forEach(cat => {
      const navItem = el('div', `nav-item${state.currentCategory === cat ? ' active' : ''}`);
      navItem.dataset.page = 'browse';
      navItem.dataset.category = cat;
      navItem.innerHTML = `<span class="nav-icon">${catIcons[cat] || '•'}</span><span class="nav-label">${catLabels[cat] || cat}</span>`;
      navItem.addEventListener('click', () => {
        state.page = 1;
        navigate('browse', { category: cat });
      });
      itemsEl.appendChild(navItem);
    });

    sectionEl.appendChild(itemsEl);
    nav.appendChild(sectionEl);
  });

  nav.appendChild(el('div', 'nav-divider'));

  const bottomItems = [
    { icon: '❤️', label: 'Support Us', page: 'support' },
    { icon: 'ℹ️', label: 'About', page: 'about' },
  ];

  if (state.currentUser) {
    bottomItems.unshift({ icon: '🔖', label: 'Bookmarks', page: 'bookmarks' });
    bottomItems.unshift({ icon: '👤', label: 'My Profile', page: 'profile' });
    bottomItems.unshift({ icon: '🏆', label: 'My Quizzes', page: 'my-quizzes' });
    if (state.currentUser.is_admin) {
      bottomItems.unshift({ icon: '🛡️', label: 'Admin', page: 'admin' });
    }
  } else {
    bottomItems.unshift({ icon: '🔑', label: 'Sign In', page: 'signin' });
  }

  bottomItems.forEach(item => {
    const navItem = el('div', `nav-item${state.currentPage === item.page ? ' active' : ''}`);
    navItem.dataset.page = item.page;
    navItem.innerHTML = `<span class="nav-icon">${item.icon}</span><span class="nav-label">${item.label}</span>`;
    navItem.addEventListener('click', () => navigate(item.page));
    nav.appendChild(navItem);
  });
}

// ===========================
// Filter Controls
// ===========================
function setFilter(filter) {
  state.currentFilter = filter;
  state.page = 1;
  document.querySelectorAll('.filter-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.filter === filter);
  });
  renderBrowse();
}

function setTypeFilter(type) {
  state.currentType = type;
  state.page = 1;
  document.querySelectorAll('.type-badge').forEach(t => {
    t.classList.toggle('active', t.dataset.type === type);
  });
  renderBrowse();
}

// ===========================
// Contact Form
// ===========================
function renderContactPage() {
  // Auto-fill name/email if logged in
  if (state.currentUser) {
    const nameInput = $('contact-name');
    const emailInput = $('contact-email');
    if (nameInput && !nameInput.value) nameInput.value = state.currentUser.username;
    if (emailInput && !emailInput.value) emailInput.value = state.currentUser.email;
  }
}

async function submitContactForm(e) {
  e.preventDefault();
  const name = $('contact-name').value.trim();
  const email = $('contact-email').value.trim();
  const subject = $('contact-subject').value;
  const message = $('contact-message').value.trim();

  if (!name || !email || !subject || !message) {
    showToast('Please fill in all fields', 'error');
    return;
  }

  try {
    await api('/contact', { method: 'POST', body: { name, email, subject, message } });
    showToast('Message sent! We\'ll get back to you soon.', 'success');
    $('contact-form').reset();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ===========================
// Public User Profiles
// ===========================
async function renderUserProfile(username) {
  const container = $('user-profile-content');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-muted)">Loading profile...</div>';

  try {
    const data = await api(`/users/${encodeURIComponent(username)}`);
    const initial = data.username.charAt(0).toUpperCase();

    container.innerHTML = `
      <div class="profile-container">
        <div class="profile-header-card">
          <div class="profile-avatar">${initial}</div>
          <div class="profile-info">
            <h1 class="profile-username">${escHtml(data.username)}</h1>
            <div class="profile-joined">Joined ${timeAgo(data.joinedAt)}</div>
          </div>
          <div class="profile-stats-row">
            <div class="profile-stat">
              <div class="profile-stat-num">${data.quizzesCount}</div>
              <div class="profile-stat-label">Quizzes</div>
            </div>
            <div class="profile-stat">
              <div class="profile-stat-num">${formatNumber(data.totalPlays)}</div>
              <div class="profile-stat-label">Total Plays</div>
            </div>
            <div class="profile-stat">
              <div class="profile-stat-num">${formatNumber(data.totalLikes)}</div>
              <div class="profile-stat-label">Total Likes</div>
            </div>
          </div>
        </div>

        ${data.quizzes.length > 0 ? `
          <h2 style="font-size:1.2rem;font-weight:700;margin:1.5rem 0 1rem">Quizzes by ${escHtml(data.username)}</h2>
          <div class="quiz-grid">
            ${data.quizzes.map(q => createQuizCard(q).outerHTML).join('')}
          </div>
        ` : `
          <div style="text-align:center;padding:3rem 1rem;color:var(--text-muted)">
            <div style="font-size:2rem;margin-bottom:0.75rem">🏆</div>
            <p>${escHtml(data.username)} hasn't created any quizzes yet.</p>
          </div>
        `}
      </div>`;
  } catch (err) {
    container.innerHTML = `
      <div style="text-align:center;padding:3rem;color:var(--text-muted)">
        <div style="font-size:2rem;margin-bottom:0.75rem">😕</div>
        <p>User not found.</p>
        <button class="btn btn-primary" style="margin-top:1rem" onclick="navigate('browse')">Browse Quizzes</button>
      </div>`;
  }
}

// ===========================
// Comments
// ===========================
async function loadComments(quizId) {
  const container = $('quiz-comments');
  if (!container) return;

  try {
    const { comments } = await api(`/quizzes/${quizId}/comments`);
    const user = state.currentUser;

    container.innerHTML = `
      <div class="comments-section">
        <h3 class="comments-title">💬 Comments (${comments.length})</h3>
        ${user ? `
          <div class="comment-form">
            <div class="comment-form-avatar">${user.username.charAt(0).toUpperCase()}</div>
            <textarea id="comment-input" class="form-textarea" placeholder="Add a comment..." rows="2" style="flex:1;margin:0"></textarea>
            <button class="btn btn-primary btn-sm" onclick="submitComment('${quizId}')">Post</button>
          </div>
        ` : `
          <div class="comment-signin-prompt">
            <a href="#" onclick="navigate('signin'); return false;">Sign in</a> to leave a comment
          </div>
        `}
        <div class="comments-list">
          ${comments.length === 0 ? '<div class="comments-empty">No comments yet. Be the first!</div>' : ''}
          ${comments.map(c => `
            <div class="comment-item">
              <div class="comment-avatar" onclick="navigate('user-profile', {username:'${escHtml(c.username)}'})">${c.username.charAt(0).toUpperCase()}</div>
              <div class="comment-content">
                <div class="comment-header">
                  <span class="comment-username" onclick="navigate('user-profile', {username:'${escHtml(c.username)}'})">@${escHtml(c.username)}</span>
                  <span class="comment-time">${timeAgo(c.createdAt)}</span>
                  ${(user && (user.id === c.userId || user.is_admin)) ? `<button class="comment-delete" onclick="deleteComment('${quizId}', ${c.id})">✕</button>` : ''}
                </div>
                <div class="comment-body">${escHtml(c.body)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>`;
  } catch (err) {
    container.innerHTML = '';
  }
}

async function submitComment(quizId) {
  const input = $('comment-input');
  if (!input) return;
  const body = input.value.trim();
  if (!body) { showToast('Comment cannot be empty', 'error'); return; }

  try {
    await api(`/quizzes/${quizId}/comments`, { method: 'POST', body: { body } });
    input.value = '';
    loadComments(quizId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteComment(quizId, commentId) {
  if (!confirm('Delete this comment?')) return;
  try {
    await api(`/quizzes/${quizId}/comments/${commentId}`, { method: 'DELETE' });
    loadComments(quizId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ===========================
// Leaderboard
// ===========================
async function loadLeaderboard(quizId) {
  const container = $('quiz-leaderboard');
  if (!container) return;

  try {
    const { totalResults, leaders } = await api(`/quizzes/${quizId}/leaderboard`);

    if (totalResults === 0) {
      container.innerHTML = `
        <div class="leaderboard-section">
          <h3 class="leaderboard-title">🏆 Champion Leaderboard</h3>
          <div class="leaderboard-empty">No results yet. Play this quiz to see who wins most!</div>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="leaderboard-section">
        <h3 class="leaderboard-title">🏆 Champion Leaderboard</h3>
        <div class="leaderboard-subtitle">Based on ${totalResults} completed tournament${totalResults !== 1 ? 's' : ''}</div>
        <div class="leaderboard-list">
          ${leaders.map((l, i) => `
            <div class="leaderboard-item">
              <span class="leaderboard-rank">#${i + 1}</span>
              ${l.image ? `<img class="leaderboard-img" src="${l.image}" alt="${escHtml(l.name)}">` : ''}
              <span class="leaderboard-name">${escHtml(l.name)}</span>
              <div class="leaderboard-bar-wrap">
                <div class="leaderboard-bar" style="width:${l.winPct}%"></div>
              </div>
              <span class="leaderboard-pct">${l.winPct}%</span>
              <span class="leaderboard-wins">${l.wins} win${l.wins !== 1 ? 's' : ''}</span>
            </div>
          `).join('')}
        </div>
      </div>`;
  } catch (err) {
    container.innerHTML = '';
  }
}

// ===========================
// Tournament Progress Saving
// ===========================
function saveTournamentProgress() {
  const t = state.tournament;
  if (!t || t.done) return;
  try {
    const data = {
      quizId: t.quizId, allItems: t.allItems, currentRound: t.currentRound,
      winners: t.winners, matchIndex: t.matchIndex, history: t.history,
      roundNumber: t.roundNumber, totalRounds: t.totalRounds, size: t.size,
      roundName: t.roundName, done: t.done, champion: t.champion,
      undoStack: t.undoStack.slice(-20), // limit undo depth for storage
      savedAt: Date.now(),
    };
    localStorage.setItem(`tournament_progress_${t.quizId}`, JSON.stringify(data));
  } catch { /* storage full — silently fail */ }
}

function loadTournamentProgress(quizId) {
  try {
    const raw = localStorage.getItem(`tournament_progress_${quizId}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.savedAt > 24 * 60 * 60 * 1000) {
      clearTournamentProgress(quizId);
      return null;
    }
    return data;
  } catch { return null; }
}

function clearTournamentProgress(quizId) {
  localStorage.removeItem(`tournament_progress_${quizId}`);
}

function resumeTournament() {
  const progress = loadTournamentProgress(state.currentQuiz.id);
  if (!progress) { showToast('No saved progress found', 'error'); return; }
  state.tournament = progress;
  renderTournamentMatch();
}

function discardProgress(quizId) {
  clearTournamentProgress(quizId);
  renderQuizLobby(quizId);
}

// ===========================
// Bookmarks
// ===========================
async function toggleBookmark(e, id) {
  e.stopPropagation();
  if (!state.currentUser) {
    showToast('Sign in to bookmark quizzes', 'info');
    navigate('signin');
    return;
  }
  try {
    const { bookmarked } = await api(`/quizzes/${id}/bookmark`, { method: 'POST' });
    showToast(bookmarked ? 'Bookmarked!' : 'Bookmark removed', bookmarked ? 'success' : 'info');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function renderBookmarks() {
  const container = $('bookmarks-content');
  if (!container) return;

  if (!state.currentUser) {
    container.innerHTML = `
      <div class="auth-container">
        <div class="auth-card" style="text-align:center">
          <div style="font-size:2.5rem;margin-bottom:1rem">🔒</div>
          <h2 style="margin-bottom:0.5rem">Sign in required</h2>
          <p style="color:var(--text-muted);margin-bottom:1.5rem">Sign in to see your bookmarks.</p>
          <button class="btn btn-primary" onclick="navigate('signin')">Sign In</button>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-muted)">Loading bookmarks...</div>';

  try {
    const { quizzes } = await api('/quizzes/bookmarked/list');
    container.innerHTML = `
      <div class="my-quizzes-container">
        <div class="my-quizzes-header">
          <h1 style="font-size:1.4rem;font-weight:700">🔖 My Bookmarks</h1>
        </div>
        ${quizzes.length > 0 ? `
          <div class="quiz-grid">
            ${quizzes.map(q => createQuizCard(q).outerHTML).join('')}
          </div>
        ` : `
          <div style="text-align:center;padding:3rem 1rem;color:var(--text-muted)">
            <div style="font-size:2rem;margin-bottom:0.75rem">🔖</div>
            <p>No bookmarks yet. Browse quizzes and bookmark your favorites!</p>
            <button class="btn btn-primary" style="margin-top:1rem" onclick="navigate('browse')">Browse Quizzes</button>
          </div>
        `}
      </div>`;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ===========================
// Forgot Password
// ===========================
function renderForgotPassword() {
  const form = $('forgot-password-form');
  if (!form) return;
  form.reset();

  // Remove any previous reset UI
  const existingReset = document.getElementById('reset-section');
  if (existingReset) existingReset.remove();
  const emailGroup = $('forgot-email-group');
  const submitBtn = $('forgot-submit-btn');
  if (emailGroup) emailGroup.style.display = '';
  if (submitBtn) { submitBtn.style.display = ''; submitBtn.textContent = 'Send Reset Code'; }

  form.onsubmit = async e => {
    e.preventDefault();
    const email = $('forgot-email').value.trim();
    if (!email) { showToast('Please enter your email', 'error'); return; }

    const submitBtn = $('forgot-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
      await api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
    } catch (err) {
      showToast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Reset Code';
      return;
    }

    // Always show code input after submission (even if email not found, for security)
    if (emailGroup) emailGroup.style.display = 'none';
    submitBtn.style.display = 'none';

    const section = document.createElement('div');
    section.id = 'reset-section';
    section.innerHTML = `
      <div style="text-align:center;margin-bottom:1.5rem">
        <div style="font-size:2rem;margin-bottom:0.5rem">📧</div>
        <h3 style="margin-bottom:0.5rem">Check your email</h3>
        <p style="color:var(--text-muted);font-size:0.9rem">If an account exists for <strong>${escHtml(email)}</strong>, we sent a reset code.</p>
      </div>
      <div class="form-group">
        <label class="form-label">Reset Code</label>
        <input type="text" id="reset-code" class="form-input" placeholder="6-digit code" maxlength="6" style="text-align:center;font-size:1.5rem;letter-spacing:0.3em" autocomplete="one-time-code">
      </div>
      <div class="form-group">
        <label class="form-label">New Password</label>
        <input type="password" id="reset-new-password" class="form-input" placeholder="New password (min 6 characters)" minlength="6">
      </div>
      <div class="form-group">
        <label class="form-label">Confirm New Password</label>
        <input type="password" id="reset-confirm-password" class="form-input" placeholder="Confirm new password">
      </div>
      <button type="button" id="reset-submit-btn" class="btn btn-primary" style="width:100%;justify-content:center;padding:0.75rem;margin-top:0.5rem">Reset Password</button>
      <p style="text-align:center;margin-top:1rem;font-size:0.8rem;color:var(--text-faint)">Code expires in 10 minutes</p>
    `;
    form.appendChild(section);
    $('reset-code').focus();

    $('reset-submit-btn').addEventListener('click', async () => {
      const code = $('reset-code').value.trim();
      const newPassword = $('reset-new-password').value;
      const confirmPassword = $('reset-confirm-password').value;
      if (code.length !== 6) { showToast('Please enter the 6-digit code', 'error'); return; }
      if (newPassword.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
      if (newPassword !== confirmPassword) { showToast('Passwords do not match', 'error'); return; }

      const btn = $('reset-submit-btn');
      btn.disabled = true;
      btn.textContent = 'Resetting...';

      try {
        await api('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, code, newPassword }) });
        showToast('Password reset! Please sign in with your new password.', 'success');
        navigate('signin');
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Reset Password';
      }
    });
  };
}

// ===========================
// Admin Dashboard
// ===========================
async function renderAdminDashboard() {
  const container = $('admin-content');
  if (!container) return;

  if (!state.currentUser?.is_admin) {
    container.innerHTML = `
      <div class="auth-container">
        <div class="auth-card" style="text-align:center">
          <div style="font-size:2.5rem;margin-bottom:1rem">🚫</div>
          <h2>Access Denied</h2>
          <p style="color:var(--text-muted);margin-top:0.5rem">Admin access required.</p>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-muted)">Loading...</div>';

  try {
    const [{ messages }, { users }] = await Promise.all([
      api('/contact'),
      api('/users'),
    ]);

    const unread = messages.filter(m => m.status === 'unread').length;

    container.innerHTML = `
      <div style="max-width:960px;margin:0 auto;padding:1.5rem 1rem">
        <h1 style="font-size:1.5rem;font-weight:700;margin-bottom:1.5rem">🛡️ Admin Dashboard</h1>
        <div style="display:flex;gap:0.5rem;margin-bottom:1.5rem;border-bottom:1px solid var(--border);padding-bottom:0.75rem">
          <button id="tab-messages" class="btn btn-primary btn-sm">
            Contact Messages ${unread > 0 ? `<span style="background:var(--accent-red,#ef4444);color:#fff;border-radius:999px;padding:0 6px;font-size:0.7rem;margin-left:4px">${unread}</span>` : ''}
          </button>
          <button id="tab-users" class="btn btn-outline btn-sm">Users (${users.length})</button>
        </div>
        <div id="admin-tab-content"></div>
      </div>`;

    function renderMessagesTab() {
      $('tab-messages').className = 'btn btn-primary btn-sm';
      $('tab-users').className = 'btn btn-outline btn-sm';
      const tab = $('admin-tab-content');
      if (messages.length === 0) {
        tab.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem">No messages yet.</p>';
        return;
      }
      tab.innerHTML = messages.map(m => `
        <div id="msg-${m.id}" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:1rem;margin-bottom:0.75rem;${m.status === 'unread' ? 'border-left:3px solid var(--primary)' : ''}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap">
            <div>
              <strong>${escHtml(m.name)}</strong>
              <span style="color:var(--text-muted);font-size:0.8rem;margin-left:0.5rem">&lt;${escHtml(m.email)}&gt;</span>
              ${m.status === 'unread' ? '<span style="background:var(--primary);color:#fff;border-radius:4px;padding:1px 6px;font-size:0.7rem;margin-left:0.5rem">NEW</span>' : ''}
            </div>
            <div style="display:flex;gap:0.5rem;flex-shrink:0">
              <button class="btn btn-outline btn-sm" onclick="adminToggleRead(${m.id}, '${m.status}')">
                ${m.status === 'unread' ? 'Mark Read' : 'Mark Unread'}
              </button>
              <button class="btn btn-outline btn-sm" style="color:var(--accent-red,#ef4444)" onclick="adminDeleteMessage(${m.id})">Delete</button>
            </div>
          </div>
          <div style="font-size:0.85rem;color:var(--text-muted);margin-top:0.35rem">${escHtml(m.subject)} · ${timeAgo(new Date(m.created_at + 'Z').getTime())}</div>
          <div style="margin-top:0.6rem;font-size:0.9rem;white-space:pre-wrap">${escHtml(m.message)}</div>
        </div>`).join('');
    }

    function renderUsersTab() {
      $('tab-messages').className = 'btn btn-outline btn-sm';
      $('tab-users').className = 'btn btn-primary btn-sm';
      const tab = $('admin-tab-content');
      tab.innerHTML = `
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:0.9rem">
            <thead>
              <tr style="border-bottom:1px solid var(--border);text-align:left">
                <th style="padding:0.5rem 0.75rem">Username</th>
                <th style="padding:0.5rem 0.75rem">Email</th>
                <th style="padding:0.5rem 0.75rem">Joined</th>
                <th style="padding:0.5rem 0.75rem">Role</th>
                <th style="padding:0.5rem 0.75rem"></th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => `
                <tr id="user-row-${u.id}" style="border-bottom:1px solid var(--border)">
                  <td style="padding:0.6rem 0.75rem;font-weight:600">${escHtml(u.username)}</td>
                  <td style="padding:0.6rem 0.75rem;color:var(--text-muted)">${escHtml(u.email)}</td>
                  <td style="padding:0.6rem 0.75rem;color:var(--text-muted)">${timeAgo(new Date(u.created_at + 'Z').getTime())}</td>
                  <td style="padding:0.6rem 0.75rem">${u.is_admin ? '<span class="admin-badge">ADMIN</span>' : 'User'}</td>
                  <td style="padding:0.6rem 0.75rem">
                    ${u.id !== state.currentUser.id ? `<button class="btn btn-outline btn-sm" style="color:var(--accent-red,#ef4444)" onclick="adminDeleteUser(${u.id}, '${escHtml(u.username)}')">Delete</button>` : '<span style="color:var(--text-faint);font-size:0.8rem">You</span>'}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    }

    $('tab-messages').addEventListener('click', renderMessagesTab);
    $('tab-users').addEventListener('click', renderUsersTab);
    renderMessagesTab();

    // Expose helpers for onclick handlers
    window.adminToggleRead = async (id, currentStatus) => {
      try {
        const { status } = await api(`/contact/${id}/read`, { method: 'PATCH' });
        // Re-render to reflect change
        renderAdminDashboard();
      } catch (err) { showToast(err.message, 'error'); }
    };

    window.adminDeleteMessage = async (id) => {
      if (!confirm('Delete this message?')) return;
      try {
        await api(`/contact/${id}`, { method: 'DELETE' });
        renderAdminDashboard();
      } catch (err) { showToast(err.message, 'error'); }
    };

    window.adminDeleteUser = async (id, username) => {
      if (!confirm(`Delete user "${username}" and all their quizzes? This cannot be undone.`)) return;
      try {
        await api(`/users/${id}`, { method: 'DELETE' });
        renderAdminDashboard();
      } catch (err) { showToast(err.message, 'error'); }
    };

  } catch (err) {
    showToast(err.message, 'error');
    container.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:3rem">${escHtml(err.message)}</p>`;
  }
}

// ===========================
// Init
// ===========================
async function init() {
  // Apply visual settings immediately
  applyTheme(state.theme);
  applySidebar();
  buildSidebar();
  updateAuthUI();

  // Load user from token
  await loadCurrentUser();
  updateAuthUI();
  buildSidebar();

  // Load quizzes from server
  await loadAllQuizzes();

  $('theme-toggle').addEventListener('click', () => {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  });

  $('sidebar-toggle-btn').addEventListener('click', toggleSidebar);
  $('sidebar-overlay').addEventListener('click', closeMobileSidebar);

  $('header-search-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') doSearch();
  });

  let searchTimer = null;
  $('header-search-input').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const q = $('header-search-input').value.trim();
      if (q.length >= 2) {
        navigate('search', { q });
      }
    }, 400);
  });

  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => setFilter(tab.dataset.filter));
  });

  document.querySelectorAll('.type-badge').forEach(badge => {
    badge.addEventListener('click', () => setTypeFilter(badge.dataset.type));
  });

  $('btn-load-more').addEventListener('click', () => {
    state.page++;
    renderBrowse();
  });

  $('btn-browse').addEventListener('click', () => { state.currentCategory = null; navigate('browse'); });
  $('btn-create').addEventListener('click', () => navigate('create'));

  const createForm = $('create-quiz-form');
  if (createForm) createForm.addEventListener('submit', submitCreateQuiz);

  // Browser back/forward button
  window.addEventListener('popstate', (e) => {
    const s = e.state || parseUrl();
    _skipPushState = true;
    navigate(s.page, s.data || {});
    _skipPushState = false;
  });

  const searchMain = $('search-input-main');
  if (searchMain) {
    let searchPageTimer = null;
    searchMain.addEventListener('input', () => {
      clearTimeout(searchPageTimer);
      searchPageTimer = setTimeout(() => {
        const q = searchMain.value.trim();
        state.searchQuery = q;
        renderSearch(q);
      }, 300);
    });
    searchMain.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const q = searchMain.value.trim();
        state.searchQuery = q;
        renderSearch(q);
      }
    });
  }

  document.addEventListener('click', () => closeUserDropdown());

  // Show cookie consent banner if not yet accepted/rejected
  showCookieConsent();

  // Parse initial URL and navigate
  const initial = parseUrl();
  // Replace current history entry so back button works correctly
  history.replaceState({ page: initial.page, data: initial.data }, '', buildUrl(initial.page, initial.data));
  _skipPushState = true;
  navigate(initial.page, initial.data);
  _skipPushState = false;
}

document.addEventListener('DOMContentLoaded', init);
