<script setup lang="ts">
defineOptions({ inheritAttrs: false });

const props = defineProps<{ modelValue: number }>();
const emit = defineEmits<{ "update:modelValue": [value: number] }>();
const formatter = new Intl.NumberFormat("es-CO");
const displayValue = computed(() =>
  props.modelValue > 0 ? formatter.format(props.modelValue) : "",
);

function update(event: Event) {
  const input = event.target as HTMLInputElement;
  const digits = input.value.replace(/\D/g, "");
  const value = digits ? Number(digits) : 0;
  emit("update:modelValue", value);
  input.value = value > 0 ? formatter.format(value) : "";
}
</script>

<template>
  <input
    v-bind="$attrs"
    :value="displayValue"
    type="text"
    inputmode="numeric"
    autocomplete="off"
    @input="update"
  />
</template>
