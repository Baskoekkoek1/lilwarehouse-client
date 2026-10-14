import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import App from "./App.vue";
import vuetify from "./plugins/vuetify";
import { useAuthStore } from "./stores/auth";
import "./style.css";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(vuetify);

const authStore = useAuthStore();
authStore.initAuth().finally(() => {
  app.mount("#app");
});
