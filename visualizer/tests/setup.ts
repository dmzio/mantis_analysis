import { vi } from 'vitest';
import { processSessionShotVariants } from '../src/shotProcessor';
import { aggregateFields } from '../src/sessionAggregates';
import { computeSessionMetrics } from '../src/sessionMetrics';

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function () {
    const noop = () => undefined;
    const ctx = {
      canvas: this,
      save: noop,
      restore: noop,
      setTransform: noop,
      resetTransform: noop,
      clearRect: noop,
      transform: noop,
      beginPath: noop,
      moveTo: noop,
      lineTo: noop,
      stroke: noop,
      fill: noop,
      arc: noop,
      ellipse: noop,
      fillText: noop,
      translate: noop,
      rotate: noop,
      closePath: noop
    } as CanvasRenderingContext2D;
    return ctx;
  };
}

if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
}
if (!globalThis.URL.revokeObjectURL) {
  globalThis.URL.revokeObjectURL = vi.fn(() => undefined);
}

if (typeof indexedDB === 'undefined') {
  type StoreRecord = Map<IDBValidKey, any>;
  const dbRegistry = new Map<string, { stores: Map<string, StoreRecord> }>();

  const createRequest = <T>() => {
    const req: IDBRequest<T> = {
      result: undefined as unknown as T,
      error: null,
      source: null,
      transaction: null,
      readyState: 'pending',
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      addEventListener() { return undefined as any; },
      removeEventListener() { return undefined as any; },
      dispatchEvent() { return true; }
    };
    return req;
  };

  const fulfill = <T>(req: IDBRequest<T>, result: T) => {
    req.result = result;
    req.readyState = 'done';
    req.onsuccess?.({ target: req } as any);
  };

  class MemoryStore {
    constructor(private store: StoreRecord) {}
    put(value: any) {
      const req = createRequest<IDBValidKey>();
      setTimeout(() => {
        const key = value?.pk ?? crypto.randomUUID();
        this.store.set(key, value);
        fulfill(req, key);
      }, 0);
      return req;
    }
    getAll() {
      const req = createRequest<any[]>();
      setTimeout(() => {
        fulfill(req, Array.from(this.store.values()));
      }, 0);
      return req;
    }
    get(key: IDBValidKey) {
      const req = createRequest<any>();
      setTimeout(() => {
        fulfill(req, this.store.get(key));
      }, 0);
      return req;
    }
    delete(key: IDBValidKey) {
      const req = createRequest<void>();
      setTimeout(() => {
        this.store.delete(key);
        fulfill(req, undefined);
      }, 0);
      return req;
    }
    clear() {
      const req = createRequest<void>();
      setTimeout(() => {
        this.store.clear();
        fulfill(req, undefined);
      }, 0);
      return req;
    }
  }

  class MemoryDB implements IDBDatabase {
    readonly name: string;
    version = 1;
    objectStoreNames: DOMStringList = {
      length: 0,
      contains: () => false,
      item: () => null
    };
    constructor(name: string, private record: { stores: Map<string, StoreRecord> }) {
      this.name = name;
      this.objectStoreNames = {
        length: this.record.stores.size,
        contains: (key: string) => this.record.stores.has(key),
        item: (index: number) => Array.from(this.record.stores.keys())[index] ?? null
      };
    }
    close() {}
    createObjectStore(name: string): IDBObjectStore {
      const store: StoreRecord = new Map();
      this.record.stores.set(name, store);
      return new MemoryStore(store) as unknown as IDBObjectStore;
    }
    deleteObjectStore(name: string): void {
      this.record.stores.delete(name);
    }
    transaction(storeName: string | string[], mode?: IDBTransactionMode): IDBTransaction {
      const names = Array.isArray(storeName) ? storeName : [storeName];
      const stores = names.map(name => new MemoryStore(this.record.stores.get(name) ?? new Map()));
      return {
        db: this as IDBDatabase,
        mode: mode ?? 'readonly',
        objectStore: (name: string) => {
          const store = this.record.stores.get(name);
          if (!store) {
            const newStore: StoreRecord = new Map();
            this.record.stores.set(name, newStore);
            return new MemoryStore(newStore) as unknown as IDBObjectStore;
          }
          return new MemoryStore(store) as unknown as IDBObjectStore;
        },
        abort() {},
        commit() {},
        durability: 'default'
      } as IDBTransaction;
    }
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return true;
    }
  }

  globalThis.indexedDB = {
    open(name: string) {
      const req = createRequest<IDBDatabase>() as IDBOpenDBRequest;
      setTimeout(() => {
        let record = dbRegistry.get(name);
        let needsUpgrade = false;
        if (!record) {
          record = { stores: new Map() };
          dbRegistry.set(name, record);
          needsUpgrade = true;
        }
        const db = new MemoryDB(name, record);
        req.result = db;
        if (needsUpgrade) {
          req.onupgradeneeded?.({ target: req } as any);
        }
        fulfill(req, db);
      }, 0);
      return req;
    }
  } as IDBFactory;
}

vi.mock('../src/workers/sessionWorker?worker', () => {
  class MockWorker {
    onmessage = null as ((event: MessageEvent) => void) | null;
    onerror = null as ((event: ErrorEvent) => void) | null;

    postMessage(message: any) {
      const shots = processSessionShotVariants(message.session.shots || []);
      const stats = {
        original: aggregateFields(shots.original, message.summaryFields),
        corrected: aggregateFields(shots.corrected, message.summaryFields)
      };
      const metrics = {
        original: computeSessionMetrics(shots.original),
        corrected: computeSessionMetrics(shots.corrected)
      };
      const payload = {
        type: 'session-processed',
        requestId: message.requestId,
        sessionPk: message.session.pk,
        shots,
        stats,
        metrics
      };
      setTimeout(() => {
        this.onmessage?.({ data: payload } as MessageEvent);
      }, 0);
    }
  }
  const ctor = vi.fn(() => new MockWorker());
  return { default: ctor };
});
