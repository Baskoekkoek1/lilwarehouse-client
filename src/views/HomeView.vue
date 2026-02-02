<template>
  <h2>Welcome to LilWarehouse!</h2>
  <h3>{{ `Welcome ${userName}!` }}</h3>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
const userName = computed(() =>
  authStore.user ? authStore.user.username : "stranger",
);
</script>
