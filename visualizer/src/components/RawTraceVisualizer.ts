import { createTraceVisualizer } from './TraceVisualizerBase';
import { ShotData } from '../traceUtils';
import { getHoldCenter } from '../shotProcessor';

function prepare(shots: ShotData[]): ShotData[] {
  return shots.map(s => {
    if (!s.pitch || !s.yaw) return s;
    const center = getHoldCenter(s);
    const pitch = s.pitch.map(p => p - center.pitch);
    const yaw = s.yaw.map(y => y - center.yaw);
    return { ...s, pitch, yaw };
  });
}

export default createTraceVisualizer<ShotData>('RawTraceVisualizer', prepare, false);
