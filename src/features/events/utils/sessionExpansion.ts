/**
 * Which sessions the registration form opens with.
 *
 * A single session is opened, because collapsing the only thing on the step would hide the whole form behind one
 * more click. Two or more are left shut, so the buyer sees every session at once and chooses which to look into
 * rather than scrolling past several open ticket lists to find the one they came for.
 *
 * @param sessionUniqueIds Sessions on the step, in the order the organizer arranged them.
 * @returns The ids to open with. Empty means every session starts collapsed.
 */
export function getInitiallyExpandedSessionIds(sessionUniqueIds: string[]): string[] {
  return sessionUniqueIds.length === 1 ? [...sessionUniqueIds] : []
}
