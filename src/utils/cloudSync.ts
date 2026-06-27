import { supabase } from "@/integrations/supabase/client";
import type { SaveData } from "./storage";

export type CloudProgress = {
  unlocked: string[];
  completed: string[];
  best: Record<string, number>;
};

export async function fetchProgress(userId: string): Promise<CloudProgress | null> {
  const { data, error } = await supabase
    .from("game_progress")
    .select("unlocked, completed, best")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    unlocked: data.unlocked ?? ["l1"],
    completed: data.completed ?? [],
    best: (data.best ?? {}) as Record<string, number>,
  };
}

export async function pushProgress(userId: string, save: SaveData): Promise<void> {
  await supabase
    .from("game_progress")
    .upsert(
      {
        user_id: userId,
        unlocked: save.unlocked,
        completed: save.completed,
        best: save.best,
      },
      { onConflict: "user_id" },
    );
}

/** Merge cloud + local — keep max best (lowest moves), union arrays. */
export function mergeProgress(local: SaveData, cloud: CloudProgress): SaveData {
  const unlocked = Array.from(new Set([...local.unlocked, ...cloud.unlocked]));
  const completed = Array.from(new Set([...local.completed, ...cloud.completed]));
  const best: Record<string, number> = { ...cloud.best };
  for (const [k, v] of Object.entries(local.best)) {
    best[k] = Math.min(best[k] ?? Infinity, v);
  }
  return { ...local, unlocked, completed, best };
}