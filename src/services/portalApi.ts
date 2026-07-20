import axios from 'axios';

// Local dev  → hostname is localhost → use Vite proxy /api
// Production → use full API URL directly
const isLocal = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const resolvePortalBase = () => {
  if (isLocal) return '/api';
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (!configured) return 'https://lms.worksupport360.com/api';
  const normalized = configured.replace(/\/$/, '');
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
};
const PORTAL_BASE = resolvePortalBase();

const portalAxios = axios.create({
  baseURL: PORTAL_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth token if present
portalAxios.interceptors.request.use(cfg => {
  const token = localStorage.getItem('lms_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export const portalApi = {
  getHomePage: (orgId: number) =>
    portalAxios.get(`/homepage/${orgId}`),

  // Resolve org from URL (called on app boot)
  getOrgByUrl: (url: string) =>
    portalAxios.get('/portal/org', { params: { url } }),

  // Public catalog data
  getCategories: (orgId: number) =>
    portalAxios.get(`/portal/${orgId}/categories`),

  getCourses: (orgId: number, params?: {
    categoryId?: number; level?: string; search?: string;
    free?: boolean; page?: number; size?: number;
  }) => portalAxios.get(`/portal/${orgId}/courses`, { params }),

  getCourse: (orgId: number, courseId: number) =>
    portalAxios.get(`/portal/${orgId}/courses/${courseId}`),

  getFeatured: (orgId: number) =>
    portalAxios.get(`/portal/${orgId}/featured`),

  getStats: (orgId: number) =>
    portalAxios.get(`/portal/${orgId}/stats`),

  getInstructors: (orgId: number) =>
    portalAxios.get(`/portal/${orgId}/instructors`),

  getReviews: (orgId: number, limit = 9) =>
    portalAxios.get(`/portal/${orgId}/reviews`, { params: { limit } }),
};

export type PublicCategory = {
  id: number; name: string; description?: string;
  icon?: string; courseCount: number; children: PublicCategory[];
};

export type PublicCourse = {
  id: number; title: string; description?: string; thumbnailUrl?: string;
  level: string; price: number; isFree: boolean;
  durationMinutes: number; language?: string;
  instructorId: number; instructorName: string; instructorAvatar?: string;
  categoryId: number; categoryName: string;
  enrollmentCount: number; averageRating: number; ratingCount: number;
  tags?: string; createdAt: string;
  modules?: PublicModule[];
};

export type PublicModule = {
  id: number; title: string; description?: string;
  lessons: PublicLesson[];
};

export type PublicLesson = {
  id: number; title: string; type: string;
  durationSecs: number; isPreview: boolean;
  videoUrl?: string; content?: string;
};

export type OrgStats = {
  totalCourses: number; totalStudents: number;
  totalInstructors: number; totalEnrollments: number;
};