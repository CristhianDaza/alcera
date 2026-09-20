import type { CashAccountDefinition } from "../../../../shared/business";

const defaults: Array<Pick<CashAccountDefinition, "id" | "name" | "kind">> = [
  { id: "cash", name: "Efectivo", kind: "cash" },
  { id: "nequi", name: "Nequi", kind: "wallet" },
  { id: "bancolombia", name: "Bancolombia", kind: "bank" },
  { id: "daviplata", name: "Daviplata", kind: "wallet" },
  { id: "card", name: "Datáfono", kind: "card" },
  { id: "other", name: "Otra", kind: "other" },
];

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const snapshot = await database().collection("cashAccounts").get();
  const custom = snapshot.docs.map((doc) =>
    docData<CashAccountDefinition>(doc),
  );
  const at = nowIso();
  return [
    ...defaults.map((account) => ({
      ...account,
      active: true,
      createdAt: at,
      updatedAt: at,
    })),
    ...custom,
  ].filter(
    (account, index, all) =>
      all.findIndex((item) => item.id === account.id) === index,
  );
});
