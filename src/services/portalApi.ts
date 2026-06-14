import axios from 'axios';

// Local dev  → hostname is localhost → use Vite proxy /api
// Production → use full API URL directly
const isLocal = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const PORTAL_BASE = isLocal
  ? '/api'
  : (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'https://api.worksupport360.com/api');

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
};

export type OrgStats = {
  totalCourses: number; totalStudents: number;
  totalInstructors: number; totalEnrollments: number;
};