import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AppLayout } from "./components/layout/AppLayout"
import { Login } from "./pages/auth/Login"
import { Register } from "./pages/auth/Register"
import { ForgotPassword } from "./pages/auth/ForgotPassword"
import { TwoFactor } from "./pages/auth/TwoFactor"
import { Dashboard } from "./pages/Dashboard"
import { Events } from "./pages/Events"
import { CalendarPage } from "./pages/CalendarPage"
import { Settings } from "./pages/Settings"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/2fa/:twoFaToken" element={<TwoFactor />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />

        {/* App */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/events" element={<Events />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/team" element={<Settings />} />
          <Route path="/analytics" element={<Settings />} />
          <Route path="/help" element={<Settings />} />
        </Route>

        {/* Redirect root */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
