import express, { type Express, type ErrorRequestHandler } from "express";
import pinoHttp from "pino-http";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { clerkMiddleware, getAuth } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "12mb" }));
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(getClerkProxyHost(req) ?? "", process.env.CLERK_PUBLISHABLE_KEY),
  })),
);

// Browser-cookie authentication is same-origin only. Never allow credentialed
// wildcard CORS; reject cross-site mutations even when a valid cookie is present.
app.use("/api/vault", (req, res, next) => {
  if (["POST", "PATCH", "DELETE", "PUT"].includes(req.method)) {
    const origin = req.get("origin");
    const host = getClerkProxyHost(req) ?? req.get("host");
    let sameOrigin = false;
    try {
      const source = origin ? new URL(origin) : undefined;
      sameOrigin = !!source && source.host === host && source.protocol === `${req.protocol}:`;
    } catch { /* fail closed */ }
    if (!sameOrigin || req.get("sec-fetch-site") === "cross-site") {
      res.status(403).json({ error: "Cross-site request rejected." }); return;
    }
    if (req.get("content-length") && req.get("content-length") !== "0" && !req.is("application/json")) {
      res.status(415).json({ error: "JSON requests required." }); return;
    }
  }
  next();
});
app.use("/api/vault", rateLimit({
  windowMs: 60_000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false,
  message: { error: "Too many requests. Please wait a minute." },
}));
app.use("/api/vault", rateLimit({
  windowMs: 60_000, limit: 90, standardHeaders: "draft-8", legacyHeaders: false,
  keyGenerator: (req) => getAuth(req).userId ?? "unauthenticated",
  message: { error: "Too many vault actions. Please wait a minute." },
}));

app.use("/api", router);

const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  // Never log the raw error: DB errors, parser errors and third-party SDK errors
  // can contain query values, request bodies, tokens or other credentials.
  req.log.error({ errorType: error instanceof Error ? error.name : "UnknownError" }, "Request failed");
  if (res.headersSent) return;
  res.set("Cache-Control", "no-store");
  const status = typeof error?.status === "number" && [400, 413].includes(error.status) ? error.status : 500;
  res.status(status).json({ error: status === 500 ? "The vault request could not be completed." : "Invalid or oversized request." });
};
app.use(errorHandler);

export default app;
