import { Navigate, Route, Routes } from 'react-router-dom'
import { Spin } from 'antd'
import LoginPage from './pages/shared/login'
import VerifyPage from './pages/shared/verify'
import AcceptInvitationPage from './pages/shared/accept-invitation'
import EmployeeDashboard from './pages/employee'
import EmployeeTestPage from './pages/employee/test'
import EmployeeTestResultsPage from './pages/employee/test-results'
import EmployerDashboard from './pages/employer'
import EmployerEmployeesPage from './pages/employer/employees'
import EmployerTestsPage from './pages/employer/tests'
import EmployerTestBuilderPage from './pages/employer/test-builder'
import EmployerTestSubmissionsPage from './pages/employer/test-submissions'
import EmployerMarkingPage from './pages/employer/marking'
import EmployerAssignedTestsPage from './pages/employer/assigned-tests'
import AdminDashboard from './pages/admin'
import AdminCompaniesPage from './pages/admin/companies'
import AdminEmployersPage from './pages/admin/employers'
import AdminEmployeesPage from './pages/admin/employees'
import RouteGuard from './components/RouteGuard'
import { useSession } from './hooks/useSession'
import { getDashboardRoute } from './utils/auth'

const App = () => {
  const { userProfile, isLoading, isAuthenticated } = useSession()

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spin size="large" />
      </div>
    )
  }

  // Determine default route based on authentication
  const getDefaultRoute = () => {
    if (!isAuthenticated || !userProfile) return '/login'
    return getDashboardRoute(userProfile.role)
  }

  const defaultRoute = getDefaultRoute()

  return (
    <Routes>
      <Route path="/" element={<Navigate to={defaultRoute} replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/verify" element={<VerifyPage />} />
      <Route path="/accept-invitation" element={<AcceptInvitationPage />} />

      {/* Employee routes - accessible by employee and admin */}
      <Route
        path="/employee"
        element={
          <RouteGuard allowedRoles={['employee']}>
            <EmployeeDashboard />
          </RouteGuard>
        }
      />
      <Route
        path="/employee/test/:instanceId"
        element={
          <RouteGuard allowedRoles={['employee']}>
            <EmployeeTestPage />
          </RouteGuard>
        }
      />
      <Route
        path="/employee/test-results/:instanceId"
        element={
          <RouteGuard allowedRoles={['employee']}>
            <EmployeeTestResultsPage />
          </RouteGuard>
        }
      />

      {/* Employer routes - accessible by employer and admin */}
      <Route
        path="/employer"
        element={
          <RouteGuard allowedRoles={['employer']}>
            <EmployerDashboard />
          </RouteGuard>
        }
      />
      <Route
        path="/employer/employees"
        element={
          <RouteGuard allowedRoles={['employer']}>
            <EmployerEmployeesPage />
          </RouteGuard>
        }
      />
      <Route
        path="/employer/tests"
        element={
          <RouteGuard allowedRoles={['employer']}>
            <EmployerTestsPage />
          </RouteGuard>
        }
      />
      <Route
        path="/employer/test-submissions"
        element={
          <RouteGuard allowedRoles={['employer']}>
            <EmployerTestSubmissionsPage />
          </RouteGuard>
        }
      />
      <Route
        path="/employer/test-builder/:testId?"
        element={
          <RouteGuard allowedRoles={['employer']}>
            <EmployerTestBuilderPage />
          </RouteGuard>
        }
      />
      <Route
        path="/employer/test-submissions/:testId"
        element={
          <RouteGuard allowedRoles={['employer']}>
            <EmployerTestSubmissionsPage />
          </RouteGuard>
        }
      />
      <Route
        path="/employer/assigned-tests"
        element={
          <RouteGuard allowedRoles={['employer']}>
            <EmployerAssignedTestsPage />
          </RouteGuard>
        }
      />
      <Route
        path="/employer/marking/:instanceId"
        element={
          <RouteGuard allowedRoles={['employer']}>
            <EmployerMarkingPage />
          </RouteGuard>
        }
      />

      {/* Admin routes - accessible by admin only */}
      <Route
        path="/admin"
        element={
          <RouteGuard allowedRoles={['admin']}>
            <AdminDashboard />
          </RouteGuard>
        }
      />
      <Route
        path="/admin/companies"
        element={
          <RouteGuard allowedRoles={['admin']}>
            <AdminCompaniesPage />
          </RouteGuard>
        }
      />
      <Route
        path="/admin/employers"
        element={
          <RouteGuard allowedRoles={['admin']}>
            <AdminEmployersPage />
          </RouteGuard>
        }
      />
      <Route
        path="/admin/employees"
        element={
          <RouteGuard allowedRoles={['admin']}>
            <AdminEmployeesPage />
          </RouteGuard>
        }
      />

      <Route path="*" element={<Navigate to={defaultRoute} replace />} />
    </Routes>
  )
}

export default App
