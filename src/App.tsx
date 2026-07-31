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
import { AdminFeePlansPage } from "./features/admin-fee-plans"
import { AdminRateLimitPage } from "./features/admin-rate-limit"
import { ChargeRulesPage } from "./features/charge-rules"
import { VenueManagementPage } from "./features/venues"
import { CustomListCreatePage, CustomListEditPage, CustomListsPage } from "./features/custom-lists"
import { MemberDashboardPage } from "./features/member-dashboard"
import {
  DocumentCategoriesPage,
  DocumentCategoryCreatePage,
  DocumentCategoryDetailPage,
  DocumentCategoryEditPage,
} from "./features/document-categories"
import { MemberDocumentCategoryPage, MemberDocumentsPage } from "./features/member-documents"
import {
  AlertInboxPage,
  MemberAlertComposePage,
  MemberAlertEditPage,
  MemberAlertDetailPage,
  MemberAlertsPage,
  MemberNotificationDetailPage,
} from "./features/member-alerts"
import { SeatingLayoutDesignerPage, SeatingLayoutsPage } from "./features/seating-layouts"
import {
  EventBannerStepPage,
  EventDescriptionStepPage,
  EventDiscountCouponStepPage,
  EventDateTimeStepPage,
  EventNameStepPage,
  EventPaymentAccountStepPage,
  EventPurchaseTimeLimitStepPage,
  EventQuestionsStepPage,
  EventRegisterPage,
  EventReviewStepPage,
  EventSessionsStepPage,
  EventTicketViewPage,
  EventVenueStepPage,
  EventThankYouEmailStepPage,
  EventThemeColorStepPage,
  EventTimeZoneStepPage,
  EventTermsConditionsStepPage,
  EventWizardLayout,
} from "./features/events"
import { SessionListPage, SessionWizardLayout, SessionWizardStepPage } from "./features/sessions"
import { EventInvoiceDetailPage, EventInvoicesPage } from "./features/event-invoices"
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
          <Route path={APP_ROUTES.eventWizard.slugs.dateTime} element={<EventDateTimeStepPage />} />
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
          <Route path={APP_ROUTES.eventWizard.slugs.dateTime} element={<EventDateTimeStepPage />} />
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
          <Route path={APP_ROUTES.sessionWizard.slugs.membershipAccess} element={<SessionWizardStepPage />} />
          <Route path={APP_ROUTES.sessionWizard.slugs.seatSelection} element={<SessionWizardStepPage />} />
          <Route
            path={APP_ROUTES.sessionWizard.slugs.booking}
            element={<Navigate to={APP_ROUTES.sessionWizard.slugs.datesTime} replace />}
          />
          <Route
            path={APP_ROUTES.sessionWizard.slugs.startEnd}
            element={<Navigate to={APP_ROUTES.sessionWizard.slugs.datesTime} replace />}
          />
          <Route path={APP_ROUTES.sessionWizard.slugs.datesTime} element={<SessionWizardStepPage />} />
          <Route path={APP_ROUTES.sessionWizard.slugs.schedule} element={<SessionWizardStepPage />} />
          <Route path={APP_ROUTES.sessionWizard.slugs.ticket} element={<SessionWizardStepPage />} />
          <Route path={APP_ROUTES.sessionWizard.slugs.eTicketing} element={<SessionWizardStepPage />} />
          <Route path={APP_ROUTES.sessionWizard.slugs.questions} element={<SessionWizardStepPage />} />
          <Route path={APP_ROUTES.sessionWizard.slugs.review} element={<SessionWizardStepPage />} />
        </Route>
        <Route path={APP_ROUTES.eventRegisterRoute} element={<EventRegisterPage />} />

        {/* Public and deliberately outside AppLayout: its fixed-height shell would clip the PDF. */}
        <Route path={APP_ROUTES.eventTicketViewRoute} element={<EventTicketViewPage />} />

        <Route path={APP_ROUTES.member.dashboard} element={<AppLayout />}>
          <Route index element={<MemberDashboardPage />} />
        </Route>

        {/* App */}
        <Route element={<AppLayout />}>
          <Route path={APP_ROUTES.dashboard} element={<Dashboard />} />
          <Route path={APP_ROUTES.events} element={<Events />} />
          <Route path={APP_ROUTES.sessionWizard.list} element={<SessionListPage />} />
          <Route path={APP_ROUTES.calendar} element={<CalendarPage />} />
          <Route path={APP_ROUTES.settings} element={<Settings />} />
          <Route path={APP_ROUTES.chargeRules.list} element={<ChargeRulesPage />} />
          <Route path={APP_ROUTES.adminRevenuePlans} element={<AdminFeePlansPage />} />
          <Route path={APP_ROUTES.adminFeePlansLegacy} element={<Navigate to={APP_ROUTES.adminRevenuePlans} replace />} />
          <Route path={APP_ROUTES.adminRateLimit} element={<AdminRateLimitPage />} />
          <Route path={APP_ROUTES.venues.list} element={<VenueManagementPage />} />
          <Route path={APP_ROUTES.customLists.list} element={<CustomListsPage />} />
          <Route path={APP_ROUTES.customLists.create} element={<CustomListCreatePage />} />
          <Route path={APP_ROUTES.customLists.editRoute} element={<CustomListEditPage />} />
          <Route path={APP_ROUTES.memberAlerts.list} element={<MemberAlertsPage />} />
          <Route path={APP_ROUTES.memberAlerts.create} element={<MemberAlertComposePage />} />
          <Route path={APP_ROUTES.memberAlerts.editRoute} element={<MemberAlertEditPage />} />
          <Route path={APP_ROUTES.memberAlerts.detailRoute} element={<MemberAlertDetailPage />} />
          <Route path={APP_ROUTES.documentCategories.list} element={<DocumentCategoriesPage />} />
          <Route path={APP_ROUTES.documentCategories.create} element={<DocumentCategoryCreatePage />} />
          <Route path={APP_ROUTES.documentCategories.editRoute} element={<DocumentCategoryEditPage />} />
          <Route path={APP_ROUTES.documentCategories.detailRoute} element={<DocumentCategoryDetailPage />} />
          <Route path={APP_ROUTES.eventInvoices.list} element={<EventInvoicesPage />} />
          <Route path={APP_ROUTES.eventInvoices.detailRoute} element={<EventInvoiceDetailPage />} />
          <Route path={APP_ROUTES.memberDocuments.list} element={<MemberDocumentsPage />} />
          <Route path={APP_ROUTES.memberDocuments.detailRoute} element={<MemberDocumentCategoryPage />} />
          <Route
            path={APP_ROUTES.memberDocuments.base}
            element={<Navigate to={APP_ROUTES.memberDocuments.list} replace />}
          />
          <Route path={APP_ROUTES.alertInbox} element={<AlertInboxPage />} />
          <Route path={APP_ROUTES.alertInboxDetailRoute} element={<MemberNotificationDetailPage />} />
          <Route path={APP_ROUTES.team} element={<Settings />} />
          <Route path={APP_ROUTES.analytics} element={<Settings />} />
          <Route path={APP_ROUTES.help} element={<Settings />} />
          <Route path={APP_ROUTES.seatingLayouts.list} element={<SeatingLayoutsPage />} />
          <Route path={APP_ROUTES.seatingLayouts.create} element={<SeatingLayoutDesignerPage />} />
          <Route path={APP_ROUTES.seatingLayouts.edit(":chartUniqueId")} element={<SeatingLayoutDesignerPage />} />
        </Route>

        {/* Redirect root */}
        <Route path={APP_ROUTES.root} element={<Navigate to={APP_ROUTES.dashboard} replace />} />
        <Route path="*" element={<Navigate to={APP_ROUTES.dashboard} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
