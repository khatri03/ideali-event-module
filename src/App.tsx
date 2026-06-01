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
import {
  EventDescriptionStepPage,
  EventNameStepPage,
  EventPaymentAccountStepPage,
  EventPurchaseTimeLimitStepPage,
  EventReviewStepPage,
  EventSessionsStepPage,
  EventThemeColorStepPage,
  EventTimeZoneStepPage,
  EventWizardLayout,
} from "./features/events"
import { APP_ROUTES } from "@/utils/routes"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route path={APP_ROUTES.auth.login} element={<Login />} />
        <Route path={APP_ROUTES.auth.twoFactorRoute} element={<TwoFactor />} />
        <Route path={APP_ROUTES.auth.register} element={<Register />} />
        <Route path={APP_ROUTES.auth.forgotPassword} element={<ForgotPassword />} />

        <Route path={APP_ROUTES.eventWizard.createBase} element={<EventWizardLayout />}>
          <Route index element={<EventNameStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.description} element={<EventDescriptionStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.themeColor} element={<EventThemeColorStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.paymentAccount} element={<EventPaymentAccountStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.timeZone} element={<EventTimeZoneStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.sessions} element={<EventSessionsStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.advancedSettings} element={<EventPurchaseTimeLimitStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.review} element={<EventReviewStepPage />} />
        </Route>
        <Route path={APP_ROUTES.eventWizard.edit(":eventId")} element={<EventWizardLayout />}>
          <Route index element={<EventNameStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.description} element={<EventDescriptionStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.themeColor} element={<EventThemeColorStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.paymentAccount} element={<EventPaymentAccountStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.timeZone} element={<EventTimeZoneStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.sessions} element={<EventSessionsStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.advancedSettings} element={<EventPurchaseTimeLimitStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.review} element={<EventReviewStepPage />} />
        </Route>

        {/* App */}
        <Route element={<AppLayout />}>
          <Route path={APP_ROUTES.dashboard} element={<Dashboard />} />
          <Route path={APP_ROUTES.events} element={<Events />} />
          <Route path={APP_ROUTES.calendar} element={<CalendarPage />} />
          <Route path={APP_ROUTES.settings} element={<Settings />} />
          <Route path={APP_ROUTES.team} element={<Settings />} />
          <Route path={APP_ROUTES.analytics} element={<Settings />} />
          <Route path={APP_ROUTES.help} element={<Settings />} />
        </Route>

        {/* Redirect root */}
        <Route path={APP_ROUTES.root} element={<Navigate to={APP_ROUTES.dashboard} replace />} />
        <Route path="*" element={<Navigate to={APP_ROUTES.dashboard} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
