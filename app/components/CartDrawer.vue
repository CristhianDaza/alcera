<script setup lang="ts">
import { money } from "#shared/commerce";

const route = useRoute();
const { lines, count, total, drawerLineKey, drawerOpen, closeDrawer } =
  useCart();
const panel = ref<HTMLElement | null>(null);
const closeButton = ref<HTMLButtonElement | null>(null);
let returnFocusTo: HTMLElement | null = null;
const addedLine = computed(
  () =>
    lines.value.find(
      (line) => `${line.productId}-${line.variantId}` === drawerLineKey.value,
    ) ?? null,
);

watch(drawerOpen, async (open) => {
  if (!import.meta.client) return;
  if (open) {
    returnFocusTo =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    await nextTick();
    closeButton.value?.focus();
    const line = addedLine.value;
    if (line) {
      void trackAnalyticsEvent("view_cart_drawer", {
        currency: "COP",
        value: total.value,
        item_count: count.value,
        items: [
          {
            item_id: line.productId,
            item_name: line.name,
            item_variant: line.size,
            price: line.price,
            quantity: line.quantity,
          },
        ],
      });
    }
  } else {
    await nextTick();
    returnFocusTo?.focus();
    returnFocusTo = null;
  }
});

watch(() => route.fullPath, closeDrawer);

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    closeDrawer();
    return;
  }
  if (event.key !== "Tab" || !panel.value) return;
  const focusable = [
    ...panel.value.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ];
  if (!focusable.length) return;
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="cart-drawer">
      <div
        v-if="drawerOpen"
        class="cart-drawer-backdrop"
        @click.self="closeDrawer"
        @keydown="onKeydown"
      >
        <aside
          ref="panel"
          class="cart-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-drawer-title"
          tabindex="-1"
        >
          <header class="cart-drawer__header">
            <div>
              <p class="eyebrow">AGREGADO A TU BOLSA ✓</p>
              <h2 id="cart-drawer-title">Tu bolsa</h2>
            </div>
            <button
              ref="closeButton"
              class="cart-drawer__close"
              type="button"
              aria-label="Cerrar mini bolsa"
              @click="closeDrawer"
            >
              <span aria-hidden="true">×</span>
            </button>
          </header>
          <div class="cart-drawer__content" aria-live="polite">
            <article v-if="addedLine" class="cart-drawer__item">
              <img
                :src="addedLine.image"
                :alt="addedLine.name"
                width="96"
                height="112"
                loading="lazy"
                decoding="async"
              />
              <div>
                <h3>{{ addedLine.name }}</h3>
                <p>{{ addedLine.size }}</p>
                <p>Cantidad: {{ addedLine.quantity }}</p>
                <strong>{{ money(addedLine.price) }}</strong>
              </div>
            </article>
            <div class="cart-drawer__summary">
              <div>
                <span>Productos</span><strong>{{ count }}</strong>
              </div>
              <div>
                <span>Subtotal</span><strong>{{ money(total) }}</strong>
              </div>
            </div>
            <p class="cart-drawer__shipping">
              El envío se paga al momento de recibir.
            </p>
          </div>
          <footer class="cart-drawer__actions">
            <NuxtLink class="button full" to="/carrito">Ir a la bolsa</NuxtLink>
            <button class="text-link" type="button" @click="closeDrawer">
              Seguir comprando
            </button>
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
.cart-drawer-backdrop {
  position: fixed;
  z-index: 1200;
  inset: 0;
  display: flex;
  justify-content: flex-end;
  background: rgb(17 15 14 / 42%);
}
.cart-drawer {
  width: min(440px, 100%);
  height: 100%;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--paper);
  color: var(--ink);
  box-shadow: -12px 0 40px rgb(17 15 14 / 14%);
  padding: max(24px, env(safe-area-inset-top)) 24px
    max(20px, env(safe-area-inset-bottom));
  outline: none;
}
.cart-drawer__header,
.cart-drawer__summary > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.cart-drawer__header h2,
.cart-drawer__item h3,
.cart-drawer__item p {
  margin: 0;
}
.cart-drawer__header .eyebrow {
  margin: 0 0 7px;
}
.cart-drawer__close {
  width: 44px;
  height: 44px;
  border: 1px solid var(--line);
  background: transparent;
  color: inherit;
  font-size: 28px;
  cursor: pointer;
}
.cart-drawer__content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 28px 0 16px;
}
.cart-drawer__item {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 16px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--line);
}
.cart-drawer__item img {
  width: 88px;
  height: 104px;
  object-fit: cover;
  background: var(--surface);
}
.cart-drawer__item > div {
  display: grid;
  align-content: center;
  gap: 6px;
  min-width: 0;
}
.cart-drawer__item h3 {
  overflow-wrap: anywhere;
  font-size: 16px;
}
.cart-drawer__item p,
.cart-drawer__shipping {
  color: var(--muted);
  font-size: 13px;
}
.cart-drawer__summary {
  display: grid;
  gap: 12px;
  padding: 20px 0 10px;
}
.cart-drawer__shipping {
  margin: 8px 0 0;
}
.cart-drawer__actions {
  display: grid;
  gap: 14px;
  padding-top: 16px;
  text-align: center;
}
.cart-drawer__actions .text-link {
  min-height: 44px;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}
.cart-drawer-enter-active,
.cart-drawer-leave-active {
  transition: background-color 0.2s ease;
}
.cart-drawer-enter-active .cart-drawer,
.cart-drawer-leave-active .cart-drawer {
  transition: transform 0.24s ease;
}
.cart-drawer-enter-from,
.cart-drawer-leave-to {
  background: transparent;
}
.cart-drawer-enter-from .cart-drawer,
.cart-drawer-leave-to .cart-drawer {
  transform: translateX(100%);
}
@media (max-width: 560px) {
  .cart-drawer-backdrop {
    align-items: flex-end;
  }
  .cart-drawer {
    width: 100%;
    max-height: min(82dvh, 720px);
    height: auto;
    border-radius: 18px 18px 0 0;
    padding: max(20px, env(safe-area-inset-top)) 20px
      max(16px, env(safe-area-inset-bottom));
  }
  .cart-drawer-enter-from .cart-drawer,
  .cart-drawer-leave-to .cart-drawer {
    transform: translateY(100%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .cart-drawer-enter-active,
  .cart-drawer-leave-active,
  .cart-drawer-enter-active .cart-drawer,
  .cart-drawer-leave-active .cart-drawer {
    transition-duration: 0.01ms;
  }
}
</style>
