export type AdminNotificationType = "success" | "error" | "warning" | "info";
export type AdminNotification = {
  id: number;
  type: AdminNotificationType;
  message: string;
};

export function adminNotificationType(message: string): AdminNotificationType {
  return /no se|no fue posible|no puede|error|failed|falló|rechaz|modificado|inválid|debe ser|obligatorio|requerid|permiso/i.test(
    message,
  )
    ? "error"
    : "success";
}

export function useAdminNotifications() {
  const notifications = useState<AdminNotification[]>(
    "admin-notifications",
    () => [],
  );
  const nextId = useState("admin-notification-sequence", () => 0);
  const timers = new Map<number, ReturnType<typeof setTimeout>>();

  function dismiss(id: number) {
    const timer = timers.get(id);
    if (timer) clearTimeout(timer);
    timers.delete(id);
    notifications.value = notifications.value.filter((item) => item.id !== id);
  }

  function notify(
    message: string,
    type: AdminNotificationType = "info",
    duration = type === "error" ? 8000 : 5000,
  ) {
    if (!message || import.meta.server) return;
    nextId.value += 1;
    const id = Date.now() * 1000 + nextId.value;
    notifications.value = [...notifications.value, { id, type, message }];
    timers.set(
      id,
      setTimeout(() => dismiss(id), duration),
    );
  }

  return { notifications, notify, dismiss };
}
