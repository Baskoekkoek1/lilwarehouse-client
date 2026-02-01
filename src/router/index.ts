import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "Login",
      component: () => import("../views/LoginView.vue"),
      meta: { public: true },
    },
    {
      path: "/",
      name: "Inventory",
      component: () => import("../views/InventoryView.vue"),
    },
  ],
});

router.beforeEach((to, _, next) => {
  const auth = useAuthStore();

  if (!to.meta.public && !auth.isAuthenticated) {
    next({ name: "Login" });
  } else if (to.name === "Login" && auth.isAuthenticated) {
    next({ name: "Inventory" });
  } else {
    next();
  }
});

export default router;
