import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { LedgerPage } from './pages/LedgerPage'
import { TransactionDetailsPage } from './pages/TransactionDetailsPage'
import { AuditWorkspacePage } from './pages/AuditWorkspacePage'
import { PolicySearchPage } from './pages/PolicySearchPage'
import { AuditNotesPage } from './pages/AuditNotesPage'
import { CaseLibraryPage } from './pages/CaseLibraryPage'
import { ReportsPage } from './pages/ReportsPage'
import { AdminPanelPage } from './pages/AdminPanelPage'
import { ProtectedRoute } from './components/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ledger"
        element={
          <ProtectedRoute>
            <LedgerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions/:id"
        element={
          <ProtectedRoute>
            <TransactionDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-workspace/:id"
        element={
          <ProtectedRoute>
            <AuditWorkspacePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/policy-search"
        element={
          <ProtectedRoute>
            <PolicySearchPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/case-library"
        element={
          <ProtectedRoute>
            <CaseLibraryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPanelPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-notes"
        element={
          <ProtectedRoute>
            <AuditNotesPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
