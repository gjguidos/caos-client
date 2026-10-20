# Logging Utility

Centralized logging utility for the AgentVerse client application with environment-based control.

## Configuration

Control logging via the `NEXT_PUBLIC_ENABLE_LOGGING` environment variable:

- `'true'` = All logs enabled (debug, info, warnings, errors)
- `'false'` or unset = Only warnings and errors (production mode)

### Setup

Add to your `.env.local`:

```env
# Enable all logs for local development
NEXT_PUBLIC_ENABLE_LOGGING=true
```

For production environments, set to `false` or omit the variable entirely.

## Usage

```typescript
import { logger } from "@/utils/logger";

// Debug logs - only shown when ENABLE_LOGGING=true
logger.debug("WebSocket connection details:", connectionData);

// Info logs - only shown when ENABLE_LOGGING=true
logger.info("WebSocket connected successfully");

// Warning logs - always shown (non-critical issues)
logger.warn("WebSocket token fetch failed:", status);

// Error logs - always shown (critical errors)
logger.error("OAuth callback error:", error);
```

## Log Levels

| Level | Method           | When Shown                      | Use For                                                         |
| ----- | ---------------- | ------------------------------- | --------------------------------------------------------------- |
| DEBUG | `logger.debug()` | Only when `ENABLE_LOGGING=true` | Detailed debugging information, connection details, state dumps |
| INFO  | `logger.info()`  | Only when `ENABLE_LOGGING=true` | General informational messages, successful operations           |
| WARN  | `logger.warn()`  | Always                          | Non-critical issues that should be investigated                 |
| ERROR | `logger.error()` | Always                          | Errors and exceptions that need immediate attention             |

## Benefits

✅ **Single source of truth** - All logging controlled from one place  
✅ **Environment-aware** - Automatically adjusts based on environment  
✅ **Production-safe** - Critical logs (errors/warnings) always visible  
✅ **Debug-friendly** - Detailed logs available when needed  
✅ **Type-safe** - Full TypeScript support  
✅ **Performance** - Debug/info logs completely removed in production builds

## Migration

Replace existing console statements:

```typescript
// Before
console.log("Debug info", data);
console.info("Info message");
console.warn("Warning");
console.error("Error", error);

// After
logger.debug("Debug info", data);
logger.info("Info message");
logger.warn("Warning");
logger.error("Error", error);
```

## Examples

### API Routes (Server-side)

```typescript
import { logger } from "@/utils/logger";

export async function GET(req: Request) {
  try {
    logger.debug("Processing request", { url: req.url });
    // ... process request
    logger.info("Request successful");
  } catch (error) {
    logger.error("Request failed", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

### Client Components

```typescript
import { logger } from "@/utils/logger";

export default function ChatPage() {
  const connectWebSocket = () => {
    logger.debug("WebSocket URL:", wsUrl);

    ws.onopen = () => {
      logger.info("WebSocket connected");
    };

    ws.onerror = (error) => {
      logger.error("WebSocket error:", error);
    };
  };
}
```

## Environment Variables

| Variable                     | Values                | Default | Description                        |
| ---------------------------- | --------------------- | ------- | ---------------------------------- |
| `NEXT_PUBLIC_ENABLE_LOGGING` | `'true'` \| `'false'` | `false` | Enable/disable debug and info logs |
