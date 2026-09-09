// Central place for every backend call.
// Default to same-origin `/api` so Vite can proxy to the Express server.
const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const USE_MOCKS = false;

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export function notifyStatsChanged() {
  window.dispatchEvent(new CustomEvent('studydeck:stats-changed'));
}

async function readError(res, fallback) {
  const data = await res.json().catch(() => ({}));
  const err = new Error(data.error || fallback);
  err.status = res.status;
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('studydeck:unauthorized'));
  }
  throw err;
}

// ---- Auth ----
export async function register(email, password) {
  if (USE_MOCKS) return mockAuth(email);
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error || 'Registration failed');
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function getMe(token) {
  if (USE_MOCKS) {
    return Promise.resolve({
      user: { id: '1', email: 'you@example.com' },
      stats: { documents: 0, completedSessions: 0, streak: 0 }
    });
  }
  const res = await fetch(`${BASE_URL}/auth/me`, { headers: authHeaders(token) });
  if (!res.ok) await readError(res, 'Could not load account');
  return res.json();
}

export async function login(email, password) {
  if (USE_MOCKS) return mockAuth(email);
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error || 'Invalid credentials');
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function updateProfile(token, profileData) {
  const res = await fetch(`${BASE_URL}/auth/profile`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(profileData)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error || 'Failed to update profile');
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function mockAuth(email) {
  return Promise.resolve({ token: 'mock-jwt-token', user: { id: '1', email } });
}

// ---- Documents ----
export async function uploadDocument(token, { title, rawText, file, quizCount = 5 }) {
  if (USE_MOCKS) return mockUpload(title || file?.name);

  const formData = new FormData();
  if (title) formData.append('title', title);
  if (quizCount !== undefined && quizCount !== null) formData.append('quizCount', quizCount);
  if (file) formData.append('file', file);
  else formData.append('rawText', rawText);

  const res = await fetch(`${BASE_URL}/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }, // no Content-Type header — browser sets multipart boundary automatically
    body: formData
  });
  if (!res.ok) await readError(res, 'Upload failed');
  return res.json();
}

function mockUpload(title) {
  const id = crypto.randomUUID();
  return Promise.resolve({ id, status: 'pending', title });
}

export async function fetchDocuments(token, query = '') {
  if (USE_MOCKS) return mockDocumentList();
  const url = query ? `${BASE_URL}/documents?q=${encodeURIComponent(query)}` : `${BASE_URL}/documents`;
  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) await readError(res, 'Could not load documents');
  return res.json();
}

export async function getDocument(token, docId) {
  if (USE_MOCKS) {
    return Promise.resolve({
      id: docId,
      title: 'Sprint planning — Sept 1',
      status: 'done',
      result: mockResult()
    });
  }
  const res = await fetch(`${BASE_URL}/documents/${docId}`, { headers: authHeaders(token) });
  if (!res.ok) await readError(res, 'Could not load document');
  return res.json();
}

export async function regenerateDocument(token, docId, quizCount = 5) {
  if (USE_MOCKS) return Promise.resolve({ status: 'pending' });
  const res = await fetch(`${BASE_URL}/documents/${docId}/regenerate`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ quizCount })
  });
  if (!res.ok) await readError(res, 'Could not regenerate document');
  return res.json();
}

export async function deleteDocument(token, docId) {
  if (USE_MOCKS) return Promise.resolve(true);
  const res = await fetch(`${BASE_URL}/documents/${docId}`, {
    method: 'DELETE',
    headers: authHeaders(token)
  });
  if (!res.ok) await readError(res, 'Could not delete document');
  return true;
}

// ---- Quiz History & Attempts ----
export async function saveQuizAttempt(token, docId, { score, total, answers = [] }) {
  if (USE_MOCKS) return Promise.resolve({ score, total, percentage: Math.round((score / total) * 100) });
  const res = await fetch(`${BASE_URL}/documents/${docId}/quiz-attempts`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ score, total, answers })
  });
  if (!res.ok) await readError(res, 'Could not save quiz attempt');
  return res.json();
}

export async function getQuizAttempts(token, docId) {
  if (USE_MOCKS) return Promise.resolve([]);
  const res = await fetch(`${BASE_URL}/documents/${docId}/quiz-attempts`, { headers: authHeaders(token) });
  if (!res.ok) await readError(res, 'Could not load quiz history');
  return res.json();
}

// ---- AI Document Chat ----
export async function chatDocument(token, docId, message, history = []) {
  if (USE_MOCKS) {
    return Promise.resolve({
      reply: "This is a simulated AI response about the document. To get real AI answers, make sure your Gemini API key is configured!"
    });
  }
  const res = await fetch(`${BASE_URL}/documents/${docId}/chat`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ message, history })
  });
  if (!res.ok) await readError(res, 'Chat request failed');
  return res.json();
}

function mockDocumentList() {
  return Promise.resolve([
    { id: 'a1', title: 'Sprint planning — Sept 1', status: 'done', createdAt: Date.now() - 86400000 },
    { id: 'a2', title: 'Intro to Cell Biology, Lecture 4', status: 'processing', createdAt: Date.now() - 3600000 },
    { id: 'a3', title: 'Client onboarding call', status: 'failed', createdAt: Date.now() - 172800000 }
  ]);
}

// SSE connection for live status
export function subscribeToStatus(token, docId, onUpdate) {
  if (USE_MOCKS) return mockStatusTicker(onUpdate);

  const es = new EventSource(`${BASE_URL}/documents/${docId}/events?token=${token}`);
  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onUpdate(data);
    } catch (err) {
      console.error('Error parsing SSE data:', err);
    }
  };
  es.onerror = (e) => {
    console.warn('SSE connection closed or errored', e);
  };
  return () => es.close();
}

function mockStatusTicker(onUpdate) {
  const steps = ['processing', 'done'];
  let i = 0;
  const interval = setInterval(() => {
    onUpdate({
      status: steps[i],
      result: steps[i] === 'done' ? mockResult() : null
    });
    i++;
    if (i >= steps.length) clearInterval(interval);
  }, 1400);
  return () => clearInterval(interval);
}

function mockResult() {
  return {
    summary:
      'The team reviewed sprint velocity from the last cycle, agreed to carry over two unfinished tickets, and scoped the upcoming authentication feature. Design sign-off is pending before backend work begins.',
    actionItems: [
      { task: 'Finalize auth API contract', owner: 'Priya', dueDate: 'Sep 5' },
      { task: 'Share Figma sign-off link', owner: 'Dev', dueDate: 'Sep 3' },
      { task: 'Migrate carried-over tickets to new sprint', owner: 'Aman', dueDate: 'Sep 4' }
    ],
    quiz: [
      {
        question: 'What is blocking backend work on the auth feature?',
        options: ['Missing API key', 'Design sign-off', 'Server downtime', 'Budget approval'],
        correctIndex: 1
      },
      {
        question: 'How many tickets were carried over from the last sprint?',
        options: ['One', 'Two', 'Three', 'None'],
        correctIndex: 1
      }
    ],
    flashcards: [
      { front: 'Sprint Velocity', back: 'The amount of work completed by the team during a sprint cycle.' },
      { front: 'Auth Blocker', back: 'Design sign-off is pending before backend implementation starts.' }
    ]
  };
}

export async function exportPdf(token, docId) {
  if (USE_MOCKS) {
    alert('PDF export will call GET /documents/:id/export once the backend is live.');
    return;
  }
  const res = await fetch(`${BASE_URL}/documents/${docId}/export`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    try {
      await readError(res, 'PDF export failed');
    } catch (err) {
      alert(err.message || 'PDF export failed');
    }
    return;
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `studydeck-${docId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- AI Coach & Knowledge Graph ----
export async function extractDocumentKnowledge(token, docId) {
  const res = await fetch(`${BASE_URL}/coach/extract/${docId}`, {
    method: 'POST',
    headers: authHeaders(token)
  });
  if (!res.ok) await readError(res, 'Failed to extract knowledge concepts');
  return res.json();
}

export async function getDocumentKnowledge(token, docId) {
  const res = await fetch(`${BASE_URL}/coach/documents/${docId}/knowledge`, {
    headers: authHeaders(token)
  });
  if (!res.ok) await readError(res, 'Failed to load document knowledge');
  return res.json();
}

export async function getKnowledgeMap(token, documentId = null) {
  const url = documentId && documentId !== 'all'
    ? `${BASE_URL}/coach/knowledge-map?documentId=${encodeURIComponent(documentId)}`
    : `${BASE_URL}/coach/knowledge-map`;
  const res = await fetch(url, {
    headers: authHeaders(token)
  });
  if (!res.ok) await readError(res, 'Failed to load knowledge map');
  return res.json();
}

export async function submitConceptAttempt(token, conceptId, { isCorrect, source = 'quiz', difficulty = 'medium' }) {
  const res = await fetch(`${BASE_URL}/coach/concepts/${conceptId}/attempt`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ isCorrect, source, difficulty })
  });
  if (!res.ok) await readError(res, 'Failed to update concept mastery');
  return res.json();
}

export async function diagnoseMistake(token, { question, studentAnswer, correctAnswer, options, conceptName, documentId, difficulty }) {
  const res = await fetch(`${BASE_URL}/coach/diagnose-mistake`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ question, studentAnswer, correctAnswer, options, conceptName, documentId, difficulty })
  });
  if (!res.ok) await readError(res, 'Failed to diagnose mistake');
  return res.json();
}

