import { createTraceVisualizer } from './TraceVisualizerBase';
import { ProcessedShot } from '../shotProcessor';
import { ShotData } from '../traceUtils';

function prepare(shots: ProcessedShot[]): ShotData[] {
  return shots.map(s => {
    const start = s.start_index ?? 0;
    const pitch = (s.rel_pitch_moa || []).slice(start);
    const yaw = (s.rel_yaw_moa || []).slice(start);
    const holdEllipse = s.hold_ellipse
      ? { major: s.hold_ellipse.major_moa, minor: s.hold_ellipse.minor_moa, angle: s.hold_ellipse.angle_deg }
      : (s.ellipse_major_moa && s.ellipse_minor_moa
        ? { major: s.ellipse_major_moa, minor: s.ellipse_minor_moa, angle: s.ellipse_angle_deg ?? 0 }
        : null);
    return {
      pitch,
      yaw,
      pull_index: (s.pull_index_calc ?? 0) - start,
      shot_index: (s.shot_index ?? pitch.length - 1) - start,
      sample_rate: s.sample_rate,
      holdEllipse,
      impactYaw: s.impact_yaw_moa,
      impactPitch: s.impact_pitch_moa
    } as ShotData;
  });
}

export default createTraceVisualizer<ProcessedShot>('ProcessedTraceVisualizer', prepare, true);
