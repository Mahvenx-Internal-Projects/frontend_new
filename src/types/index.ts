export type UserRole = 'SuperAdmin' | 'OrgAdmin' | 'Instructor' | 'Student';
export type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type CourseStatus = 'Draft' | 'Published' | 'Archived';
export type LessonType = 'Video' | 'Article' | 'Quiz' | 'File';
export type EnrollmentStatus = 'Active' | 'Completed' | 'Cancelled';
export type AttemptStatus = 'InProgress' | 'Submitted' | 'Graded';
export type QuestionType = 'SingleChoice' | 'MultiChoice' | 'TrueFalse' | 'ShortAnswer';

export interface User {
  id: number; firstName: string; lastName: string; email: string;
  avatarUrl?: string; role: UserRole; roles?: UserRole[]; isActive: boolean;
  createdAt: string; lastLogin?: string;
  organizationId: number; organizationName: string;
}

export interface Organization {
  id: number; name: string; slug: string; logoUrl?: string;
  primaryColor?: string; website?: string; isActive: boolean;
  createdAt: string; userCount: number; courseCount: number;
}

export interface Category {
  id: number; name: string; description?: string;
  parentId?: number; parentName?: string;
  displayOrder: number; isActive: boolean;
  iconEmoji?: string; iconUrl?: string;
  departmentId?: number;
  children: Category[]; courseCount: number;
}

export interface Course {
  id: number; title: string; description?: string; thumbnailUrl?: string;
  level: CourseLevel; status: CourseStatus; price: number; isFree: boolean;
  durationMinutes: number; tags?: string; language?: string;
  organizationId: number; organizationName: string;
  instructorId: number; instructorName: string;
  categoryId: number; categoryName: string;
  enrollmentCount: number; averageRating: number; ratingCount: number;
  createdAt: string; updatedAt: string;
  modules?: Module[];
}

export interface Module {
  id: number; title: string; description?: string;
  displayOrder: number; isPreview: boolean; courseId: number;
  lessons?: Lesson[];
}

export interface Lesson {
  id: number; title: string; content?: string; videoUrl?: string; fileUrl?: string;
  type: LessonType; durationSecs: number; displayOrder: number;
  isPreview: boolean; isPublished: boolean; moduleId: number;
  progress?: LessonProgress;
}

export interface LessonProgress {
  lessonId: number; isCompleted: boolean;
  watchedSeconds: number; lastPositionSec: number; updatedAt: string;
}

export interface Enrollment {
  id: number; userId: number; userName: string;
  courseId: number; courseTitle: string;
  enrolledAt: string; completedAt?: string;
  status: EnrollmentStatus; progressPercent: number;
}

export interface Exam {
  id: number; title: string; instructions?: string;
  timeLimitMins: number; passMarkPercent: number;
  maxAttempts: number; isPublished: boolean; randomize: boolean;
  courseId: number; courseTitle: string;
  questions?: Question[];
}

export interface Question {
  id: number; text: string; type: QuestionType;
  marks: number; explanation?: string; displayOrder: number;
  options?: Option[];
}

export interface Option {
  id: number; text: string; isCorrect: boolean; displayOrder: number;
}

export interface ExamAttempt {
  id: number; userId: number; userName: string;
  examId: number; examTitle: string;
  startedAt: string; submittedAt?: string;
  score?: number; marks?: number; totalMarks?: number;
  passed: boolean; status: AttemptStatus;
}

export interface Certificate {
  id: number; certificateNumber: string; issuedAt: string; pdfUrl?: string;
  userId: number; userName: string; courseId: number; courseTitle: string;
}

export interface PagedResult<T> {
  items: T[]; totalCount: number; page: number; pageSize: number; totalPages: number;
}

export interface AdminDashboard {
  totalOrgs: number; totalUsers: number; totalCourses: number; totalEnrollments: number;
  recentActivity: RecentActivity[];
}

export interface OrgDashboard {
  totalUsers: number; totalCourses: number; totalEnrollments: number;
  activeStudents: number; completionRate: number; topCourses: CourseStats[];
}

export interface StudentDashboard {
  enrolledCourses: number; completedCourses: number;
  certificatesEarned: number; totalWatchMinutes: number;
  activeEnrollments: Enrollment[];
}

export interface RecentActivity { type: string; message: string; at: string; }
export interface CourseStats { courseId: number; title: string; enrollments: number; completionRate: number; averageRating: number; }

export interface LoginResponse { token: string; refreshToken: string; user: User; }

export interface Department {
  id: number; name: string; description?: string;
  iconEmoji?: string; color?: string; isActive: boolean;
  displayOrder: number; categoryCount: number; userCount: number;
  createdAt: string;
}

export interface HomePageSection { id: string; enabled: boolean; order: number; }
export interface NavLink { label: string; url: string; isExternal?: boolean; }
export interface FooterLink { label: string; url: string; }
export interface SocialLink { platform: string; url: string; }
export interface CustomSection { type: 'text' | 'banner' | 'testimonial' | 'faq'; title: string; content?: string; imageUrl?: string; buttonText?: string; buttonUrl?: string; items?: { q: string; a: string }[]; }

export interface HomePageConfig {
  id: number; organizationId: number; templateId: string;
  heroTitle?: string; heroSubtitle?: string; heroButtonText?: string;
  heroButtonUrl?: string; heroImageUrl?: string; heroVideoUrl?: string; heroStyle?: string;
  sectionsConfig?: string; showStats: boolean; statsCustom?: string;
  announcementText?: string; showAnnouncement: boolean;
  navLinksJson?: string; footerTagline?: string; footerLinksJson?: string;
  footerSocialJson?: string; footerCopyright?: string; showFooterNewsletter: boolean;
  customSectionsJson?: string;
  customHtml?: string;
}