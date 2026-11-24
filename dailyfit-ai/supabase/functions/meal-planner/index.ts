// POST /functions/v1/meal-planner
// body: { action: "generate", plan_date, ...overrides } | { action: "swap", meal_plan_item_id, reason }
import { aiFromEnv } from '../_shared/ai/index.ts';
import { MealPlannerRequest } from '../_shared/domain/contracts.ts';
import { handle, HttpError, json, log, readJsonBody } from '../_shared/http.ts';
import { supabasePlannerRepo } from '../_shared/meal-planner/repo.ts';
import { generatePlan, type PlannerDeps, swapMeal } from '../_shared/meal-planner/service.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';

Deno.serve(
  handle(async (req, requestId) => {
    const { userId, client } = await requireUser(req);
    const parsed = MealPlannerRequest.safeParse(await readJsonBody(req));
    if (!parsed.success) throw new HttpError('VALIDATION', 'Invalid request body');

    let ai: PlannerDeps['ai'] = null;
    try {
      const cfg = aiFromEnv(Deno.env);
      ai = { provider: cfg.provider, model: cfg.plannerModel, timeoutMs: cfg.timeoutMs };
    } catch {
      log('warn', 'planner_ai_not_configured', { request_id: requestId });
    }

    const deps: PlannerDeps = {
      repo: supabasePlannerRepo(client, adminClient()),
      ai,
      allowSample: Deno.env.get('ALLOW_SAMPLE_FOOD') === 'true',
      requestId,
    };

    const result = parsed.data.action === 'generate'
      ? await generatePlan(userId, parsed.data, deps)
      : await swapMeal(userId, parsed.data, deps);

    log('info', 'planner_ok', { request_id: requestId, action: parsed.data.action, generated_by: result.plan.generated_by });
    return json(result);
  }),
);
