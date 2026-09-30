import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useUIStore } from "../stores/ui";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "Inventory",
      component: () => import("../views/InventoryView/InventoryView.vue"),
      meta: { public: false },
    },
  ],
});

// Navigation guard.
router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();
  const ui = useUIStore();

  if (!to.meta.public && !auth.isAuthenticated) {
    ui.isLoginModalOpen = true;
    next(false);
  } else {
    next();
  }
});

export default router;
