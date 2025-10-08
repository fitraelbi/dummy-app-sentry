// Install required packages:
// npm install @sentry/node @sentry/profiling-node

const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');
const express = require('express');

const app = express();

// Initialize Sentry BEFORE any other middleware or routes
Sentry.init({
  dsn: process.env.SENTRY_URL,
  
  // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing
  // Adjust this in production (e.g., 0.1 for 10%)
  tracesSampleRate: 1.0,
  
  // Set profilesSampleRate to 1.0 to profile 100% of sampled transactions
  // This is relative to tracesSampleRate
  profilesSampleRate: 1.0,
  
  // Add the profiling integration
  integrations: [
    nodeProfilingIntegration(),
  ],
  
  // Optional: Set the environment
  environment: process.env.NODE_ENV || 'development',
});

// RequestHandler creates a separate execution context using domains
app.use(Sentry.setupExpressErrorHandler());

// All your controllers and routes go here
app.get('/', (req, res) => {
  res.json({ message: 'Hello World' });
});

app.get('/debug-sentry', (req, res) => {
  throw new Error('Test Sentry error!');
});

// Example with custom spans
app.get('/heavy', (req, res) => {
  // Start a custom span for the entire operation
  const span = Sentry.startSpan(
    { name: 'heavy-computation', op: 'function' },
    () => {
      // Nested span for calculation
      const calcResult = Sentry.startSpan(
        { name: 'calculate-sqrt', op: 'calculation' },
        () => {
          const result = [];
          for (let i = 0; i < 1000000; i++) {
            result.push(Math.sqrt(i));
          }
          return result;
        }
      );

      // Another nested span for processing
      const processed = Sentry.startSpan(
        { name: 'process-results', op: 'processing' },
        () => {
          return calcResult.filter(x => x > 100);
        }
      );

      return { computed: calcResult.length, filtered: processed.length };
    }
  );

  res.json(span);
});

// Example with async operations and spans
app.get('/api/users/:id', async (req, res) => {
  try {
    // Simulate database query with span
    const user = await Sentry.startSpan(
      { name: 'db.query.user', op: 'db.query' },
      async () => {
        // Simulate DB query
        await new Promise(resolve => setTimeout(resolve, 100));
        return { id: req.params.id, name: 'John Doe' };
      }
    );

    // Simulate external API call with span
    const additionalData = await Sentry.startSpan(
      { name: 'http.client.fetch', op: 'http.client' },
      async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return { credits: 100, level: 5 };
      }
    );

    res.json({ user, additionalData });
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manual span creation with getActiveSpan
app.get('/manual-span', (req, res) => {
  const activeSpan = Sentry.getActiveSpan();
  
  if (activeSpan) {
    // Create child span manually
    const childSpan = activeSpan.startChild({
      op: 'custom.operation',
      description: 'My custom operation'
    });

    // Do some work
    const result = complexOperation();

    // Don't forget to finish the span
    childSpan.finish();

    res.json({ result });
  } else {
    res.json({ result: complexOperation() });
  }
});

function complexOperation() {
  let sum = 0;
  for (let i = 0; i < 100000; i++) {
    sum += i;
  }
  return sum;
}

// The error handler must be registered before any other error middleware
app.use(Sentry.errorHandler());

// Optional fallback error handler
app.use((err, req, res, next) => {
  res.statusCode = 500;
  res.end(res.sentry + '\n');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});