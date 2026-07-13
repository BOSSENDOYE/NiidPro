import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeModeProvider } from './theme/ThemeModeContext';
import { useAuthStore } from './store/auth.store';
import AppLayout from './components/layout/AppLayout';

// Auth
import LoginPage from './pages/auth/LoginPage';

// Enrôlement (public)
import EnrollmentPage from './pages/enrollment/EnrollmentPage';

// Dashboard
import DashboardPage from './pages/dashboard/DashboardPage';

// Employees
import EmployeesPage from './pages/employees/EmployeesPage';
import EmployeeDetailPage from './pages/employees/EmployeeDetailPage';
import EmployeeFormPage from './pages/employees/EmployeeFormPage';
import EmployeeImportPage from './pages/employees/EmployeeImportPage';

// Organisation
import DepartmentsPage from './pages/departments/DepartmentsPage';

// Contrats
import ContractsPage from './pages/contracts/ContractsPage';

// Pointage
import AttendancesPage from './pages/attendances/AttendancesPage';
import AttendanceVisualPage from './pages/attendances/AttendanceVisualPage';
import AttendanceScannerPage from './pages/attendances/AttendanceScannerPage';

// Congés
import LeavesPage from './pages/leaves/LeavesPage';

// Formations
import TrainingsPage from './pages/trainings/TrainingsPage';

// Recrutements
import RecruitmentsPage from './pages/recruitment/RecruitmentsPage';

// Évaluations période d'essai
import EvaluationsPage from './pages/evaluations/EvaluationsPage';

// Carrières
import CarrieresPage from './pages/carrieres/CarrieresPage';

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

// Documents de service
import DocumentsPage from './pages/documents/DocumentsPage';
import DocumentStudio from './pages/documents/DocumentStudio';

// Profil
import ProfilePage from './pages/profile/ProfilePage';

// Configuration
import ConfigurationPage from './pages/configuration/ConfigurationPage';

// Portail Agent
import PortalLayout from './pages/portal/PortalLayout';
import PortalHome from './pages/portal/PortalHome';
import PortalAttendance from './pages/portal/PortalAttendance';
import PortalLeaves from './pages/portal/PortalLeaves';
import PortalTasks from './pages/portal/PortalTasks';
import PortalProfile from './pages/portal/PortalProfile';
import PortalDocuments from './pages/portal/PortalDocuments';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const ADMIN_ROLES = ['super_admin', 'admin_rh', 'manager'];

function isEmployeeOnly(roles: string[]): boolean {
  return roles.includes('employe') && !roles.some((r) => ADMIN_ROLES.includes(r));
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

/** Espace admin : un employé (rôle employe seul) est renvoyé vers son portail. */
function AdminGate() {
  const { user } = useAuthStore();
  if (isEmployeeOnly(user?.roles ?? [])) return <Navigate to="/portail" replace />;
  return <AppLayout />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeModeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/enroll" element={<EnrollmentPage />} />

            {/* ══ Portail Agent ══ */}
            <Route path="/portail" element={<PrivateRoute><PortalLayout /></PrivateRoute>}>
              <Route index element={<PortalHome />} />
              <Route path="pointage" element={<PortalAttendance />} />
              <Route path="conges" element={<PortalLeaves />} />
              <Route path="taches" element={<PortalTasks />} />
              <Route path="profil" element={<PortalProfile />} />
              <Route path="documents" element={<PortalDocuments />} />
            </Route>

            {/* ══ Espace administration ══ */}
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <AdminGate />
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />

              {/* Vue d'ensemble */}
              <Route path="dashboard" element={<DashboardPage />} />

              {/* Gestion RH */}
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="employees/import" element={<EmployeeImportPage />} />
              <Route path="employees/new" element={<EmployeeFormPage />} />
              <Route path="employees/:id" element={<EmployeeDetailPage />} />
              <Route path="employees/:id/edit" element={<EmployeeFormPage />} />

              <Route path="contracts" element={<ContractsPage />} />

              <Route path="attendances" element={<AttendancesPage />} />
              <Route path="attendance-visual" element={<AttendanceVisualPage />} />
              <Route path="attendance-scanner" element={<AttendanceScannerPage />} />

              <Route path="leaves" element={<LeavesPage />} />
              <Route path="trainings" element={<TrainingsPage />} />
              <Route path="recruitment" element={<RecruitmentsPage />} />
<Route path="evaluations" element={<EvaluationsPage />} />
              <Route path="carrieres" element={<CarrieresPage />} />
              {/* Organisation */}
              <Route path="departments" element={<DepartmentsPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="payroll" element={<PayrollPage />} />
              <Route path="social-report" element={<SocialReportPage />} />

              {/* Documents de service */}
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="documents/studio" element={<DocumentStudio />} />
              <Route path="documents/studio/:id" element={<DocumentStudio />} />

              {/* Configuration */}
              <Route path="configuration" element={<ConfigurationPage />} />
              <Route path="schema" element={<SchemaPage />} />

              {/* Espace agent */}
              <Route path="agent-portal" element={<AgentPortalPage />} />

              {/* Profil */}
              <Route path="profile" element={<ProfilePage />} />

              {/* Catch-all admin */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeModeProvider>
    </QueryClientProvider>
  );
}
