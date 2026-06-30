/**
 * Genesis Flows SDK
 *
 * Trigger Taskade automations from a Genesis app - submit a form (intake / lead capture /
 * survey) or run a webhook/manual flow. No iframe, no widget.
 *
 * @example
 * ```typescript
 * import { submitForm, runFlow } from '@/lib/genesis-flows';
 *
 * // Form intake -> FORM-trigger flow (e.g. capture a lead, then route it)
 * await submitForm(contactFormFlowId, { name, email, reason });
 *
 * // Fire an automation now -> WEBHOOK/MANUAL-trigger flow
 * await runFlow(refundFlowId, { orderId, amount });
 * ```
 */
export { submitForm, runFlow } from './client';
export type { ClientOptions } from '../genesis-gateway';
