import { addSessionElapsedTimes, preprocessShot } from '../shotProcessor';
import { aggregateFields } from '../sessionAggregates';
import { computeSessionMetrics } from '../sessionMetrics';

interface ProcessSessionMessage {
  type: 'process-session';
  requestId: number;
  session: any;
  summaryFields: string[];
}

interface SessionProcessedMessage {
  type: 'session-processed';
  requestId: number;
  sessionPk: number;
  shots: ReturnType<typeof preprocessShot>[];
  stats: Record<string, { mean: number; sd: number }>;
  metrics: Record<string, any>;
}

const ctx: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;

ctx.onmessage = event => {
  const msg = event.data as ProcessSessionMessage;
  if (msg.type !== 'process-session') return;
  const session = msg.session || {};
  const pk = session.pk;
  const shots = Array.isArray(session.shots) ? session.shots : [];
  const processed = addSessionElapsedTimes(shots.map((shot: any) => preprocessShot(shot)));
  const stats = aggregateFields(processed, msg.summaryFields);
  const metrics = computeSessionMetrics(processed);
  const payload: SessionProcessedMessage = {
    type: 'session-processed',
    requestId: msg.requestId,
    sessionPk: pk,
    shots: processed,
    stats,
    metrics
  };
  ctx.postMessage(payload);
};