export async function getMistakes(token, params = {}) {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '' && v !== 'all')
  );
  const query = new URLSearchParams(cleanParams).toString();
  const url = query ? `${BASE_URL}/coach/mistakes?${query}` : `${BASE_URL}/coach/mistakes`;
  const res = await fetch(url, {
    headers: authHeaders(token)
  });
  if (!res.ok) await readError(res, 'Failed to load mistakes');
  return res.json();
}

export async function retestMistake(token, mistakeId, { selectedIndex, selectedAnswer }) {
  const res = await fetch(`${BASE_URL}/coach/mistakes/${mistakeId}/retest`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ selectedIndex, selectedAnswer })
  });
  if (!res.ok) await readError(res, 'Failed to submit mistake retest');
  return res.json();
}

export async function getAdaptiveQuiz(token, params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = query ? `${BASE_URL}/coach/adaptive-quiz?${query}` : `${BASE_URL}/coach/adaptive-quiz`;
  const res = await fetch(url, {
    headers: authHeaders(token)
  });
  if (!res.ok) await readError(res, 'Failed to load adaptive quiz');
  return res.json();
}

export async function startFixWeakness(token, conceptId = null) {
  const res = await fetch(`${BASE_URL}/coach/fix-weakness/start`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ conceptId })
  });
  if (!res.ok) await readError(res, 'Failed to start weakness session');
  return res.json();
}

