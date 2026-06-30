/**
 * Genesis Data SDK
 *
 * Native read/write of a Taskade project's rows from a Genesis app - no iframe, no widget.
 *
 * @example
 * ```typescript
 * import { getNodes, createNode, updateNode, deleteNode } from '@/lib/genesis-data';
 *
 * const rows = await getNodes(projectId);
 * await createNode(projectId, { Name: 'Maria', Status: 'New' });
 * await updateNode(projectId, rows[0].id, { Status: 'Contacted' });
 * await deleteNode(projectId, rows[0].id);
 * ```
 */
export type { GenesisNode, NewNodeFields } from './client';
export { getNodes, createNode, updateNode, deleteNode } from './client';
export type { ClientOptions } from '../genesis-gateway';
