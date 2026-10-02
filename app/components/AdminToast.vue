<script setup lang="ts">
import type { AdminNotificationType } from "../composables/useAdminNotifications";

const { notifications, dismiss } = useAdminNotifications();
const icons: Record<AdminNotificationType, string> = {
  success: "✓",
  error: "×",
  warning: "!",
  info: "i",
};
const labels: Record<AdminNotificationType, string> = {
  success: "Correcto",
  error: "Error",
  warning: "Atención",
  info: "Información",
};
</script>

<template>
  <Teleport to="body">
    <div class="admin-toasts" aria-label="Notificaciones" aria-live="polite">
      <TransitionGroup name="toast">
        <article
          v-for="item in notifications"
          :key="item.id"
          class="admin-toast"
          :class="`admin-toast--${item.type}`"
          :role="item.type === 'error' ? 'alert' : 'status'"
        >
          <span class="admin-toast__icon" aria-hidden="true">{{
            icons[item.type]
          }}</span>
          <div class="admin-toast__content">
            <strong>{{ labels[item.type] }}</strong>
            <p>{{ item.message }}</p>
          </div>
          <button
            type="button"
            class="admin-toast__close"
            :aria-label="`Cerrar notificación: ${item.message}`"
            @click="dismiss(item.id)"
          >
            ×
          </button>
        </article>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.admin-toasts {
  position: fixed;
  z-index: 10000;
  top: max(16px, env(safe-area-inset-top));
  right: max(16px, env(safe-area-inset-right));
  display: grid;
  width: min(400px, calc(100vw - 32px));
  gap: 10px;
  pointer-events: none;
}
.admin-toast {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) 28px;
  align-items: start;
  gap: 10px;
  padding: 14px;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--line);
  border-left: 3px solid var(--accent-soft);
  border-radius: 8px;
  box-shadow: 0 12px 36px rgb(0 0 0 / 18%);
  pointer-events: auto;
  overflow-wrap: anywhere;
}
.admin-toast--success {
  border-left-color: #438764;
}
.admin-toast--error {
  border-left-color: var(--error, #b64b4b);
}
.admin-toast--warning {
  border-left-color: #b78334;
}
.admin-toast--info {
  border-left-color: var(--accent-soft);
}
.admin-toast__icon {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-weight: 700;
}
.admin-toast--success .admin-toast__icon {
  color: #438764;
}
.admin-toast--error .admin-toast__icon {
  color: var(--error, #b64b4b);
}
.admin-toast--warning .admin-toast__icon {
  color: #b78334;
}
.admin-toast--info .admin-toast__icon {
  color: var(--accent-soft);
}
.admin-toast__content strong {
  font-size: 12px;
}
.admin-toast__content p {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.45;
}
.admin-toast__close {
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: 0;
  color: var(--muted);
  font-size: 20px;
  line-height: 1;
}
.toast-enter-active,
.toast-leave-active,
.toast-move {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
.toast-leave-active {
  position: absolute;
  right: 0;
  left: 0;
}
@media (max-width: 600px) {
  .admin-toasts {
    top: auto;
    right: max(12px, env(safe-area-inset-right));
    bottom: max(12px, env(safe-area-inset-bottom));
    left: max(12px, env(safe-area-inset-left));
    width: auto;
  }
}
@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active,
  .toast-move {
    transition: none;
  }
}
</style>
