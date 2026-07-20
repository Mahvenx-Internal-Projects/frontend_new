import { Navigate, Route, Routes, BrowserRouter } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useIdleLogout } from './hooks/useIdleLogout';
import OrgGate from './components/OrgGate';
import DashboardLayout from './components/shared/DashboardLayout';
import GlobalLoader from './components/shared/GlobalLoader';

// Auth
import LoginPage    from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Admin
import AdminDashboard       from './pages/admin/AdminDashboard';
import OrganizationsPage    from './pages/admin/OrganizationsPage';
import UsersPage            from './pages/admin/UsersPage';
import CoursesAdminPage     from './pages/admin/CoursesAdminPage';
import CourseEditorPage     from './pages/admin/CourseEditorPage';
import ExamEditorPage       from './pages/admin/ExamEditorPage';
import CategoriesPage       from './pages/admin/CategoriesPage';
import DepartmentsPage      from './pages/admin/DepartmentsPage';
import OrgSettingsPage      from './pages/admin/OrgSettingsPage';
import HomePageEditorPage   from './pages/admin/HomePageEditorPage';
import PaymentTransactionsPage from './pages/admin/PaymentTransactionsPage';
import LessonEditorPage     from './pages/admin/LessonEditorPage';
import MockTestEditorPage   from './pages/admin/MockTestEditorPage';
import ExamAttemptsPage     from './pages/admin/ExamAttemptsPage';

import StudentsReportPage   from './pages/admin/StudentsReportPage';
import BenchResourcesPage   from './pages/admin/BenchResourcesPage';
import PayrollPage           from './pages/admin/PayrollPage';
import TrainingBatchPage    from './pages/admin/TrainingBatchPage';

// Trainer
import TrainerDashboard     from './pages/trainer/TrainerDashboard';
import AssignmentPage       from './pages/trainer/AssignmentPage';

// Student
import StudentDashboard     from './pages/student/StudentDashboard';
import MyEnrollments        from './pages/student/MyEnrollments';
import CourseCatalog        from './pages/student/CourseCatalog';
import CourseDetailPage     from './pages/student/CourseDetailPage';
import CartPage             from './pages/student/CartPage';
import OrdersPage           from './pages/student/OrdersPage';
import MyCertificates       from './pages/student/MyCertificates';
import TrainingSchedulePage from './pages/student/TrainingSchedulePage';
import InterviewSchedulePage from './pages/student/InterviewSchedulePage';
import LessonPlayerPage     from './pages/student/LessonPlayerPage';

// Mock tests
import MockTestsListPage    from './pages/student/mock/MockTestsListPage';
import MockTestPage         from './pages/student/mock/MockTestPage';
import CodingExamPage      from './pages/student/mock/CodingExamPage';
import MockTestAnalysisPage from './pages/student/mock/MockTestAnalysisPage';

// Portal
import PublicCourseDetailPage from './pages/portal/PublicCourseDetailPage';
import DynamicHomePage       from './pages/portal/DynamicHomePage';
import AboutUsPage           from './pages/portal/AboutUsPage';
import ContactUsPage         from './pages/portal/ContactUsPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hydrated } = useAuthStore();
  const token = localStorage.getItem('lms_token');

  // Not hydrated yet — token exists so show spinner, no token so go to login
  if (!_hydrated) {
    if (!token) return <Navigate to="/login" replace />;
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[var(--org-primary,#6366f1)] border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Hydrated — trust the store
  if (!isAuthenticated && !token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Mounted once inside <BrowserRouter> so useNavigate works correctly.
// Watches for inactivity across the whole app and logs the user out
// after 30 minutes with no mouse/keyboard/scroll/touch activity.
function IdleLogoutWatcher() {
  useIdleLogout();
  return null;
}

export default function App() {
  return (
    <>
      <GlobalLoader />
      <BrowserRouter>
        <IdleLogoutWatcher />
        <OrgGate>
          <Routes>
            {/* ─── Auth ─────────────────────────────────── */}
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* ─── Course Player (fullscreen, no sidebar) ─ */}
            <Route path="/learn/:courseId/lesson/:lessonId"
              element={<RequireAuth><LessonPlayerPage /></RequireAuth>} />

            {/* ─── Dashboard ────────────────────────────── */}
            <Route path="/dashboard" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
              <Route index element={<Navigate to="admin" replace />} />

              {/* Admin */}
              <Route path="admin"          element={<AdminDashboard />} />
              <Route path="organizations"  element={<OrganizationsPage />} />
              <Route path="users"          element={<UsersPage />} />
              <Route path="courses"        element={<CoursesAdminPage />} />
              <Route path="courses/new"    element={<CourseEditorPage />} />
              <Route path="courses/:id/edit"  element={<CourseEditorPage />} />
              <Route path="courses/:id/exam"  element={<ExamEditorPage />} />
              <Route path="categories"     element={<CategoriesPage />} />
              <Route path="departments"    element={<DepartmentsPage />} />
              <Route path="org-settings"   element={<OrgSettingsPage />} />
              <Route path="homepage-editor" element={<HomePageEditorPage />} />
              <Route path="payments"       element={<PaymentTransactionsPage />} />
              <Route path="analytics"      element={<AdminDashboard />} />

              {/* Lesson editor */}
              <Route path="courses/:courseId/lesson/new"            element={<LessonEditorPage />} />
              <Route path="courses/:courseId/lesson/:lessonId/edit" element={<LessonEditorPage />} />

              {/* Mock tests - shared admin/instructor/student */}
              <Route path="mock-tests"               element={<MockTestsListPage />} />
              <Route path="mock-test-editor/:testId" element={<MockTestEditorPage />} />
              <Route path="exam-attempts/:testId"    element={<ExamAttemptsPage />} />
            
              <Route path="students-report"         element={<StudentsReportPage />} />
              <Route path="bench-resources"         element={<BenchResourcesPage />} />
              <Route path="payroll"                 element={<PayrollPage />} />
              <Route path="mock-test/:testId"        element={<MockTestPage />} />
              <Route path="coding-exam/:testId"      element={<CodingExamPage />} />
              <Route path="mock-analysis/:studentId" element={<MockTestAnalysisPage />} />

              {/* Trainer / Instructor */}
              <Route path="trainer"      element={<TrainerDashboard />} />
              <Route path="assignments"  element={<AssignmentPage />} />

              {/* Student */}
              <Route path="student"      element={<StudentDashboard />} />
              <Route path="my-courses"   element={<MyEnrollments />} />
              <Route path="catalog"      element={<CourseCatalog />} />
              <Route path="catalog/:courseId" element={<CourseDetailPage />} />
              <Route path="cart"         element={<CartPage />} />
              <Route path="orders"       element={<OrdersPage />} />
              <Route path="certificates" element={<MyCertificates />} />
              <Route path="live-classes"      element={<TrainingSchedulePage />} />
              <Route path="training-batches" element={<TrainingBatchPage />} />
              <Route path="interviews"   element={<InterviewSchedulePage />} />
            </Route>

            {/* ─── Public portal ────────────────────────── */}
            <Route path="/course/:courseId" element={<PublicCourseDetailPage />} />
            <Route path="/about"   element={<AboutUsPage />} />
            <Route path="/contact" element={<ContactUsPage />} />
            <Route path="/"       element={<DynamicHomePage />} />
            <Route path="/:slug"  element={<DynamicHomePage />} />
            <Route path="*"       element={<Navigate to="/" replace />} />
          </Routes>
        </OrgGate>
      </BrowserRouter>
    </>
  );
}