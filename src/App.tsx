import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import OrgGate from './components/OrgGate';

import LoginPage     from './pages/LoginPage';
import RegisterPage  from './pages/RegisterPage';
import DashboardLayout from './components/shared/DashboardLayout';

// Portal
import DynamicHomePage        from './pages/portal/DynamicHomePage';
import PublicCourseDetailPage from './pages/portal/PublicCourseDetailPage';

// Admin
import AdminDashboard    from './pages/admin/AdminDashboard';
import OrganizationsPage from './pages/admin/OrganizationsPage';
import UsersPage         from './pages/admin/UsersPage';
import CoursesAdminPage  from './pages/admin/CoursesAdminPage';
import CourseEditorPage  from './pages/admin/CourseEditorPage';
import ExamEditorPage    from './pages/admin/ExamEditorPage';
import CategoriesPage    from './pages/admin/CategoriesPage';
import OrgSettingsPage     from './pages/admin/OrgSettingsPage';
import DepartmentsPage    from './pages/admin/DepartmentsPage';
import HomePageEditorPage      from './pages/admin/HomePageEditorPage';
import PaymentTransactionsPage  from './pages/admin/PaymentTransactionsPage';
import TrainerDashboard         from './pages/trainer/TrainerDashboard';
import LessonEditorPage         from './pages/admin/LessonEditorPage';
import MockTestsListPage        from './pages/student/mock/MockTestsListPage';
import MockTestPage             from './pages/student/mock/MockTestPage';
import MockTestAnalysisPage     from './pages/student/mock/MockTestAnalysisPage';
import MockTestEditorPage       from './pages/admin/MockTestEditorPage';

// Student
import StudentDashboard  from './pages/student/StudentDashboard';
import CourseCatalog     from './pages/student/CourseCatalog';
import CourseDetailPage  from './pages/student/CourseDetailPage';
import LessonPlayerPage  from './pages/student/LessonPlayerPage';
import ExamPage          from './pages/student/ExamPage';
import MyCertificates    from './pages/student/MyCertificates';
import MyEnrollments     from './pages/student/MyEnrollments';
import CartPage          from './pages/student/CartPage';
import OrdersPage        from './pages/student/OrdersPage';

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });

function PrivateRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function RoleRedirect() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'Student') return <Navigate to="/dashboard/student" replace />;
  if (user.role === 'Instructor') return <Navigate to="/dashboard/trainer" replace />;
  return <Navigate to="/dashboard/admin" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ style: { borderRadius: '10px', fontSize: '14px' } }} />
        <OrgGate>
          <Routes>
            {/* Public portal */}
            <Route path="/"                  element={<DynamicHomePage />} />
            <Route path="/course/:courseId"  element={<PublicCourseDetailPage />} />
            <Route path="/login"             element={<LoginPage />} />
            <Route path="/register"          element={<RegisterPage />} />

            {/* Dashboard */}
            <Route path="/dashboard" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
              <Route index element={<RoleRedirect />} />

              {/* Admin */}
              <Route path="admin"         element={<PrivateRoute roles={['SuperAdmin','OrgAdmin','Instructor']}><AdminDashboard /></PrivateRoute>} />
              <Route path="organizations" element={<PrivateRoute roles={['SuperAdmin']}><OrganizationsPage /></PrivateRoute>} />
              <Route path="users"         element={<PrivateRoute roles={['SuperAdmin','OrgAdmin']}><UsersPage /></PrivateRoute>} />
              <Route path="courses"       element={<PrivateRoute roles={['SuperAdmin','OrgAdmin','Instructor']}><CoursesAdminPage /></PrivateRoute>} />
              <Route path="courses/new"   element={<PrivateRoute roles={['SuperAdmin','OrgAdmin','Instructor']}><CourseEditorPage /></PrivateRoute>} />
              <Route path="courses/:id/edit" element={<PrivateRoute roles={['SuperAdmin','OrgAdmin','Instructor']}><CourseEditorPage /></PrivateRoute>} />
              <Route path="courses/:id/exam" element={<PrivateRoute roles={['SuperAdmin','OrgAdmin','Instructor']}><ExamEditorPage /></PrivateRoute>} />
              <Route path="categories"    element={<PrivateRoute roles={['SuperAdmin','OrgAdmin']}><CategoriesPage /></PrivateRoute>} />
              <Route path="org-settings"    element={<PrivateRoute roles={['SuperAdmin','OrgAdmin']}><OrgSettingsPage /></PrivateRoute>} />
              <Route path="departments"      element={<PrivateRoute roles={['SuperAdmin','OrgAdmin']}><DepartmentsPage /></PrivateRoute>} />
              <Route path="homepage-editor"   element={<PrivateRoute roles={['SuperAdmin','OrgAdmin']}><HomePageEditorPage /></PrivateRoute>} />
              <Route path="payments"           element={<PrivateRoute roles={['SuperAdmin','OrgAdmin']}><PaymentTransactionsPage /></PrivateRoute>} />

              {/* Mock Test editor */}
              <Route path="mock-test-editor/:testId" element={<PrivateRoute roles={['SuperAdmin','OrgAdmin','Instructor']}><MockTestEditorPage /></PrivateRoute>} />

              {/* Lesson editor routes */}
              <Route path="courses/:courseId/lesson/new"          element={<PrivateRoute roles={['SuperAdmin','OrgAdmin','Instructor']}><LessonEditorPage /></PrivateRoute>} />
              <Route path="courses/:courseId/lesson/:lessonId/edit" element={<PrivateRoute roles={['SuperAdmin','OrgAdmin','Instructor']}><LessonEditorPage /></PrivateRoute>} />

              {/* Trainer routes */}
              <Route path="trainer"           element={<PrivateRoute roles={['Instructor']}><TrainerDashboard /></PrivateRoute>} />

              {/* Student mock test routes */}
              <Route path="mock-tests"        element={<MockTestsListPage />} />
              <Route path="mock-test/:testId" element={<MockTestPage />} />
              <Route path="mock-analysis/:studentId" element={<MockTestAnalysisPage />} />

              {/* Student */}
              <Route path="student"       element={<StudentDashboard />} />
              <Route path="catalog"       element={<CourseCatalog />} />
              <Route path="catalog/:id"   element={<CourseDetailPage />} />
              <Route path="learn/:courseId/lesson/:lessonId" element={<LessonPlayerPage />} />
              <Route path="exam/:examId"  element={<ExamPage />} />
              <Route path="certificates"  element={<MyCertificates />} />
              <Route path="my-courses"    element={<MyEnrollments />} />
              <Route path="cart"          element={<CartPage />} />
              <Route path="orders"        element={<OrdersPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </OrgGate>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
