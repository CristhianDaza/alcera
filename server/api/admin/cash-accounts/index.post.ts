import { z } from "zod";
import type { CashAccountDefinition } from "../../../../shared/business";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = await readValidated(
    event,
    z.object({
      name: z.string().trim().min(2).max(120),
      kind: z.enum(["cash", "bank", "wallet", "card", "other"]),
    }),
  );
  const at = nowIso();
  const account: CashAccountDefinition = {
    id: newId(),
    name: body.name,
    kind: body.kind,
    active: true,
    createdAt: at,
    updatedAt: at,
  };
  await database().collection("cashAccounts").doc(account.id).set(account);
  return account;
});
