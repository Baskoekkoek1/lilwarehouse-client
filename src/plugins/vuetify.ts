import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

export default createVuetify({
  components,
  directives,
  // Standardize rounded corners across components globally
  defaults: {
    VCard: {
      rounded: "lg",
    },
    VBtn: {
      rounded: "lg",
    },
    VTextField: {
      rounded: "lg",
    },
    VSelect: {
      rounded: "lg",
    },
    VDataTable: {
      rounded: "lg",
    },
  },
  theme: {
    defaultTheme: "dark",
    themes: {
      dark: {
        dark: true,
        colors: {
          background: "#09090B", // Main page background
          surface: "#18181B", // Tables, cards, modals, and upload logs
          primary: "#3B82F6", // Main accent color
          secondary: "#27272A", // Subtle button backgrounds
          error: "#EF4444", // Soft red for delete actions
          success: "#10B981", // Crisp green for upload completion status
        },
      },
    },
  },
});
