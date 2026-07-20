# Codex Handoff

## Current Objective
Carry the event charge-rule work forward safely. The backend now includes mapped event charge rules in registration payment breakdowns; the next session should verify any UI follow-through only if needed.

## Completed Work
- Event advanced settings now persists `ChargeRuleUniqueIds`.
- Event registration payment breakdowns now include mapped event charge rules in the existing `Charges` array.
- Frontend registration UI already consumes `paymentBreakdowns[].charges`, so no new response field was needed.
- Backend build completed successfully after the change.

## Architectural Decisions and Reasons
- Reused `paymentBreakdowns[].charges` instead of adding a new payment payload field, to avoid a contract fork.
- Tagged mapped event charge rows with `Source = "event-charge-rule"` so they can coexist with revenue-plan and processor-fee rows.
- Kept revenue-plan and processor-fee behavior unchanged.
- Kept charge-rule mapping in event advanced settings rather than introducing a separate event charge configuration path.

## Files Changed
- Frontend commit `8809faa`
  - `src/api/chargeRules.ts`
  - `src/api/events.ts`
  - `src/features/charge-rules/components/ChargeRuleDialog.tsx`
  - `src/features/charge-rules/components/ChargeRulesManager.tsx`
  - `src/features/charge-rules/index.ts`
  - `src/features/events/components/EventChargeRulesSection.tsx`
  - `src/features/events/hooks/useEventChargeRuleOptions.ts`
  - `src/features/events/hooks/useEventWizardResumeValues.ts`
  - `src/features/events/pages/EventPurchaseTimeLimitStepPage.tsx`
  - `src/features/events/pages/EventWizardLayout.tsx`
  - `src/features/events/schemas/eventWizard.schemas.ts`
- Backend commit `dda5004a`
  - `src/Modules/Event/Ideas.Event.Infrastructure/Services/EventRegistrationService.cs`
  - `tests/Ideas.API.Tests/Wizard/EventWizardServiceTests.cs`

## Important Commands and Test Results
- `git show --stat --oneline --name-only 8809faa --`
- `git show --stat --oneline --name-only dda5004a --`
- `dotnet build D:\V4Ideas\Ideali\ideali.api\Ideali.API.sln` succeeded.
- Frontend repo status was checked and had only an untracked `CODEX_HANDOFF_INSTRUCTIONS.md`.
- Backend repo status was checked and was clean on the tracked branch.

## Known Bugs or Limitations
- The frontend currently does not visually distinguish `event-charge-rule` rows from revenue-plan rows; only `processor-fee` gets a special secondary label.
- No additional frontend behavior was changed in this turn.

## Unfinished Tasks
1. Verify the registration payment tab in the browser with the new backend payload.
2. If product wants it, add a visual distinction for `event-charge-rule` rows.

## Exact Next Action
Open `src/features/events/pages/EventRegisterWizard.tsx` and confirm whether the new `event-charge-rule` rows need any UI-specific styling or labeling.

## Assumptions That Must Not Change
- Do not split event charge rules into a separate registration payload field.
- Do not change revenue-plan or processor-fee behavior while continuing this work.
- Keep charge-rule mapping attached to event advanced settings.

## Branch and Commit Status
- Frontend repo: `sohail/features/event/event-registration`, HEAD `8809faa`, tracking `origin/sohail/features/event/event-registration`.
- Backend repo: `sohail/features/event/event-registration`, HEAD `dda5004a`, tracking `origin/sohail/features/event/event-registration`.
- Current frontend working tree is not clean because `docs/CODEX_HANDOFF.md` is new and `CODEX_HANDOFF_INSTRUCTIONS.md` is still untracked.
