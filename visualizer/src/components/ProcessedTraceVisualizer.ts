import { createTraceVisualizer } from './TraceVisualizerBase';
import { ProcessedShot } from '../shotProcessor';
import { ShotData } from '../traceUtils';

function prepare(shots: ProcessedShot[]): ShotData[] {
  return shots.map(s => {
    const start = s.start_index ?? 0;
    const pitch = (s.rel_pitch_moa || []).slice(start);
    const yaw = (s.rel_yaw_moa || []).slice(start);
    return {
      pitch,
      yaw,
      pull_index: (s.pull_index_calc ?? 0) - start,
      shot_index: (s.shot_index ?? pitch.length - 1) - start,
      sample_rate: s.sample_rate
    } as ShotData;
  });
}

export default createTraceVisualizer<ProcessedShot>('ProcessedTraceVisualizer', prepare, true);
