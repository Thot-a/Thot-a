// POST /functions/v1/delete-account  body: { confirm: "DELETE" }
// Permanently deletes the caller's auth user. All personal rows cascade (see docs/DATABASE.md).
import { z } from 'zod';

import { handle, HttpError, json, log, readJsonBody } from '../_shared/http.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';

const Body = z.object({ confirm: z.literal('DELETE') }).strict();

Deno.serve(
  handle(async (req, requestId) => {
    const { userId } = await requireUser(req);
    if (!Body.safeParse(await readJsonBody(req)).success) throw new HttpError('VALIDATION', 'Confirmation required');

    const { error } = await adminClient().auth.admin.deleteUser(userId);
    if (error) {
      log('error', 'delete_account_failed', { request_id: requestId });
      throw new HttpError('INTERNAL');
    }
    log('info', 'account_deleted', { request_id: requestId });
    return json({ deleted: true });
  }),
);
