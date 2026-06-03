// Allow importing CSS files in extension entry points (Plasmo processes them at build time)
declare module "*.css" {
  const content: string;
  export default content;
}

// Allow importing image assets
declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  const src: string;
  export default src;
}
