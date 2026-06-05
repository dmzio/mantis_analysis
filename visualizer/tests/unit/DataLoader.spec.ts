import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ensureDashboardData,
  ensureData,
  ensureSessionData,
  ensureShotData,
  loadFromHandle
} from '../../src/dataLoader';
import store from '../../src/store';
import { getProcessedShots, clearSessionData } from '../../src/sessionData';
import { resetAppSettings } from '../../src/appSettings';
import { resetPerfMetrics, usePerfMetrics } from '../../src/perfMetrics';
import { getHandle } from '../../src/fsHandles';
import { clearCachedSessions, loadCachedData, replaceCachedData } from '../../src/db/cacheDb';
import { resetCacheHydration } from '../../src/cacheBootstrap';

vi.mock('../../src/fsHandles', () => ({
  getHandle: vi.fn(),
  saveHandle: vi.fn(),
  clearHandle: vi.fn()
}));

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
  beforeEach(async () => {
    store.sessions = {};
    store.aggregates = {};
    store.photos = {};
    store.folder = '';
    store.handle = null;
    store.loader.total = 0;
    store.loader.processed = 0;
    store.loader.pending = 0;
    store.loader.active = false;
    store.loader.message = '';
    store.loader.currentPk = null;
    store.loader.inFlight = 0;
    store.loading = false;
    clearSessionData();
    resetCacheHydration();
    await clearCachedSessions();
    resetPerfMetrics();
    resetAppSettings();
    vi.mocked(getHandle).mockReset();
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

  it('keeps dashboard data buffered while import progress is active', async () => {
    let releaseSecondFile: () => void = () => {};
    const secondFileReady = new Promise<void>(resolve => {
      releaseSecondFile = resolve;
    });
    const fh1 = makeFileHandle(1);
    const fh2 = {
      kind: 'file',
      name: '2.json',
      getFile: vi.fn(async () => {
        await secondFileReady;
        return {
          text: vi.fn(() => Promise.resolve(JSON.stringify({ pk: 2, shots: [] })))
        };
      })
    };
    const handle = {
      name: 'sessions',
      async *values() {
        yield fh1;
        yield fh2;
      },
      getDirectoryHandle: vi.fn()
    };

    const loading = loadFromHandle(handle as any);
    await vi.waitFor(() => {
      expect(store.loader.processed).toBe(1);
    });

    expect(store.loading).toBe(true);
    expect(store.loader.message).toBe('Processing 1/2');
    expect(Object.keys(store.sessions)).toEqual([]);
    expect(await loadCachedData()).toEqual({ sessions: [], shots: [], manifest: null });

    releaseSecondFile();
    await loading;

    expect(Object.keys(store.sessions)).toEqual(['1', '2']);
    const cached = await loadCachedData();
    expect(cached.sessions.map(record => record.pk).sort()).toEqual([1, 2]);
    expect(cached.shots.map(record => record.pk).sort()).toEqual([1, 2]);
    expect(store.loader.active).toBe(false);
    expect(store.loading).toBe(false);
    expect(usePerfMetrics().summary['loader:publishDashboard']?.count).toBe(1);
  });

  it('shows loading state while a saved folder is being scanned', async () => {
    let scanStarted = false;
    let releaseScan: () => void = () => {};
    const scanReady = new Promise<void>(resolve => {
      releaseScan = resolve;
    });
    const handle = {
      name: 'sessions',
      async *values() {
        scanStarted = true;
        await scanReady;
        yield makeFileHandle(1);
      },
      getDirectoryHandle: vi.fn()
    };
    const loading = loadFromHandle(handle as any);

    try {
      await vi.waitFor(() => {
        expect(scanStarted).toBe(true);
      });
      expect(store.loading).toBe(true);
      expect(store.loader.active).toBe(true);
      expect(store.loader.message).toBe('Scanning sessions');
      expect(Object.keys(store.sessions)).toEqual([]);
    } finally {
      releaseScan();
      await loading;
    }
  });

  it('shows loading state while saved folder access is being restored', async () => {
    store.folder = 'sessions';
    let releaseHandle: (handle: FileSystemDirectoryHandle | null) => void = () => {};
    const handleReady = new Promise<FileSystemDirectoryHandle | null>(resolve => {
      releaseHandle = resolve;
    });
    vi.mocked(getHandle).mockReturnValue(handleReady);

    const loading = ensureData();
    await vi.waitFor(() => {
      expect(getHandle).toHaveBeenCalled();
    });

    expect(store.loading).toBe(true);
    expect(store.loader.active).toBe(true);
    expect(store.loader.message).toBe('Restoring sessions');

    releaseHandle(null);
    await expect(loading).resolves.toBe(false);
    expect(store.loading).toBe(false);
    expect(store.loader.active).toBe(false);
  });

  it('restores one cached session without requiring the whole dashboard dataset', async () => {
    await replaceCachedData(
      [
        { pk: 1, meta: { pk: 1, ready: true, shot_count: 1 } },
        { pk: 2, meta: { pk: 2, ready: true, shot_count: 1 } }
      ],
      [
        { pk: 1, shots: { original: [{ pk: 11, pitch: [0], yaw: [0] }], corrected: [{ pk: 11, pitch: [0], yaw: [0] }], drift: null } },
        { pk: 2, shots: { original: [{ pk: 21, pitch: [0], yaw: [0] }], corrected: [{ pk: 21, pitch: [0], yaw: [0] }], drift: null } }
      ]
    );

    const result = await ensureSessionData(2);

    expect(result.status).toBe('ready');
    expect(Object.keys(store.sessions)).toEqual(['2']);
    expect(getProcessedShots(2)).toHaveLength(1);
    expect(getProcessedShots(1)).toHaveLength(0);
    expect(getHandle).not.toHaveBeenCalled();
  });

  it('processes only the requested session from a saved folder for direct navigation', async () => {
    store.folder = 'sessions';
    const fh1 = makeFileHandle(1, [{ pk: 11, pitch: [0, 0.1], yaw: [0, 0.1], shot_index: 1 }]);
    const fh2 = makeFileHandle(2, [{ pk: 21, pitch: [0, 0.2], yaw: [0, 0.2], shot_index: 1 }]);
    const photoFile = {
      name: '2.png',
      arrayBuffer: vi.fn(),
      stream: vi.fn(),
      text: vi.fn(),
      type: 'image/png'
    };
    const photoHandle = {
      kind: 'file',
      name: '2.png',
      getFile: vi.fn(() => Promise.resolve(photoFile as unknown as File))
    };
    const handle = {
      name: 'sessions',
      queryPermission: vi.fn(() => Promise.resolve('granted')),
      async *values() {
        yield fh1;
        yield fh2;
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
    vi.mocked(getHandle).mockResolvedValue(handle as any);

    const result = await ensureSessionData(2);

    expect(result.status).toBe('ready');
    expect(Object.keys(store.sessions)).toEqual(['2']);
    expect(getProcessedShots(2)).toHaveLength(1);
    expect(getProcessedShots(1)).toHaveLength(0);
    expect(fh1.getFile).not.toHaveBeenCalled();
    expect(fh2.getFile).toHaveBeenCalled();
    expect(photoHandle.getFile).toHaveBeenCalled();
    expect(store.photos[2]).toBeDefined();
  });

  it('loads a cached session photo from the saved folder handle without restoring the full dashboard', async () => {
    await replaceCachedData(
      [{ pk: 4, meta: { pk: 4, ready: true, shot_count: 1 } }],
      [{ pk: 4, shots: { original: [{ pk: 41, pitch: [0], yaw: [0] }], corrected: [{ pk: 41, pitch: [0], yaw: [0] }], drift: null } }]
    );
    store.folder = 'sessions';
    const photoHandle = {
      kind: 'file',
      name: '4.png',
      getFile: vi.fn(() =>
        Promise.resolve({
          name: '4.png',
          arrayBuffer: vi.fn(),
          stream: vi.fn(),
          text: vi.fn(),
          type: 'image/png'
        } as unknown as File)
      )
    };
    const handle = {
      name: 'sessions',
      queryPermission: vi.fn(() => Promise.resolve('granted')),
      async *values() {
        throw new Error('session JSON should not be scanned');
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
    vi.mocked(getHandle).mockResolvedValue(handle as any);

    const result = await ensureSessionData(4);

    expect(result.status).toBe('ready');
    expect(Object.keys(store.sessions)).toEqual(['4']);
    expect(getProcessedShots(4)).toHaveLength(1);
    expect(photoHandle.getFile).toHaveBeenCalled();
    expect(store.photos[4]).toBeDefined();
  });

  it('reports that direct session navigation needs user action when cache and permission are missing', async () => {
    store.folder = 'sessions';
    const handle = {
      name: 'sessions',
      queryPermission: vi.fn(() => Promise.resolve('prompt'))
    };
    vi.mocked(getHandle).mockResolvedValue(handle as any);

    const result = await ensureSessionData(123);

    expect(result.status).toBe('needs-user-action');
    expect(result.message).toContain('Select');
    expect(store.loading).toBe(false);
    expect(Object.keys(store.sessions)).toEqual([]);
  });

  it('validates a shot deep link after restoring its session', async () => {
    await replaceCachedData(
      [{ pk: 7, meta: { pk: 7, ready: true, shot_count: 1 } }],
      [{ pk: 7, shots: { original: [{ pk: 71, pitch: [0], yaw: [0] }], corrected: [{ pk: 71, pitch: [0], yaw: [0] }], drift: null } }]
    );

    await expect(ensureShotData(7, 71)).resolves.toMatchObject({ status: 'ready' });
    await expect(ensureShotData(7, 999)).resolves.toMatchObject({ status: 'missing-shot' });
  });

  it('keeps cached dashboard data visible while background refresh is optional', async () => {
    await replaceCachedData(
      [{ pk: 3, meta: { pk: 3, ready: true, shot_count: 1 } }],
      [{ pk: 3, shots: { original: [{ pk: 31, pitch: [0], yaw: [0] }], corrected: [{ pk: 31, pitch: [0], yaw: [0] }], drift: null } }]
    );
    store.folder = 'sessions';

    const result = await ensureDashboardData();

    expect(result.status).toBe('ready');
    expect(Object.keys(store.sessions)).toEqual(['3']);
    expect(getProcessedShots(3)).toHaveLength(1);
    expect(getHandle).not.toHaveBeenCalled();
  });
});
