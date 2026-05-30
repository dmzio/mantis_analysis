import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadFromHandle } from '../../src/dataLoader';
import store from '../../src/store';
import { getProcessedShots, clearSessionData } from '../../src/sessionData';
import { resetAppSettings } from '../../src/appSettings';

function makeFileHandle(pk: number, shots: any[] = []) {
  return {
    kind: 'file',
    name: `${pk}.json`,
    getFile: vi.fn(() =>
      Promise.resolve({
        text: vi.fn(() => Promise.resolve(JSON.stringify({ pk, shots })))
      })
    )
  };
}

describe('loadFromHandle', () => {
  beforeEach(() => {
    store.sessions = {};
    store.aggregates = {};
    store.photos = {};
    store.loader.total = 0;
    store.loader.processed = 0;
    store.loader.pending = 0;
    store.loader.active = false;
    store.loader.message = '';
    store.loader.currentPk = null;
    store.loader.inFlight = 0;
    store.loading = false;
    clearSessionData();
    resetAppSettings();
    if (!URL.createObjectURL) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      URL.createObjectURL = vi.fn(() => 'blob:test');
    }
  });

  it('processes sessions and caches processed shots', async () => {
    const fh1 = makeFileHandle(1, [{ pitch: [0, 0.1], yaw: [0, 0.2], shot_index: 1 }]);
    const fh2 = makeFileHandle(2, [{ pitch: [0.2, 0.3], yaw: [0.1, 0.4], shot_index: 1 }]);
    const handle = {
      name: 'sessions',
      async *values() {
        yield fh1;
        yield fh2;
      },
      getDirectoryHandle: vi.fn()
    };

    await loadFromHandle(handle as any);
    await new Promise(resolve => setTimeout(resolve));
    expect(Object.keys(store.sessions)).toEqual(['1', '2']);
    expect(store.sessions[1].ready).toBe(true);
    expect(store.sessions[2].ready).toBe(true);
    expect(store.loader.active).toBe(false);
    const shots1 = getProcessedShots(1);
    expect(shots1).toHaveLength(1);
    expect(shots1[0].rel_pitch_moa).toBeDefined();
  });

  it('stores selectable original and corrected shot variants', async () => {
    const pitch = Array.from({ length: 800 }, (_, index) => index / 400);
    const yaw = Array.from({ length: 800 }, (_, index) => index / 800);
    const shot = {
      pk: 11,
      pitch,
      yaw,
      sample_rate: 200,
      hold_index: 200,
      pull_index: 600,
      shot_index: 700
    };
    const fh = makeFileHandle(9, [shot]);
    const handle = {
      name: 'sessions',
      async *values() {
        yield fh;
      },
      getDirectoryHandle: vi.fn()
    };

    await loadFromHandle(handle as any);
    await new Promise(resolve => setTimeout(resolve));
    expect(getProcessedShots(9, 'original')[0].drift_correction).toBeUndefined();
    expect(getProcessedShots(9, 'corrected')[0].drift_correction).toBeTruthy();
    expect(getProcessedShots(9)[0].drift_correction).toBeTruthy();
  });

  it('loads session photos when directory is present', async () => {
    const jsonHandle = makeFileHandle(5);
    const photoFile = {
      name: '5.jpg',
      arrayBuffer: vi.fn(),
      stream: vi.fn(),
      text: vi.fn(),
      type: 'image/jpeg'
    };
    const photoHandle = {
      kind: 'file',
      name: '5.jpg',
      getFile: vi.fn(() => Promise.resolve(photoFile as unknown as File))
    };
    const handle = {
      name: 'sessions',
      async *values() {
        yield jsonHandle;
      },
      async getDirectoryHandle(name: string) {
        if (name === 'session_photo') {
          return {
            async *values() {
              yield photoHandle;
            }
          };
        }
        throw new Error('missing');
      }
    };

    await loadFromHandle(handle as any);
    expect(store.photos[5]).toBeDefined();
  });
});