export async function submitFixWeaknessStep(token, { conceptId, stepIndex, isCorrect }) {
  const res = await fetch(`${BASE_URL}/coach/fix-weakness/step`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ conceptId, stepIndex, isCorrect })
  });
  if (!res.ok) await readError(res, 'Failed to update weakness progress');
  return res.json();
}

export async function getDailyReview(token, documentId = null) {
  const url = documentId && documentId !== 'all'
    ? `${BASE_URL}/coach/daily-review?documentId=${encodeURIComponent(documentId)}`
    : `${BASE_URL}/coach/daily-review`;
  const res = await fetch(url, {
    headers: authHeaders(token)
  });
  if (!res.ok) await readError(res, 'Failed to load daily review queue');
  return res.json();
}

export async function submitDailyReview(token, { conceptId, isCorrect }) {
  const res = await fetch(`${BASE_URL}/coach/daily-review/submit`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ conceptId, isCorrect })
  });
  if (!res.ok) await readError(res, 'Failed to submit daily review answer');
  return res.json();
}

// ---- Payments & Stripe Subscription ----
export async function getPlans() {
  const res = await fetch(`${BASE_URL}/payment/plans`);
  if (!res.ok) await readError(res, 'Failed to load pricing plans');
  return res.json();
}

export async function getSubscriptionStatus(token) {
  const res = await fetch(`${BASE_URL}/payment/subscription`, {
    headers: authHeaders(token)
  });
  if (!res.ok) await readError(res, 'Failed to fetch subscription status');
  return res.json();
}

export async function createCheckoutSession(token, planInterval = 'monthly') {
  const res = await fetch(`${BASE_URL}/payment/create-checkout-session`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ planInterval })
  });
  if (!res.ok) await readError(res, 'Failed to start Stripe checkout');
  return res.json();
}

export async function createPortalSession(token) {
  const res = await fetch(`${BASE_URL}/payment/create-portal-session`, {
    method: 'POST',
    headers: authHeaders(token)
  });
  if (!res.ok) await readError(res, 'Failed to open billing portal');
  return res.json();
}

