import { db, activityTable, type Founder } from "@workspace/db";
export async function audit(founder: Founder, action: string, division = "", resourceId?: string): Promise<void> {
  // Deliberately limited to server-generated action labels and IDs, never inputs
  // such as passwords, usernames, account names, request bodies, or backup bytes.
  await db.insert(activityTable).values({
    actorId: founder.id, actor: founder.name, action, division, resourceId,
  });
}
