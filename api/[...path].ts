// Vercel packages this catch-all as one Node.js Function. Express receives the
// original /api/* URL, so the existing router and same-origin checks stay intact.
export { default } from "../artifacts/api-server/src/app";
