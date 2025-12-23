import { Prisma } from '@prisma/client';

export type FlowContextStepAttempts = Record<string, number>;
export type FlowCollectedData = Record<string, any>;

export interface FlowExecutionContext {
  phoneNumber: string;
  sessionId: string;
  collectedData: FlowCollectedData;
  currentStepId: string;
  flowId: string;
  flowRunId?: string;
  stepAttempts?: FlowContextStepAttempts;
}

export type FlowContextSnapshot = Record<string, any> & {
  flowId: string;
  currentStepId: string;
  collectedData: Record<string, any>;
  flowRunId?: string;
  phoneNumber: string;
  sessionId: string;
  stepAttempts: FlowContextStepAttempts;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toJsonClone = (value: unknown): unknown => {
  try {
    const serialized = JSON.stringify(value);
    if (typeof serialized !== 'string') {
      return null;
    }
    return JSON.parse(serialized);
  } catch (error) {
    return null;
  }
};

const toJsonValue = (value: unknown): any => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => toJsonValue(item));
  }

  if (isRecord(value)) {
    const result: Record<string, any> = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = toJsonValue(item);
    }
    return result;
  }

  const cloned = toJsonClone(value);
  if (cloned === null || cloned === undefined) {
    return null;
  }

  return toJsonValue(cloned);
};

export const serializeJsonObject = (
  value: Record<string, unknown> | null | undefined,
): Record<string, any> => {
  if (!value) {
    return {};
  }

  if (isRecord(value) && Object.values(value).every(item => item !== undefined)) {
    const record: Record<string, any> = {};
    for (const [key, item] of Object.entries(value)) {
      record[key] = toJsonValue(item);
    }
    return record;
  }

  const cloned = toJsonClone(value);
  if (!isRecord(cloned)) {
    return {};
  }

  const record: Record<string, any> = {};
  for (const [key, item] of Object.entries(cloned)) {
    record[key] = toJsonValue(item);
  }
  return record;
};

export const serializeCollectedData = (
  data: FlowCollectedData | null | undefined,
): Record<string, any> => serializeJsonObject(data ?? {});

export const serializeFlowContext = (context: FlowExecutionContext): FlowContextSnapshot => ({
  flowId: context.flowId,
  currentStepId: context.currentStepId,
  collectedData: serializeCollectedData(context.collectedData),
  flowRunId: context.flowRunId,
  phoneNumber: context.phoneNumber,
  sessionId: context.sessionId,
  stepAttempts: { ...(context.stepAttempts ?? {}) },
});

export const deserializeFlowContext = (
  value: unknown,
): FlowExecutionContext | null => {
  if (!isRecord(value)) {
    return null;
  }

  const {
    flowId,
    currentStepId,
    collectedData,
    flowRunId,
    phoneNumber,
    sessionId,
    stepAttempts,
  } = value;

  if (typeof flowId !== 'string' || typeof currentStepId !== 'string') {
    return null;
  }

  if (typeof phoneNumber !== 'string' || typeof sessionId !== 'string') {
    return null;
  }

  const parsedCollectedData = serializeCollectedData(
    isRecord(collectedData) ? (collectedData as FlowCollectedData) : {},
  );

  let parsedStepAttempts: FlowContextStepAttempts | undefined;
  if (isRecord(stepAttempts)) {
    parsedStepAttempts = {};
    for (const [key, count] of Object.entries(stepAttempts)) {
      if (typeof count === 'number' && Number.isFinite(count)) {
        parsedStepAttempts[key] = count;
      }
    }
  }

  return {
    flowId,
    currentStepId,
    collectedData: parsedCollectedData,
    flowRunId: typeof flowRunId === 'string' ? flowRunId : undefined,
    phoneNumber,
    sessionId,
    stepAttempts: parsedStepAttempts,
  };
};

export const serializeCheckpointState = (
  context: FlowExecutionContext,
): Record<string, any> =>
  serializeJsonObject({
    flowContext: serializeFlowContext(context),
  });

export const serializeJsonValue = toJsonValue;
