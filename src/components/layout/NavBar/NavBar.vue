<template>
  <nav class="nav-bar">
    <div class="nav-content">
      <router-link to="/" class="home-link">{{ props.title }}</router-link>
      <div class="d-flex align-center">
        <router-link to="/inventory" class="page-link">Inventory</router-link>

        <v-btn
          :icon="
            authStore.isAuthenticated ? 'mdi-account-circle' : 'mdi-account-box'
          "
          variant="text"
          :color="authStore.isAuthenticated ? 'primary' : 'white'"
          @click="handleAccountButtonClick"
        ></v-btn>

        <v-btn
          v-if="authStore.isAuthenticated"
          icon="mdi-logout"
          variant="text"
          color="error"
          @click="authStore.logout()"
        ></v-btn>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useUIStore } from "../../../stores/ui";
import { useAuthStore } from "../../../stores/auth";

interface Props {
  title: string;
}

const props = defineProps<Props>();
const uiStore = useUIStore();
const authStore = useAuthStore();

const handleAccountButtonClick = () => {
  // If not logged in, open the modal (like your other app)
  if (!authStore.isAuthenticated) {
    uiStore.isLoginModalOpen = true;
  }
};
</script>

<style scoped>
.nav-bar {
  height: 64px; /* Fixed height for v-main compatibility */
  position: sticky;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1000;
  /* DARK MODE: Swapping white for dark surface */
  background-color: #1e1e1e;
  border-bottom: 1px solid #333333;
}

.nav-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  padding: 0 16px;
}

.home-link {
  font-size: large;
  /* DARK MODE: White text */
  color: white;
  text-decoration: none;
  font-weight: bold;
}

.page-link {
  font-size: x-large;
  /* DARK MODE: White text */
  color: white;
  text-decoration: none;
  font-weight: lighter;
  margin-left: 15px;
}

@media (min-width: 768px) {
  .home-link {
    font-size: xx-large;
  }
}
</style>
