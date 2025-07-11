import { createTraceVisualizer } from './TraceVisualizerBase';
import { ShotData } from '../traceUtils';

function prepare(shots: ShotData[]): ShotData[] {
  return shots.map(s => {
    if (!s.pitch || !s.yaw) return s;
    const basePitch = s.pitch[s.hold_index ?? 0] ?? s.pitch[0];
    const baseYaw = s.yaw[s.hold_index ?? 0] ?? s.yaw[0];
    const pitch = s.pitch.map(p => p - basePitch);
    const yaw = s.yaw.map(y => y - baseYaw);
    return { ...s, pitch, yaw };
  });
}

export default createTraceVisualizer<ShotData>('RawTraceVisualizer', prepare);
