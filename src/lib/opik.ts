import { Opik } from "opik";

type OpikEntity = {
  update?: (updates: Record<string, unknown>) => unknown;
  end?: () => unknown;
};

type OpikTraceEntity = OpikEntity & {
  span?: (spanData: Record<string, unknown>) => OpikEntity | null | undefined;
};

let cachedClient: Opik | null | undefined;

function isBlank(value: string | undefined) {
  return !value || !value.trim();
}

function toOpikJson(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  try {
    return JSON.parse(JSON.stringify(value)) as unknown;
  } catch {
    return {
      value: String(value),
    };
  }
}

export function getOpikClient() {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  if (isBlank(process.env.OPIK_API_KEY)) {
    cachedClient = null;
    return cachedClient;
  }

  try {
    cachedClient = new Opik({
      apiKey: process.env.OPIK_API_KEY,
      apiUrl: process.env.OPIK_URL_OVERRIDE ?? "https://www.comet.com/opik/api",
      projectName: process.env.OPIK_PROJECT_NAME ?? "konsensus",
      workspaceName: isBlank(process.env.OPIK_WORKSPACE)
        ? "default"
        : process.env.OPIK_WORKSPACE!,
    });
  } catch {
    cachedClient = null;
  }

  return cachedClient;
}

export function startOpikTrace(traceData: {
  name: string;
  input?: unknown;
  metadata?: unknown;
  tags?: string[];
}) {
  try {
    return (
      getOpikClient()?.trace({
        ...traceData,
        input: toOpikJson(traceData.input) as never,
        metadata: toOpikJson(traceData.metadata) as never,
        startTime: new Date(),
      }) ?? null
    ) as OpikTraceEntity | null;
  } catch {
    return null;
  }
}

export function startOpikSpan(
  trace: OpikTraceEntity | null,
  spanData: {
    name: string;
    type?: "general" | "llm" | "tool";
    input?: unknown;
    metadata?: unknown;
    model?: string;
    provider?: string;
    tags?: string[];
  }
) {
  try {
    return (
      trace?.span?.({
        ...spanData,
        input: toOpikJson(spanData.input) as never,
        metadata: toOpikJson(spanData.metadata) as never,
        startTime: new Date(),
      }) ?? null
    ) as OpikEntity | null;
  } catch {
    return null;
  }
}

export function updateOpikEntity(
  entity: OpikEntity | null,
  updates: Record<string, unknown>
) {
  try {
    entity?.update?.(updates);
  } catch {
    // Opik must stay non-blocking for product flows.
  }
}

export function endOpikEntity(entity: OpikEntity | null) {
  try {
    entity?.end?.();
  } catch {
    // Ignore telemetry shutdown issues.
  }
}

export function getOpikErrorInfo(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      exceptionType: error.name,
      traceback: error.stack ?? "",
    };
  }

  return {
    message: String(error),
    exceptionType: "UnknownError",
    traceback: "",
  };
}
