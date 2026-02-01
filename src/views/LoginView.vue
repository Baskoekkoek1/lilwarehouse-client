<template>
  <div class="login-container">
    <h1>LilWarehouse Login</h1>
    <button @click="handleLogin">Fake Login for Now</button>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from "../stores/auth";
import { useRouter } from "vue-router";

const auth = useAuthStore();
const router = useRouter();

const handleLogin = async () => {
  // Eventually this will be a form
  const success = await auth.login("user", "***");
  if (success) router.push("/");
};
</script>
