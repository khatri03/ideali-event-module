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
  EventBannerStepPage,
  EventDescriptionStepPage,
  EventDiscountCouponStepPage,
  EventNameStepPage,
  EventPaymentAccountStepPage,
  EventPurchaseTimeLimitStepPage,
  EventQuestionsStepPage,
  EventReviewStepPage,
  EventSessionsStepPage,
  EventVenueStepPage,
  EventThankYouEmailStepPage,
  EventThemeColorStepPage,
  EventTimeZoneStepPage,
  EventTermsConditionsStepPage,
  EventWizardLayout,
} from "./features/events"
import { SessionListPage, SessionWizardLayout, SessionWizardStepPage } from "./features/sessions"
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
          <Route path={APP_ROUTES.eventWizard.slugs.termsConditions} element={<EventTermsConditionsStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.banner} element={<EventBannerStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.themeColor} element={<EventThemeColorStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.paymentAccount} element={<EventPaymentAccountStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.timeZone} element={<EventTimeZoneStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.venue} element={<EventVenueStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.sessions} element={<EventSessionsStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.discountCoupon} element={<EventDiscountCouponStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.questions} element={<EventQuestionsStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.thankYouEmail} element={<EventThankYouEmailStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.advancedSettings} element={<EventPurchaseTimeLimitStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.review} element={<EventReviewStepPage />} />
        </Route>
        <Route path={APP_ROUTES.eventWizard.edit(":eventId")} element={<EventWizardLayout />}>
          <Route index element={<Navigate to={APP_ROUTES.eventWizard.slugs.name} replace />} />
          <Route path={APP_ROUTES.eventWizard.slugs.name} element={<EventNameStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.description} element={<EventDescriptionStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.termsConditions} element={<EventTermsConditionsStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.banner} element={<EventBannerStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.themeColor} element={<EventThemeColorStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.paymentAccount} element={<EventPaymentAccountStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.timeZone} element={<EventTimeZoneStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.venue} element={<EventVenueStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.sessions} element={<EventSessionsStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.discountCoupon} element={<EventDiscountCouponStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.questions} element={<EventQuestionsStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.thankYouEmail} element={<EventThankYouEmailStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.advancedSettings} element={<EventPurchaseTimeLimitStepPage />} />
          <Route path={APP_ROUTES.eventWizard.slugs.review} element={<EventReviewStepPage />} />
        </Route>
        <Route path={APP_ROUTES.sessionWizard.edit(":sessionId")} element={<SessionWizardLayout />}>
          <Route index element={<Navigate to={APP_ROUTES.sessionWizard.slugs.name} replace />} />
          <Route path={APP_ROUTES.sessionWizard.slugs.name} element={<SessionWizardStepPage />} />
          <Route path={APP_ROUTES.sessionWizard.slugs.description} element={<SessionWizardStepPage />} />
          <Route path={APP_ROUTES.sessionWizard.slugs.banner} element={<SessionWizardStepPage />} />
          <Route path={APP_ROUTES.sessionWizard.slugs.genre} element={<SessionWizardStepPage />} />
          <Route path={APP_ROUTES.sessionWizard.slugs.event} element={<SessionWizardStepPage />} />
          <Route path={APP_ROUTES.sessionWizard.slugs.venue} element={<SessionWizardStepPage />} />
          <Route path={APP_ROUTES.sessionWizard.slugs.booking} element={<SessionWizardStepPage />} />
          <Route path={APP_ROUTES.sessionWizard.slugs.startEnd} element={<SessionWizardStepPage />} />
          <Route path={APP_ROUTES.sessionWizard.slugs.schedule} element={<SessionWizardStepPage />} />
          <Route path={APP_ROUTES.sessionWizard.slugs.ticket} element={<SessionWizardStepPage />} />
          <Route path={APP_ROUTES.sessionWizard.slugs.eTicketing} element={<SessionWizardStepPage />} />
          <Route path={APP_ROUTES.sessionWizard.slugs.questions} element={<SessionWizardStepPage />} />
          <Route path={APP_ROUTES.sessionWizard.slugs.review} element={<SessionWizardStepPage />} />
        </Route>
        <Route path={APP_ROUTES.sessionWizard.list} element={<SessionListPage />} />

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
