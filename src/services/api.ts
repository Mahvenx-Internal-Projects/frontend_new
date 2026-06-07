import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
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
      localStorage.removeItem('lms_token');
      localStorage.removeItem('lms_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ─── Auth ─────────────────────────────────────────────────────
export const authApi = {
  login:         (email: string, password: string) => api.post('/auth/login', { email, password }),
  register:      (d: object) => api.post('/auth/register', d),
  me:            ()          => api.get('/auth/me'),
  organizations: ()          => api.get('/auth/organizations'),
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
  admin:   ()          => api.get('/dashboard/admin'),
  org:     (id: number) => api.get(`/dashboard/org/${id}`),
  student: (id: number) => api.get(`/dashboard/student/${id}`),
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
  getAll:         (p?: object) => api.get('/mocktests', { params: p }),
  get:            (id: number) => api.get(`/mocktests/${id}`),
  create:         (d: object) => api.post('/mocktests', d),
  update:         (id: number, d: object) => api.put(`/mocktests/${id}`, d),
  publish:        (id: number) => api.put(`/mocktests/${id}/publish`),
  delete:         (id: number) => api.delete(`/mocktests/${id}`),
  addQuestion:    (testId: number, d: object) => api.post(`/mocktests/${testId}/questions`, d),
  deleteQuestion: (qId: number) => api.delete(`/mocktests/questions/${qId}`),
  start:          (d: object) => api.post('/mocktests/start', d),
  submit:         (d: object) => api.post('/mocktests/submit', d),
  getAttempt:     (attemptId: number) => api.get(`/mocktests/attempt/${attemptId}`),
  getAnalysis:    (studentId: number) => api.get(`/mocktests/analysis/student/${studentId}`),
  getLeaderboard: (testId: number) => api.get(`/mocktests/${testId}/leaderboard`),
};

export const interviewApi = {
  getAll:         (p?: object) => api.get('/interviews', { params: p }),
  getByStudent:   (studentId: number) => api.get(`/interviews/student/${studentId}`),
  get:            (id: number) => api.get(`/interviews/${id}`),
  create:         (d: object) => api.post('/interviews', d),
  update:         (id: number, d: object) => api.put(`/interviews/${id}`, d),
  delete:         (id: number) => api.delete(`/interviews/${id}`),
};
