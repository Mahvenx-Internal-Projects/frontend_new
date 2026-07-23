import axios from 'axios';

// Local dev  → hostname is localhost → use Vite proxy /api
// Production → use full API URL directly
const isLocal = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE = isLocal
  ? '/api'
  : (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'https://localhost:55296//api');

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('lms_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      // Clear both the raw token AND the Zustand-persisted auth store key.
      // Without clearing 'lms_auth' too, isAuthenticated stays true after
      // reload and the app silently logs the user back in to their real
      // role's dashboard — which looks like a confusing "bounce back"
      // instead of a clean logout.
      localStorage.removeItem('lms_token');
      localStorage.removeItem('lms_user');
      localStorage.removeItem('lms_auth');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ─── Auth ─────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),

  register: (d: object) =>
    api.post("/auth/register", d),

  me: () =>
    api.get("/auth/me"),

  organizations: () =>
    api.get("/auth/organizations"),

  // Forgot Password
  forgotPassword: (email: string) =>
    api.post("/auth/forgot-password", {
      email,
    }),

  // Verify OTP
  verifyOtp: (email: string, otp: string) =>
    api.post("/auth/verify-otp", {
      email,
      otp,
    }),

  // Reset Password
  resetPassword: (
    email: string,
    otp: string,
    newPassword: string
  ) =>
    api.post("/auth/reset-password", {
      email,
      otp,
      newPassword,
    }),
};

// ─── Organizations ────────────────────────────────────────────
export const orgsApi = {
  getAll:  (p?: object) => api.get('/organizations', { params: p }),
  get:     (id: number) => api.get(`/organizations/${id}`),
  create:  (d: object)  => api.post('/organizations', d),
  update:  (id: number, d: object) => api.put(`/organizations/${id}`, d),
  delete:  (id: number) => api.delete(`/organizations/${id}`),
};

// ─── Users ────────────────────────────────────────────────────
export const usersApi = {
  getAll:  (p?: object) => api.get('/users', { params: p }),
  get:     (id: number) => api.get(`/users/${id}`),
  create:  (d: object)  => api.post('/users', d),
  update:  (id: number, d: object) => api.put(`/users/${id}`, d),
  delete:  (id: number) => api.delete(`/users/${id}`),
};

// ─── Categories ───────────────────────────────────────────────
export const categoriesApi = {
  getAll:  (orgId?: number) => api.get('/categories', { params: { orgId } }),
  create:  (d: object)  => api.post('/categories', d),
  update:  (id: number, d: object) => api.put(`/categories/${id}`, d),
  delete:  (id: number) => api.delete(`/categories/${id}`),
};

// ─── Courses ──────────────────────────────────────────────────
export const coursesApi = {
  getAll:       (p?: object) => api.get('/courses', { params: p }),
  get:          (id: number) => api.get(`/courses/${id}`),
  create:       (d: object)  => api.post('/courses', d),
  update:       (id: number, d: object) => api.put(`/courses/${id}`, d),
  delete:       (id: number) => api.delete(`/courses/${id}`),
  getModules:   (courseId: number) => api.get(`/modules/course/${courseId}`),
  createModule: (d: object) => api.post('/modules', d),
  updateModule: (id: number, d: object) => api.put(`/modules/${id}`, d),
  deleteModule: (id: number) => api.delete(`/modules/${id}`),
};

// ─── Modules ──────────────────────────────────────────────────
export const modulesApi = {
  getByCourse: (courseId: number) => api.get(`/modules/course/${courseId}`),
  create:  (d: object)  => api.post('/modules', d),
  update:  (id: number, d: object) => api.put(`/modules/${id}`, d),
  delete:  (id: number) => api.delete(`/modules/${id}`),
};

// ─── Lessons ──────────────────────────────────────────────────
export const lessonsApi = {
  get:            (id: number) => api.get(`/lessons/${id}`),
  create:         (d: object)  => api.post('/lessons', d),
  update:         (id: number, d: object) => api.put(`/lessons/${id}`, d),
  delete:         (id: number) => api.delete(`/lessons/${id}`),
  updateProgress: (d: object)  => api.post('/lessons/progress', d),
  getCourseProgress: (courseId: number) => api.get(`/lessons/progress/course/${courseId}`),
};

