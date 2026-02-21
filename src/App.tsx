import { Navigate, Route, Routes } from 'react-router-dom'
import { Spin } from 'antd'
import LoginPage from './pages/shared/login'
import VerifyPage from './pages/shared/verify'
import AcceptInvitationPage from './pages/shared/accept-invitation'
import EmployeeDashboard from './pages/employee'
import EmployeeTestPage from './pages/employee/test'
import EmployeeTestResultsPage from './pages/employee/test-results'
import ManagerDashboard from './pages/manager'
import ManagerEmployeesPage from './pages/manager/employees'
import ManagerTestsPage from './pages/manager/tests'
import ManagerTestBuilderPage from './pages/manager/test-builder'
import ManagerTestSubmissionsPage from './pages/manager/test-submissions'
import ManagerQuestionLibraryPage from './pages/manager/question-library'
import ManagerMarkingPage from './pages/manager/marking'
import AdminDashboard from './pages/admin'
import AdminCompaniesPage from './pages/admin/companies'
import AdminManagersPage from './pages/admin/managers'
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

      {/* Manager routes - accessible by manager and admin */}
      <Route
        path="/manager"
        element={
          <RouteGuard allowedRoles={['manager']}>
            <ManagerDashboard />
          </RouteGuard>
        }
      />
      <Route
        path="/manager/employees"
        element={
          <RouteGuard allowedRoles={['manager']}>
            <ManagerEmployeesPage />
          </RouteGuard>
        }
      />
      <Route
        path="/manager/tests"
        element={
          <RouteGuard allowedRoles={['manager']}>
            <ManagerTestsPage />
          </RouteGuard>
        }
      />
      <Route
        path="/manager/test-submissions"
        element={
          <RouteGuard allowedRoles={['manager']}>
            <ManagerTestSubmissionsPage />
          </RouteGuard>
        }
      />
      <Route
        path="/manager/question-library"
        element={
          <RouteGuard allowedRoles={['manager']}>
            <ManagerQuestionLibraryPage />
          </RouteGuard>
        }
      />
      <Route
        path="/manager/test-builder/:testId?"
        element={
          <RouteGuard allowedRoles={['manager']}>
            <ManagerTestBuilderPage />
          </RouteGuard>
        }
      />
      <Route
        path="/manager/test-submissions/:testId"
        element={
          <RouteGuard allowedRoles={['manager']}>
            <ManagerTestSubmissionsPage />
          </RouteGuard>
        }
      />
      <Route
        path="/manager/marking/:instanceId"
        element={
          <RouteGuard allowedRoles={['manager']}>
            <ManagerMarkingPage />
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
        path="/admin/managers"
        element={
          <RouteGuard allowedRoles={['admin']}>
            <AdminManagersPage />
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
