// src/env.d.ts
declare module "vuetify/styles" {
  const content: any;
  export default content;
}

// This also helps with other side-effect imports you might use later
declare module "*.css" {
  const content: any;
  export default content;
}
