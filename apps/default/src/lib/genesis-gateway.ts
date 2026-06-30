/**
 * Low-level fetch helper for the Taskade gateway.
 *
 * A Genesis app reaches every gateway route at a RELATIVE `/api/taskade/*` path - the
 * Director proxy rewrites it to the real gateway endpoint and injects the gateway token
 * server-side, so the app never handles credentials. This helper centralises the same
 * robust parse + error handling used by `agent-chat/v2/client.ts` so the data + flow
 * helpers stay thin.
 *
 * Auth note: the gateway delegates per-row authorization to the app. If your app exposes
 * data per signed-in user, scope reads/writes yourself (e.g. with a user/owner field).
 */

/**
 * Configuration for the gateway helpers.
 */
export interface ClientOptions {
  /** Base URL for API requests (defaults to relative paths). */
  baseUrl?: string;
}

/**
 * Standard gateway response envelope.
 */
export interface GatewayResponse<TPayload = undefined> {
  ok: boolean;
  payload?: TPayload;
}

export function isEmptyString(value: string | null | undefined): boolean {
  return value == null || value.trim().length === 0;
}

/**
 * Performs a JSON request against `/api/taskade/<path>` and returns the parsed body.
 *
 * @throws Error if the request fails or the response is not valid JSON.
 */
export async function gatewayRequest<TResponse>(
  path: string,
  init: RequestInit,
  options?: ClientOptions,
): Promise<TResponse> {
  const baseUrl = options?.baseUrl ?? '';
  const url = `${baseUrl}/api/taskade${path}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const responseText = await response.text().catch(() => '');

  if (!response.ok) {
    throw new Error(
      `Taskade gateway request failed: ${response.status} ${responseText || 'Unknown error'}`,
    );
  }

  if (!contentType.includes('application/json')) {
    throw new Error(
      `Invalid response format: expected JSON, got ${contentType}. Response: ${responseText.substring(0, 100)}`,
    );
  }

  try {
    return JSON.parse(responseText) as TResponse;
  } catch (err) {
    throw new Error(
      `Failed to parse JSON response: ${err instanceof Error ? err.message : 'Unknown error'}. Response: ${responseText.substring(0, 200)}`,
      { cause: err },
    );
  }
}
