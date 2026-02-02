<template>
  <v-form
    ref="form"
    v-model="isFormValid"
    @submit.prevent="handleLogin"
    class="mt-4"
  >
    <v-text-field
      v-model="username"
      label="Username"
      variant="outlined"
      prepend-inner-icon="mdi-account"
      :rules="[(v) => !!v || 'Required']"
    ></v-text-field>

    <v-text-field
      v-model="password"
      label="Password"
      variant="outlined"
      prepend-inner-icon="mdi-lock"
      :type="showPassword ? 'text' : 'password'"
      :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
      @click:append-inner="showPassword = !showPassword"
      :rules="[(v) => !!v || 'Required']"
    ></v-text-field>

    <v-btn
      block
      color="primary"
      size="large"
      type="submit"
      :loading="authStore.loading"
      :disabled="!isFormValid"
    >
      Sign In
    </v-btn>
  </v-form>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "../../../stores/auth";
import { useRouter } from "vue-router";

const emit = defineEmits(["success"]);
const authStore = useAuthStore();
const router = useRouter();

const isFormValid = ref(false);
const showPassword = ref(false);
const username = ref("");
const password = ref("");

async function handleLogin() {
  const success = await authStore.login(username.value, password.value);
  if (success) {
    emit("success");
    router.push("/inventory");
  }
}
</script>
