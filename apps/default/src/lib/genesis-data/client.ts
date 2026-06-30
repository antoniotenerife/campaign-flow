/**
 * Genesis Data SDK - read & write a Taskade project's rows (nodes) from a Genesis app,
 * natively (no iframe). Thin typed wrappers over the `/api/taskade/projects/:id/nodes`
 * gateway routes. All writes funnel through the backend's single OT write path.
 */
import { gatewayRequest, isEmptyString } from '../genesis-gateway';
import type { ClientOptions, GatewayResponse } from '../genesis-gateway';

/**
 * A serialized project row. `fieldValues` is keyed by field path (e.g. `Status`, `Email`);
 * values are stringified. `parentId` is the parent row id, or null for a top-level row.
 */
export interface GenesisNode {
  id: string;
  fieldValues: Record<string, string>;
  parentId: string | null;
}

/**
 * Fields for a new row. Keys are field paths; values are strings. Pass `parentId` to nest
 * the row under an existing one.
 */
export type NewNodeFields = Record<string, string> & { parentId?: string };

/**
 * Fetches all rows of a project.
 *
 * @example
 * ```typescript
 * const rows = await getNodes('project-123');
 * ```
 */
export async function getNodes(projectId: string, options?: ClientOptions): Promise<GenesisNode[]> {
  if (isEmptyString(projectId)) {
    throw new Error('Project ID cannot be empty');
  }
  const data = await gatewayRequest<GatewayResponse<{ nodes: GenesisNode[] }>>(
    `/projects/${encodeURIComponent(projectId)}/nodes`,
    { method: 'GET' },
    options,
  );
  return data.payload?.nodes ?? [];
}

/**
 * Creates a new row in a project.
 *
 * @example
 * ```typescript
 * await createNode('project-123', { Name: 'Maria', Email: 'maria@acme.com', Status: 'New' });
 * ```
 */
export async function createNode(
  projectId: string,
  fields: NewNodeFields,
  options?: ClientOptions,
): Promise<void> {
  if (isEmptyString(projectId)) {
    throw new Error('Project ID cannot be empty');
  }
  await gatewayRequest(
    `/projects/${encodeURIComponent(projectId)}/nodes`,
    { method: 'POST', body: JSON.stringify(fields) },
    options,
  );
}

/**
 * Updates field values on an existing row. Only the provided fields are changed.
 */
export async function updateNode(
  projectId: string,
  nodeId: string,
  fields: Record<string, string>,
  options?: ClientOptions,
): Promise<void> {
  if (isEmptyString(projectId) || isEmptyString(nodeId)) {
    throw new Error('Project ID and node ID cannot be empty');
  }
  await gatewayRequest(
    `/projects/${encodeURIComponent(projectId)}/nodes/${encodeURIComponent(nodeId)}`,
    { method: 'PATCH', body: JSON.stringify(fields) },
    options,
  );
}

/**
 * Deletes a row from a project.
 */
export async function deleteNode(
  projectId: string,
  nodeId: string,
  options?: ClientOptions,
): Promise<void> {
  if (isEmptyString(projectId) || isEmptyString(nodeId)) {
    throw new Error('Project ID and node ID cannot be empty');
  }
  await gatewayRequest(
    `/projects/${encodeURIComponent(projectId)}/nodes/${encodeURIComponent(nodeId)}`,
    { method: 'DELETE' },
    options,
  );
}
