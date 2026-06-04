import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from './theme';
import { useAuthStore } from './store/auth.store';
import AppLayout from './components/layout/AppLayout';

// Auth
import LoginPage from './pages/auth/LoginPage';

// Dashboard
import DashboardPage from './pages/dashboard/DashboardPage';

// Employees
import EmployeesPage from './pages/employees/EmployeesPage';
import EmployeeDetailPage from './pages/employees/EmployeeDetailPage';
import EmployeeFormPage from './pages/employees/EmployeeFormPage';

// Organisation
import DepartmentsPage from './pages/departments/DepartmentsPage';

// Contrats
import ContractsPage from './pages/contracts/ContractsPage';
import ContractArchivePage from './pages/contracts/ContractArchivePage';

// Pointage
import AttendancesPage from './pages/attendances/AttendancesPage';
import AttendanceVisualPage from './pages/attendances/AttendanceVisualPage';
import AttendanceScannerPage from './pages/attendances/AttendanceScannerPage';

// Congés
import LeavesPage from './pages/leaves/LeavesPage';

// Justifications
import JustificationsPage from './pages/justifications/JustificationsPage';

// Tâches
import TasksPage from './pages/tasks/TasksPage';

// Paie
import PayrollPage from './pages/payroll/PayrollPage';

// Bilan social
import SocialReportPage from './pages/social-report/SocialReportPage';

// Schéma SQL
import SchemaPage from './pages/schema/SchemaPage';

// Portail agent
import AgentPortalPage from './pages/agent-portal/AgentPortalPage';

// Organigramme
import OrganigrammePage from './pages/organigramme/OrganigrammePage';

// Documents de service
import DocumentsPage from './pages/documents/DocumentsPage';

// Profil
import ProfilePage from './pages/profile/ProfilePage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <AppLayout />
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />

              {/* Vue d'ensemble */}
              <Route path="dashboard" element={<DashboardPage />} />

              {/* Gestion RH */}
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="employees/new" element={<EmployeeFormPage />} />
              <Route path="employees/:id" element={<EmployeeDetailPage />} />
              <Route path="employees/:id/edit" element={<EmployeeFormPage />} />

              <Route path="contracts" element={<ContractsPage />} />
              <Route path="contracts/archives" element={<ContractArchivePage />} />

              <Route path="attendances" element={<AttendancesPage />} />
              <Route path="attendance-visual" element={<AttendanceVisualPage />} />
              <Route path="attendance-scanner" element={<AttendanceScannerPage />} />

              <Route path="leaves" element={<LeavesPage />} />
              <Route path="justifications" element={<JustificationsPage />} />

              {/* Organisation */}
              <Route path="organigramme" element={<OrganigrammePage />} />
              <Route path="departments" element={<DepartmentsPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="payroll" element={<PayrollPage />} />
              <Route path="social-report" element={<SocialReportPage />} />

              {/* Documents de service */}
              <Route path="documents" element={<DocumentsPage />} />

              {/* Configuration */}
              <Route path="schema" element={<SchemaPage />} />

              {/* Espace agent */}
              <Route path="agent-portal" element={<AgentPortalPage />} />

              {/* Profil */}
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
