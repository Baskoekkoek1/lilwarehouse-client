<template>
  <div>
    <h1>Inventory</h1>
    <p>If you see this, you are logged in!</p>
    <button
      @click="
        auth.logout();
        router.push('/login');
      "
    >
      Logout
    </button>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from "../stores/auth";
import { useRouter } from "vue-router";

const auth = useAuthStore();
const router = useRouter();
</script>
