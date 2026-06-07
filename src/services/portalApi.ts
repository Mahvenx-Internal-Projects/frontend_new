import api from './api';

export const portalApi = {
  getHomePage: (orgId: number) =>
    api.get(`/homepage/${orgId}`),

  // Resolve org from URL (called on app boot)
  getOrgByUrl: (url: string) =>
    api.get('/portal/org', { params: { url } }),

  // Public catalog data
  getCategories: (orgId: number) =>
    api.get(`/portal/${orgId}/categories`),

  getCourses: (orgId: number, params?: {
    categoryId?: number; level?: string; search?: string;
    free?: boolean; page?: number; size?: number;
  }) => api.get(`/portal/${orgId}/courses`, { params }),

  getCourse: (orgId: number, courseId: number) =>
    api.get(`/portal/${orgId}/courses/${courseId}`),

  getFeatured: (orgId: number) =>
    api.get(`/portal/${orgId}/featured`),

  getStats: (orgId: number) =>
    api.get(`/portal/${orgId}/stats`),

  getInstructors: (orgId: number) =>
    api.get(`/portal/${orgId}/instructors`),
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
