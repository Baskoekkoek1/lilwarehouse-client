import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

const savedTheme =
  typeof window !== "undefined"
    ? localStorage.getItem("user_theme") || "earthyLight"
    : "earthyLight";

export default createVuetify({
  components,
  directives,
  defaults: {
    VCard: { rounded: "lg" },
    VBtn: { rounded: "lg" },
    VTextField: { rounded: "lg" },
    VSelect: { rounded: "lg" },
    VDataTable: { rounded: "lg" },
    VDataTableServer: { rounded: "lg" },
  },
  theme: {
    defaultTheme: savedTheme,
    themes: {
      earthyDark: {
        dark: true,
        colors: {
          background: "#1A1E1C",
          surface: "#262C29",
          primary: "#A3B899",
          secondary: "#2E3632",
          accent: "#DBCFB0",
          error: "#E57373",
          success: "#8FB996",
        },
      },
      earthyLight: {
        dark: false,
        colors: {
          background: "#F7F5F0",
          surface: "#FFFFFF",
          primary: "#D97757",
          secondary: "#889E81",
          accent: "#E6B89C",
          error: "#D9534F",
          success: "#7DA165",
        },
      },
    },
  },
});