// ─── Enrollments ──────────────────────────────────────────────
export const enrollmentsApi = {
  getByUser:   (userId: number) => api.get(`/enrollments/user/${userId}`),
  getByCourse: (courseId: number, p?: object) => api.get(`/enrollments/course/${courseId}`, { params: p }),
  enroll:      (d: object)      => api.post('/enrollments', d),
  unenroll:    (id: number)     => api.delete(`/enrollments/${id}`),
};

// ─── Exams ────────────────────────────────────────────────────
export const examsApi = {
  getByCourse:  (courseId: number) => api.get(`/exams/course/${courseId}`),
  get:          (id: number)       => api.get(`/exams/${id}`),
  create:       (d: object)        => api.post('/exams', d),
  update:       (id: number, d: object) => api.put(`/exams/${id}`, d),
  addQuestion:  (examId: number, d: object) => api.post(`/exams/${examId}/questions`, d),
  startAttempt: (d: object)        => api.post('/exams/start', d),
  submit:       (d: object)        => api.post('/exams/submit', d),
  getAttempts:  (userId: number)   => api.get(`/exams/attempts/user/${userId}`),
};

// ─── Certificates ─────────────────────────────────────────────
export const certsApi = {
  getByUser: (userId: number) => api.get(`/certificates/user/${userId}`),
  verify:    (number: string) => api.get(`/certificates/${number}/verify`),
};

// ─── Dashboard ────────────────────────────────────────────────
export const dashboardApi = {
  admin:         ()          => api.get('/dashboard/admin'),
  org:           (id: number) => api.get(`/dashboard/org/${id}`),
  student:       (id: number) => api.get(`/dashboard/student/${id}`),
  orgStudents:   (orgId: number) => api.get(`/dashboard/org/${orgId}/students`),
  studentReport: (orgId: number, studentId: number) => api.get(`/dashboard/org/${orgId}/students/${studentId}/report`),
  courseStudents:(orgId: number, courseId: number)  => api.get(`/dashboard/org/${orgId}/course/${courseId}/students`),
};

// ─── Cart ─────────────────────────────────────────────────────
export const cartApi = {
  get:    (userId: number) => api.get(`/cart/${userId}`),
  add:    (userId: number, courseId: number) => api.post('/cart', { userId, courseId }),
  remove: (userId: number, courseId: number) => api.delete(`/cart/${userId}/${courseId}`),
};

// ─── Departments ──────────────────────────────────────────────
export const departmentsApi = {
  getAll: (orgId?: number) => api.get('/departments', { params: { orgId } }),
  get:    (id: number) => api.get(`/departments/${id}`),
  create: (d: object) => api.post('/departments', d),
  update: (id: number, d: object) => api.put(`/departments/${id}`, d),
  delete: (id: number) => api.delete(`/departments/${id}`),
  assignUsers: (id: number, userIds: number[]) => api.post(`/departments/${id}/users`, userIds),
  removeUser: (deptId: number, userId: number) => api.delete(`/departments/${deptId}/users/${userId}`),
};
export const payrollApi = {
  getAll: (params?: object) =>
    api.get('/payroll', { params }),

  get: (id: number) =>
    api.get(`/payroll/${id}`),

  create: (data: object) =>
    api.post('/payroll', data),

  update: (id: number, data: object) =>
    api.put(`/payroll/${id}`, data),

  delete: (id: number) =>
    api.delete(`/payroll/${id}`),
};

// ─── Homepage Config ──────────────────────────────────────────
export const homePageApi = {
  get:  (orgId: number) => api.get(`/homepage/${orgId}`),
  save: (orgId: number, d: object) => api.put(`/homepage/${orgId}`, d),
};

// ─── User multi-role ──────────────────────────────────────────
export const userRolesApi = {
  updateRoles: (userId: number, d: object) => api.put(`/users/${userId}/roles`, d),
};

// ─── Upload ───────────────────────────────────────────────────
export const uploadApi = {
  image: (file: File, folder = 'images') => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/upload/image?folder=${folder}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  video: (file: File, folder = 'videos') => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/upload/video?folder=${folder}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  file: (file: File, folder = 'documents') => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/upload/file?folder=${folder}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  delete: (key: string) => api.delete(`/upload?key=${encodeURIComponent(key)}`),
};

