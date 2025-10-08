// require("./instrument");

// All other imports below
// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

Sentry.init({
  dsn: process.env.SENTRY_URL,
  integrations: [
    nodeProfilingIntegration(),
  ],
  // Tracing must be enabled for profiling to work
  tracesSampleRate: 1.0,
  // Set sampling rate for profiling - this is evaluated only once per SDK.init call
  profileSessionSampleRate: 1.0,
  // Trace lifecycle automatically enables profiling during active traces
  profileLifecycle: 'trace',

  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// // Middleware Sentry
// app.use(Sentry.Handlers.requestHandler());
// app.use(Sentry.Handlers.tracingHandler());

// Simulasi database
async function fetchProductsFromDB() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 1, name: "Laptop", price: 1200 },
        { id: 2, name: "Keyboard", price: 100 },
      ]);
    }, 150); // delay 150ms
  });
}

// Simulasi cache lookup
async function checkCache() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(null), 50); // miss
  });
}

// Simulasi API eksternal
async function fetchSupplierInfo() {
  return new Promise((resolve) => {
    setTimeout(() => resolve("Supplier API OK"), 100);
  });
}

// Route dengan profiling kompleks
app.get("/products", async (req, res, next) => {
  // Root span untuk route
  const rootSpan = Sentry.startSpan({ name: "GET /products", op: "http.server" });

  try {
    const result = await rootSpan.run(async () => {
      // Nested span: cache
      const cacheSpan = Sentry.startSpan({ name: "Cache lookup", op: "cache.get" });
      const cacheResult = await cacheSpan.run(checkCache);
      cacheSpan.end();

      let products;

      if (cacheResult) {
        products = cacheResult;
      } else {
        // Nested span: DB query
        const dbSpan = Sentry.startSpan({ name: "DB query - products", op: "db.query" });
        products = await dbSpan.run(fetchProductsFromDB);
        dbSpan.end();

        // Nested span: external API
        const apiSpan = Sentry.startSpan({ name: "External API - supplier", op: "http.client" });
        const supplier = await apiSpan.run(fetchSupplierInfo);
        apiSpan.end();

        // Nested span: processing logic
        const processSpan = Sentry.startSpan({ name: "Business logic - enrich products", op: "function" });
        products = products.map((p) => ({
          ...p,
          supplier,
          priceWithTax: p.price * 1.11,
        }));
        processSpan.end();
      }

      return products;
    });

    rootSpan.end();
    res.json(result);
  } catch (err) {
    rootSpan.end();
    next(err);
  }
});

// app.use(Sentry.Handlers.errorHandler());
app.listen(3000, () => console.log("Server running on http://localhost:3000"));