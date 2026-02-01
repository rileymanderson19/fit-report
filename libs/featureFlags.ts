/**
 * Feature flags for controlling app behavior
 *
 * These flags allow toggling features on/off via environment variables
 * without code changes, supporting the transition between business models.
 */

/**
 * When true, users must have has_access=true (via Stripe subscription) to access dashboard features.
 * When false (concierge mode), all authenticated users can access the dashboard.
 */
export function isStripeGatingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_STRIPE_GATING_ENABLED === 'true';
}

/**
 * When true, enables the concierge onboarding flow with admin invites.
 * New users must be invited by an admin and complete the onboarding wizard.
 */
export function isConciergeOnboardingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_CONCIERGE_ONBOARDING_ENABLED !== 'false';
}