// ─── Payments ─────────────────────────────────────────────────
export const paymentsApi = {
  createOrder:      (d: object) => api.post('/payments/create-order', d),
  verifyPayment:    (d: object) => api.post('/payments/verify', d),
  getTransactions:  (p?: object) => api.get('/payments/transactions', { params: p }),
  getTransaction:   (id: number) => api.get(`/payments/transactions/${id}`),
  getUserTransactions: (userId: number) => api.get(`/payments/transactions/user/${userId}`),
  getUserOrders:    (userId: number) => api.get(`/payments/orders/user/${userId}`),
  refund:           (d: object) => api.post('/payments/refund', d),
};

// ─── Trainer features ─────────────────────────────────────────
export const assignmentsApi = {
  getByCourse:    (courseId: number) => api.get(`/assignments/course/${courseId}`),
  getForStudent:  (studentId: number) => api.get(`/assignments/student/${studentId}`),
  get:            (id: number) => api.get(`/assignments/${id}`),
  create:         (d: object) => api.post('/assignments', d),
  update:         (id: number, d: object) => api.put(`/assignments/${id}`, d),
  delete:         (id: number) => api.delete(`/assignments/${id}`),
  submit:         (d: object) => api.post('/assignments/submit', d),
  grade:          (d: object) => api.post('/assignments/grade', d),
  getSubmissions: (id: number) => api.get(`/assignments/${id}/submissions`),
};

export const attendanceApi = {
  mark:           (d: object) => api.post('/attendance/mark', d),
  getByCourse:    (courseId: number, date?: string) => api.get(`/attendance/course/${courseId}`, { params: { date } }),
  getByStudent:   (studentId: number, courseId?: number) => api.get(`/attendance/student/${studentId}`, { params: { courseId } }),
  getSummary:     (courseId: number) => api.get(`/attendance/course/${courseId}/summary`),
};

export const liveClassApi = {
  getByCourse:    (courseId: number) => api.get(`/liveclasses/course/${courseId}`),
  getUpcoming:    (orgId?: number, studentId?: number) => api.get('/liveclasses/upcoming', { params: { orgId, studentId } }),
  get:            (id: number) => api.get(`/liveclasses/${id}`),
  create:         (d: object) => api.post('/liveclasses', d),
  update:         (id: number, d: object) => api.put(`/liveclasses/${id}`, d),
  delete:         (id: number) => api.delete(`/liveclasses/${id}`),
  sendReminder:   (id: number) => api.post(`/liveclasses/${id}/remind`),
};

export const mockTestApi = {
  getAll:     (params: object) => api.get('/mocktests', { params }),
  get:        (id: number)     => api.get(`/mocktests/${id}`),
  create:     (d: object)      => api.post('/mocktests', d),
  update:     (id: number, d: object) => api.put(`/mocktests/${id}`, d),
  delete:     (id: number)     => api.delete(`/mocktests/${id}`),
  publish:        (id: number) => api.put(`/mocktests/${id}/publish`),
  linkCourse:          (examId: number, courseId: number | null) => api.patch(`/mocktests/${examId}/link-course`, { courseId }),
  setTotalQuestions:   (examId: number, n: number) => api.patch(`/mocktests/${examId}/set-total-questions`, { totalQuestions: n }),
  addQuestion:    (testId: number, d: object) => api.post(`/mocktests/${testId}/questions`, d),
  updateQuestion: (qId: number, d: object)   => api.put(`/mocktests/questions/${qId}`, d),
  deleteQuestion:       (qId: number) => api.delete(`/mocktests/questions/${qId}`),
  toggleQuestionActive: (qId: number) => api.patch(`/mocktests/questions/${qId}/toggle-active`),
  start:          (d: object) => api.post('/mocktests/start', d),
  submit:         (d: object) => api.post('/mocktests/submit', d),
  getAttempt:     (attemptId: number) => api.get(`/mocktests/attempt/${attemptId}`),
  getAnalysis:    (studentId: number) => api.get(`/mocktests/analysis/student/${studentId}`),
  getMyAttempt:        (testId: number, studentId: number) => api.get(`/mocktests/${testId}/my-attempt`, { params: { studentId } }),
  getAllAttempts:       (testId: number) => api.get(`/mocktests/${testId}/attempts`),
  markCoding:          (attemptId: number, questionId: number, marksAwarded: number) => api.patch(`/mocktests/attempt/${attemptId}/mark-coding`, { questionId, marksAwarded }),
  sendResultEmail:     (attemptId: number) => api.post(`/mocktests/attempt/${attemptId}/send-result-email`),
};

