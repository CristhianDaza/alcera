<script setup lang="ts">
const props = defineProps<{ url: string }>();
const busy = ref(false);
const siteKey = useRuntimeConfig().public.recaptchaEnterpriseSiteKey;

type RecaptchaEnterprise = {
  ready(callback: () => void): void;
  execute(siteKey: string, options: { action: string }): Promise<string>;
};

declare global {
  interface Window {
    grecaptcha?: { enterprise?: RecaptchaEnterprise };
  }
}

useHead(() => ({
  script: siteKey
    ? [
        {
          key: "recaptcha-enterprise",
          src: `https://www.google.com/recaptcha/enterprise.js?render=${siteKey}`,
          async: true,
          defer: true,
        },
      ]
    : [],
}));

async function openWhatsApp() {
  if (busy.value || !siteKey) return;
  busy.value = true;
  const popup = window.open("", "_blank");
  try {
    const enterprise = window.grecaptcha?.enterprise;
    if (!enterprise) throw new Error("reCAPTCHA no se cargó.");
    const token = await new Promise<string>((resolve, reject) => {
      enterprise.ready(() => {
        enterprise
          .execute(siteKey, { action: "whatsapp_open" })
          .then(resolve)
          .catch(reject);
      });
    });
    await $fetch("/api/recaptcha/verify", { method: "POST", body: { token } });
    if (popup) {
      popup.opener = null;
      popup.location.href = props.url;
    } else window.location.assign(props.url);
  } catch (error) {
    popup?.close();
    alert(
      (error as { data?: { statusMessage?: string } }).data?.statusMessage ||
        "No pudimos verificar la solicitud. Inténtalo de nuevo.",
    );
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <button type="button" :disabled="busy" @click="openWhatsApp">
    <slot />
  </button>
</template>
