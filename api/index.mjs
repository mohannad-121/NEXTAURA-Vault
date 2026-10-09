// Vercel packages this as one Node.js Function. The Express app is bundled
// during build so Vercel does not recompile its workspace TypeScript graph
// with a different module-resolution mode.
export { default } from "../artifacts/api-server/dist/app.mjs";
