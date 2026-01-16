import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/shared/login'
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
import { useSession } from './hooks/useSession'

const App = () => {
  const { session } = useSession()

  const defaultRoute = session?.role
    ? `/${session.role}`
    : '/login'

  return (
    <Routes>
      <Route path="/" element={<Navigate to={defaultRoute} replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/employee" element={<EmployeeDashboard />} />
      <Route path="/employee/test/:instanceId" element={<EmployeeTestPage />} />
      <Route
        path="/employee/test-results/:instanceId"
        element={<EmployeeTestResultsPage />}
      />
      <Route path="/employer" element={<EmployerDashboard />} />
      <Route path="/employer/employees" element={<EmployerEmployeesPage />} />
      <Route path="/employer/tests" element={<EmployerTestsPage />} />
      <Route
        path="/employer/test-submissions"
        element={<EmployerTestSubmissionsPage />}
      />
      <Route
        path="/employer/test-builder/:testId?"
        element={<EmployerTestBuilderPage />}
      />
      <Route
        path="/employer/test-submissions/:testId"
        element={<EmployerTestSubmissionsPage />}
      />
      <Route
        path="/employer/assigned-tests"
        element={<EmployerAssignedTestsPage />}
      />
      <Route
        path="/employer/marking/:instanceId"
        element={<EmployerMarkingPage />}
      />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/companies" element={<AdminCompaniesPage />} />
      <Route path="/admin/employers" element={<AdminEmployersPage />} />
      <Route path="*" element={<Navigate to={defaultRoute} replace />} />
    </Routes>
  )
}

export default App
