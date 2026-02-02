import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useUIStore } from "../stores/ui";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "Home",
      component: () => import("../views/HomeView.vue"),
      meta: { public: true },
    },
    {
      path: "/inventory",
      name: "Inventory",
      component: () => import("../views/InventoryView.vue"),
      meta: { public: false },
    },
  ],
});

// Navigation guard.
router.beforeEach((to, from, next) => {
  const auth = useAuthStore();
  const ui = useUIStore();

  if (!to.meta.public && !auth.isAuthenticated) {
    ui.isLoginModalOpen = true;

    if (from.name) {
      next(false);
    } else {
      next({ name: "Home" });
    }
  } else {
    next();
  }
});

export default router;
