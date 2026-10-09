import express, {
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { pinoHttp } from "pino-http";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import {
  authRateLimitKey,
  isAllowedVaultMutationOrigin,
  isChromeExtensionOrigin,
  isTrustedExtensionOrigin,
  publicHost,
} from "./lib/request-security.js";

const app = express();
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
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "12mb" }));

// The browser extension uses bearer authentication, never cookies. Only the
// pinned extension origin receives cross-origin access; no wildcard or
// credentialed CORS response is emitted.
app.use("/api/vault", (req: Request, res: Response, next: NextFunction) => {
  const origin = req.get("origin");
  const trustedExtension = isTrustedExtensionOrigin(origin);

  if (isChromeExtensionOrigin(origin) && !trustedExtension) {
    res.status(403).json({ error: "Untrusted extension origin." });
    return;
  }

  if (trustedExtension) {
    res.set({
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Max-Age": "600",
    });
    res.vary("Origin");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
  }
  next();
});

// Browser-cookie authentication is same-origin only. Never allow credentialed
// wildcard CORS; reject cross-site mutations even when a valid cookie is present.
app.use("/api/vault", (req: Request, res: Response, next: NextFunction) => {
  if (["POST", "PATCH", "DELETE", "PUT"].includes(req.method)) {
    const origin = req.get("origin");
    const host = publicHost(req);
    const publicOrigin = host ? `${req.protocol}://${host}` : undefined;
    if (!isAllowedVaultMutationOrigin({
      origin,
      publicOrigin,
      secFetchSite: req.get("sec-fetch-site"),
    })) {
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
  keyGenerator: authRateLimitKey,
  message: { error: "Too many vault actions. Please wait a minute." },
}));

app.use("/api", router);

const errorHandler: ErrorRequestHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // Never log the raw error: DB errors, parser errors and third-party SDK errors
  // can contain query values, request bodies, tokens or other credentials.
  req.log.error({ errorType: error instanceof Error ? error.name : "UnknownError" }, "Request failed");
  if (res.headersSent) return;
  res.set("Cache-Control", "no-store");
  const errorStatus = typeof error === "object" && error !== null && "status" in error
    ? error.status
    : undefined;
  const status = typeof errorStatus === "number" && [400, 413].includes(errorStatus) ? errorStatus : 500;
  res.status(status).json({ error: status === 500 ? "The vault request could not be completed." : "Invalid or oversized request." });
};
app.use(errorHandler);

export default app;
