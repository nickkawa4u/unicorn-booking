import { ok, adminGuard } from '@/lib/http';
import { loadAdvanceDays } from '@/lib/rules';

export const dynamic = 'force-dynamic';

export const GET = adminGuard(async (req, ctx, me) => ok({ u: me.u, role: me.role, advanceDays: await loadAdvanceDays() }));
