<script setup lang="ts">
const store = useStore();

const whatsappUrl = computed(() => {
  const number = store.value.whatsapp?.replace(/\D/g, "");
  return store.value.whatsappEnabled !== false && number
    ? `https://wa.me/${number}`
    : "";
});

const telegramUrl = computed(() => {
  const username = store.value.telegram?.replace(/^@/, "").trim();
  return store.value.telegramEnabled && username
    ? `https://t.me/${username}`
    : "";
});
</script>

<template>
  <dl class="legal-identity">
    <div>
      <dt>Responsable y nombre comercial</dt>
      <dd>{{ store.legalName || store.name }}</dd>
    </div>
    <div v-if="store.legalName && store.legalName !== store.name">
      <dt>Nombre comercial</dt>
      <dd>{{ store.name }}</dd>
    </div>
    <div v-if="store.taxId">
      <dt>NIT</dt>
      <dd>{{ store.taxId }}</dd>
    </div>
    <div v-if="store.contactEmail">
      <dt>Correo electrónico</dt>
      <dd>
        <a :href="`mailto:${store.contactEmail}`">{{ store.contactEmail }}</a>
      </dd>
    </div>
    <div v-if="whatsappUrl">
      <dt>WhatsApp</dt>
      <dd>
        <a :href="whatsappUrl" target="_blank" rel="noopener noreferrer"
          >Abrir canal de atención</a
        >
      </dd>
    </div>
    <div v-if="telegramUrl">
      <dt>Telegram</dt>
      <dd>
        <a :href="telegramUrl" target="_blank" rel="noopener noreferrer"
          >Abrir canal de atención</a
        >
      </dd>
    </div>
  </dl>
</template>
