/**
 * Genesis Flows SDK - trigger Taskade automations from a Genesis app, natively.
 *
 * Two entry points, both thin wrappers over gateway routes:
 * - `submitForm` -> a flow whose trigger is a FORM (intake: contact, survey, lead capture)
 * - `runFlow`    -> a flow whose trigger is a WEBHOOK or MANUAL (fire an automation now)
 *
 * Both return the created flow run id when available. A WEBHOOK flow that ends in an
 * "HTTP response" action returns its body synchronously; `runFlow` surfaces it only when
 * that response is a 2xx JSON body (flowRunId is then undefined). A non-2xx status or a
 * non-JSON synchronous body causes the underlying request to throw.
 */
import { gatewayRequest, isEmptyString } from '../genesis-gateway';
import type { ClientOptions, GatewayResponse } from '../genesis-gateway';

/**
 * Submits values to a FORM-trigger flow (the cheapest path to "form -> automation":
 * lead capture, contact, survey). Values are keyed by the form's input names.
 *
 * @example
 * ```typescript
 * await submitForm('flow-123', { name: 'Maria', email: 'maria@acme.com', reason: 'Refund' });
 * ```
 */
export async function submitForm(
  flowId: string,
  values: Record<string, unknown>,
  options?: ClientOptions,
): Promise<{ flowRunId?: string }> {
  if (isEmptyString(flowId)) {
    throw new Error('Flow ID cannot be empty');
  }
  const data = await gatewayRequest<GatewayResponse<{ flowRunId: string }>>(
    `/forms/${encodeURIComponent(flowId)}/run`,
    { method: 'POST', body: JSON.stringify(values) },
    options,
  );
  return { flowRunId: data.payload?.flowRunId };
}

/**
 * Triggers a WEBHOOK- or MANUAL-trigger flow with an optional input payload.
 *
 * @example
 * ```typescript
 * await runFlow('flow-456', { orderId: '789', action: 'refund' });
 * ```
 */
export async function runFlow(
  flowId: string,
  input?: Record<string, unknown>,
  options?: ClientOptions,
): Promise<{ flowRunId?: string }> {
  if (isEmptyString(flowId)) {
    throw new Error('Flow ID cannot be empty');
  }
  const data = await gatewayRequest<GatewayResponse<{ flowRunId: string }>>(
    `/webhooks/${encodeURIComponent(flowId)}/run`,
    { method: 'POST', body: JSON.stringify(input ?? {}) },
    options,
  );
  return { flowRunId: data.payload?.flowRunId };
}
