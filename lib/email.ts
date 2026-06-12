import { StorypointRequest } from './types';

export async function sendModerationEmail(request: StorypointRequest, decision: 'approved' | 'rejected') {
  console.info(`[email] ${decision} request ${request.id} for ${request.email}`);
}