export const interviewApi = {
  getAll:         (p?: object) => api.get('/interviews', { params: p }),
  getByStudent:   (studentId: number) => api.get(`/interviews/student/${studentId}`),
  get:            (id: number) => api.get(`/interviews/${id}`),
  create:         (d: object) => api.post('/interviews', d),
  update:         (id: number, d: object) => api.put(`/interviews/${id}`, d),
  delete:         (id: number) => api.delete(`/interviews/${id}`),
};

export const batchApi = {
  getAll:          (orgId: number)               => api.get('/batches', { params: { orgId } }),
  get:             (id: number)                  => api.get(`/batches/${id}`),
  create:          (d: object)                   => api.post('/batches', d),
  update:          (id: number, d: object)       => api.put(`/batches/${id}`, d),
  delete:          (id: number)                  => api.delete(`/batches/${id}`),
  getActive:       (orgId: number)               => api.get('/batches/active', { params: { orgId } }),
  addStudent:      (batchId: number, d: object)  => api.post(`/batches/${batchId}/students`, d),
  removeStudent:   (batchId: number, sid: number)=> api.delete(`/batches/${batchId}/students/${sid}`),
  updatePayment:   (batchId: number, sid: number, d: object) => api.put(`/batches/${batchId}/students/${sid}/payment`, d),
};
export const notificationsApi = {
  getMine:     (unreadOnly = false) => api.get('/notifications', { params: { unreadOnly } }),
  markRead:    (id: number)         => api.post(`/notifications/${id}/read`),
  markAllRead: ()                   => api.post('/notifications/read-all'),
  delete:      (id: number)         => api.delete(`/notifications/${id}`),
};

// ─── Judge0 CE — Free public compiler, no installation needed ──
// Supports: JavaScript (Node.js), Python, Java, C++, C#, etc.
// Language IDs: https://ce.judge0.com/languages/
const JUDGE0_URL  = 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_KEY  = 'judge0-ce'; // Public free tier — no key needed via this endpoint
const LANG_IDS: Record<string, number> = {
  js: 63, javascript: 63,   // Node.js 12.14.0
  python: 71, python3: 71,  // Python 3.8.1
  java: 62,                 // Java 13.0.1
  cpp: 54, 'c++': 54,       // C++ 17
  csharp: 51, 'c#': 51,     // C# Mono 6.6.0
};

async function judge0Run(code: string, language: string, stdin: string) {
  const langId = LANG_IDS[language.toLowerCase()] ?? 63; // default JS
  const encoded = (s: string) => btoa(unescape(encodeURIComponent(s)));

  // Submit
  const sub = await fetch('https://ce.judge0.com/submissions?base64_encoded=true&wait=true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language_id: langId,
      source_code: encoded(code),
      stdin: encoded(stdin),
      cpu_time_limit: 5,
      memory_limit: 128000,
    }),
  });
  const result = await sub.json();

  const stdout   = result.stdout   ? decodeURIComponent(escape(atob(result.stdout)))   : '';
  const stderr   = result.stderr   ? decodeURIComponent(escape(atob(result.stderr)))   : '';
  const compile  = result.compile_output ? decodeURIComponent(escape(atob(result.compile_output))) : '';
  const statusId = result.status?.id ?? 0;
  // Status IDs: 1=In Queue, 2=Processing, 3=Accepted, 4=Wrong Answer, 5=TLE, 6=CE, 11+=RE
  const status = statusId === 3 ? 'Accepted'
    : statusId === 6 ? 'CompileError'
    : statusId === 5 ? 'TimeLimitExceeded'
    : statusId >= 7 ? 'RuntimeError'
    : result.status?.description ?? 'Error';

  return {
    data: {
      stdout: stdout.trimEnd(),
      stderr: stderr || compile,
      status,
      timeMs: result.time ? Math.round(parseFloat(result.time) * 1000) : 0,
      compileOutput: compile,
    }
  };
}

export const judgeApi = {
  run: (code: string, language: string, input: string) =>
    judge0Run(code, language, input),
  submit: (codingQuestionId: number, code: string, language: string) =>
    api.post(`/judge/submit/${codingQuestionId}`, { code, language }),
  createCodingQuestion: (data: any) =>
    api.post('/coding-questions', data),
  getCodingQuestion: (id: number) =>
    api.get(`/coding-questions/${id}`),
};