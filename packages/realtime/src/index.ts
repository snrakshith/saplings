import { AckWindow } from './ack.js';
export * from './ack.js';
import type { EventJournal } from './journal.js';
export * from './journal.js';
import type { ConnectionAdmission } from './admission.js';
export * from './admission.js';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { Duplex } from 'node:stream';
export interface Principal {
  tenantId: string;
  userId: string;
  roles?: string[];
  permissions?: string[];
}
export interface RealtimeEvent {
  id: string;
  channel: string;
  tenantId: string;
  at: string;
  data: unknown;
}
export interface Broker {
  publish(topic: string, event: RealtimeEvent): Promise<void>;
  subscribe(
    topic: string,
    listener: (event: RealtimeEvent) => void,
  ): Promise<() => void | Promise<void>>;
  close?(): Promise<void>;
}
export class LocalBroker implements Broker {
  private topics = new Map<string, Set<(e: RealtimeEvent) => void>>();
  async publish(topic: string, event: RealtimeEvent) {
    for (const f of [...(this.topics.get(topic) ?? [])])
      try {
        f(structuredClone(event));
      } catch {
        /* isolate listeners */
      }
  }
  async subscribe(topic: string, f: (e: RealtimeEvent) => void) {
    const listeners = this.topics.get(topic) ?? new Set();
    listeners.add(f);
    this.topics.set(topic, listeners);
    return () => {
      listeners.delete(f);
      if (!listeners.size) this.topics.delete(topic);
    };
  }
  async close() {
    this.topics.clear();
  }
}
export interface RedisPublisher {
  publish(channel: string, message: string): Promise<unknown>;
}
export interface RedisSubscriber {
  subscribe(channel: string, listener: (message: string) => void): Promise<unknown>;
  unsubscribe(channel: string, listener: (message: string) => void): Promise<unknown>;
}
/** Pass a dedicated connected subscriber (node-redis compatible) and a publisher. Pub/Sub is ephemeral. */
export class RedisBroker implements Broker {
  constructor(
    private publisher: RedisPublisher,
    private subscriber: RedisSubscriber,
    private prefix = 'sapling:realtime:',
    private maxBytes = 65536,
  ) {}
  async publish(topic: string, event: RealtimeEvent) {
    const raw = JSON.stringify(event);
    if (Buffer.byteLength(raw) > this.maxBytes) throw Error('Event too large');
    await this.publisher.publish(this.prefix + topic, raw);
  }
  async subscribe(topic: string, listener: (e: RealtimeEvent) => void) {
    const f = (raw: string) => {
      try {
        if (Buffer.byteLength(raw) > this.maxBytes) return;
        const e = JSON.parse(raw);
        if (
          e &&
          typeof e.id === 'string' &&
          typeof e.at === 'string' &&
          typeof e.channel === 'string' &&
          typeof e.tenantId === 'string'
        )
          listener(e);
      } catch {
        /* malformed broker message */
      }
    };
    await this.subscriber.subscribe(this.prefix + topic, f);
    return async () => {
      await this.subscriber.unsubscribe(this.prefix + topic, f);
    };
  }
}
export interface RealtimeConfig {
  enabled?: boolean;
  ackWindow?: number;
  admission?: ConnectionAdmission;
  validateSession?: (principal: Principal) => boolean | Promise<boolean>;
  recheckMs?: number;
  broker?: Broker;
  journal?: EventJournal;
  replayPollMs?: number;
  replayBatchSize?: number;
  allowedOrigins?: string[];
  allowNoOrigin?: boolean;
  maxConnections?: number;
  maxSubscriptions?: number;
  maxMessageBytes?: number;
  heartbeatMs?: number;
  sessionTtlMs?: number;
  authTimeoutMs?: number;
  authenticate?: (
    request: IncomingMessage,
    credentials?: unknown,
  ) => Principal | undefined | Promise<Principal | undefined>;
  authorize?: (
    principal: Principal,
    channel: string,
    action: 'subscribe' | 'publish',
  ) => boolean | Promise<boolean>;
  onError?: (error: unknown) => void;
}
export class ReplayGapError extends Error {
  constructor() {
    super('Replay cursor expired or unknown; resynchronize state');
    this.name = 'ReplayGapError';
  }
}
const identifier = (v: string) =>
  typeof v === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(v) && !v.startsWith('__sapling_');
const topic = (tenant: string, channel: string) =>
  `${encodeURIComponent(tenant)}/${encodeURIComponent(channel)}`;
const isPrincipal = (p: Principal | undefined): p is Principal =>
  !!p && identifier(p.tenantId) && identifier(p.userId);
const bounded = async <T>(value: Promise<T>, ms: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      value,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(Error('Realtime authorization timeout')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};
export interface Connection {
  ack?(channel: string, id: string): string;
  subscribe(channel: string, after?: string): Promise<void>;
  unsubscribe(channel: string): Promise<void>;
  close(): Promise<void>;
}
export class RealtimeHub {
  readonly settings: Required<
    Pick<
      RealtimeConfig,
      | 'maxConnections'
      | 'maxSubscriptions'
      | 'maxMessageBytes'
      | 'heartbeatMs'
      | 'sessionTtlMs'
      | 'authTimeoutMs'
    >
  >;
  private broker: Broker;
  private sessions = new Set<Connection>();
  private closed = false;
  constructor(readonly config: RealtimeConfig) {
    this.settings = {
      maxConnections: config.maxConnections ?? 1000,
      maxSubscriptions: config.maxSubscriptions ?? 16,
      maxMessageBytes: config.maxMessageBytes ?? 65536,
      heartbeatMs: config.heartbeatMs ?? 15000,
      sessionTtlMs: config.sessionTtlMs ?? 300000,
      authTimeoutMs: config.authTimeoutMs ?? 5000,
    };
    for (const n of Object.values(this.settings))
      if (!Number.isSafeInteger(n) || n < 1) throw Error('Invalid realtime limits');
    if (config.enabled !== false && (!config.authenticate || !config.authorize))
      throw Error('Realtime requires authentication and channel authorization');
    if (
      config.recheckMs !== undefined &&
      (!Number.isSafeInteger(config.recheckMs) || config.recheckMs < 25 || config.recheckMs > 60000)
    )
      throw Error('Invalid session recheck interval');
    this.broker = config.broker ?? new LocalBroker();
    if (config.journal) {
      for (const [v, min, max] of [
        [config.replayPollMs ?? 250, 25, 60000],
        [config.replayBatchSize ?? 16, 1, 500],
      ])
        if (!Number.isSafeInteger(v) || v < min || v > max) throw Error('Invalid replay limits');
    }
  }
  originAllowed(request: IncomingMessage) {
    const origin = request.headers.origin;
    return typeof origin === 'string'
      ? this.config.allowedOrigins?.includes(origin) === true
      : this.config.allowNoOrigin === true;
  }
  async authenticate(request: IncomingMessage, credentials?: unknown) {
    if (this.closed || this.config.enabled === false || !this.originAllowed(request))
      throw Error('Realtime connection denied');
    const p = await bounded(
      Promise.resolve(this.config.authenticate?.(request, credentials)),
      this.settings.authTimeoutMs,
    );
    if (!isPrincipal(p)) throw Error('Realtime authentication required');
    return structuredClone(p);
  }
  private async checkSession(p: Principal) {
    if (
      this.config.validateSession &&
      !(await bounded(Promise.resolve(this.config.validateSession(p)), this.settings.authTimeoutMs))
    )
      throw Error('Realtime session revoked');
  }
  private async authorized(p: Principal, channel: string, action: 'subscribe' | 'publish') {
    await this.checkSession(p);
    if (
      !identifier(channel) ||
      !isPrincipal(p) ||
      !(await bounded(
        Promise.resolve(this.config.authorize?.(p, channel, action)),
        this.settings.authTimeoutMs,
      ))
    )
      throw Error('Realtime channel denied');
  }
  async publish(p: Principal, channel: string, data: unknown) {
    if (this.closed || this.config.enabled === false) throw Error('Realtime disabled');
    await this.authorized(p, channel, 'publish');
    const event: RealtimeEvent = {
      id: randomUUID(),
      channel,
      tenantId: p.tenantId,
      at: new Date().toISOString(),
      data,
    };
    const raw = JSON.stringify(event);
    if (Buffer.byteLength(raw) > this.settings.maxMessageBytes)
      throw Error('Realtime message too large');
    if (this.config.journal)
      return bounded(
        this.config.journal.append(topic(p.tenantId, channel), JSON.parse(raw)),
        this.settings.authTimeoutMs,
      );
    await this.broker.publish(topic(p.tenantId, channel), JSON.parse(raw));
    return event.id;
  }
  connect(p: Principal, send: (e: RealtimeEvent) => void, terminate: () => void): Connection {
    if (this.config.admission || this.config.validateSession)
      throw Error('Use open() with distributed admission or session validation');
    return this.connectLocal(p, send, terminate);
  }
  async open(
    p: Principal,
    send: (e: RealtimeEvent) => void,
    terminate: () => void,
  ): Promise<Connection> {
    if (this.closed || this.config.enabled === false || !isPrincipal(p))
      throw Error('Realtime connection denied');
    p = structuredClone(p);
    await this.checkSession(p);
    let release: (() => Promise<void>) | undefined;
    if (this.config.admission) {
      release = await bounded(
        this.config.admission.acquire(p, this.settings.sessionTtlMs + this.settings.authTimeoutMs),
        this.settings.authTimeoutMs,
      );
      if (!release) throw Error('Distributed connection limit');
    }
    try {
      return this.connectLocal(p, send, terminate, release);
    } catch (e) {
      await release?.();
      throw e;
    }
  }
  private connectLocal(
    p: Principal,
    send: (e: RealtimeEvent) => void,
    terminate: () => void,
    release?: () => Promise<void>,
  ): Connection {
    if (
      this.closed ||
      this.config.enabled === false ||
      !isPrincipal(p) ||
      this.sessions.size >= this.settings.maxConnections
    )
      throw Error('Realtime connection limit or invalid principal');
    p = structuredClone(p);
    let closed = false;
    const subscriptions = new Map<string, () => void | Promise<void>>(),
      pending = new Set<string>();
    let timer: ReturnType<typeof setTimeout>;
    let recheck: ReturnType<typeof setTimeout> | undefined;
    const ackWindow =
      this.config.ackWindow === undefined ? undefined : new AckWindow(this.config.ackWindow);
    const session: Connection = {
      ack: ackWindow ? (channel, id) => ackWindow.ack(channel, id) : undefined,
      subscribe: async (channel, after) => {
        if (closed) throw Error('Connection closed');
        if (after !== undefined && (typeof after !== 'string' || after.length > 128))
          throw Error('Invalid replay cursor');
        if (subscriptions.has(channel) || pending.has(channel)) return;
        if (subscriptions.size + pending.size >= this.settings.maxSubscriptions)
          throw Error('Subscription limit');
        pending.add(channel);
        try {
          await this.authorized(p, channel, 'subscribe');
          if (closed) throw Error('Connection closed');
          const deliver = (e: RealtimeEvent) => {
            if (!closed && e.tenantId === p.tenantId && e.channel === channel)
              try {
                ackWindow?.sent(e);
                send(e);
              } catch {
                void session.close();
              }
          };
          const journal = this.config.journal;
          let off: () => void | Promise<void>;
          if (journal) {
            const key = topic(p.tenantId, channel),
              ms = this.config.replayPollMs ?? 250,
              batch = this.config.replayBatchSize ?? 16;
            let cursor = after ?? (await bounded(journal.tail(key), this.settings.authTimeoutMs));
            let stopped = false;
            let poll: ReturnType<typeof setTimeout> | undefined;
            const initial = await bounded(
              journal.read(key, cursor, batch),
              this.settings.authTimeoutMs,
            );
            if (initial.gap) throw new ReplayGapError();
            const process = (events: RealtimeEvent[]) => {
              for (const e of events) {
                if (stopped || closed) return;
                if (
                  !e ||
                  typeof e.id !== 'string' ||
                  e.tenantId !== p.tenantId ||
                  e.channel !== channel ||
                  Buffer.byteLength(JSON.stringify(e)) > this.settings.maxMessageBytes
                )
                  throw Error('Invalid journal event');
                deliver(e);
                cursor = e.id;
              }
            };
            const next = async () => {
              try {
                await this.authorized(p, channel, 'subscribe');
                const rows = await bounded(
                  journal.read(key, cursor, batch),
                  this.settings.authTimeoutMs,
                );
                if (stopped || closed) return;
                if (rows.gap) throw new ReplayGapError();
                process(rows.events);
                if (!stopped && !closed) {
                  poll = setTimeout(() => {
                    void next();
                  }, ms);
                  poll.unref();
                }
              } catch (e) {
                try {
                  this.config.onError?.(e);
                } finally {
                  void session.close();
                }
              }
            };
            off = () => {
              stopped = true;
              if (poll) clearTimeout(poll);
            };
            if (closed) {
              await off();
              return;
            }
            process(initial.events);
            if (!closed) {
              poll = setTimeout(() => {
                void next();
              }, ms);
              poll.unref();
            }
          } else {
            if (after !== undefined) throw Error('Replay not configured');
            off = await this.broker.subscribe(topic(p.tenantId, channel), deliver);
          }
          if (closed) {
            await off();
            return;
          }
          subscriptions.set(channel, off);
        } finally {
          pending.delete(channel);
        }
      },
      unsubscribe: async (channel) => {
        if (pending.has(channel)) throw Error('Subscription in progress');
        const off = subscriptions.get(channel);
        subscriptions.delete(channel);
        ackWindow?.clear(channel);
        await off?.();
      },
      close: async () => {
        if (closed) return;
        closed = true;
        clearTimeout(timer);
        if (recheck) clearTimeout(recheck);
        this.sessions.delete(session);
        try {
          terminate();
        } finally {
          await Promise.allSettled(
            [...subscriptions.values()].map((off) => Promise.resolve().then(off)),
          );
          subscriptions.clear();
          if (release)
            await bounded(release(), this.settings.authTimeoutMs).catch((e) => {
              this.config.onError?.(e);
            });
        }
      },
    };
    const verify = async () => {
      try {
        await this.checkSession(p);
        for (const channel of subscriptions.keys()) await this.authorized(p, channel, 'subscribe');
        if (!closed) {
          recheck = setTimeout(() => {
            void verify();
          }, this.config.recheckMs ?? this.settings.heartbeatMs);
          recheck.unref();
        }
      } catch (e) {
        try {
          this.config.onError?.(e);
        } finally {
          void session.close();
        }
      }
    };
    this.sessions.add(session);
    recheck = setTimeout(() => {
      void verify();
    }, this.config.recheckMs ?? this.settings.heartbeatMs);
    recheck.unref();
    timer = setTimeout(() => {
      void session.close();
    }, this.settings.sessionTtlMs);
    timer.unref();
    return session;
  }
  /** SSE: authenticate from trusted session/token; single channel, heartbeat, disconnect on backpressure. */
  async sse(req: IncomingMessage, res: ServerResponse, channel: string) {
    if (this.config.ackWindow !== undefined) {
      res.statusCode = 409;
      res.end('SSE requires ACK window disabled; use Last-Event-ID');
      return;
    }
    let session: Connection | undefined;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let started = false;
    let pending: RealtimeEvent[] = [];
    const stop = () => {
      if (heartbeat) clearInterval(heartbeat);
      if (!res.writableEnded) res.end();
    };
    try {
      const principal = await this.authenticate(req);
      if (res.destroyed) return;
      session = await this.open(
        principal,
        (event) => {
          if (!started) {
            if (pending.length >= (this.config.replayBatchSize ?? 16))
              throw Error('SSE pending overflow');
            pending.push(event);
            return;
          }
          if (!res.write(`id: ${event.id}\nevent: message\ndata: ${JSON.stringify(event)}\n\n`))
            void session?.close();
        },
        stop,
      );
      res.once('close', () => {
        void session?.close();
      });
      const last = this.config.journal ? req.headers['last-event-id'] : undefined;
      if (Array.isArray(last)) throw Error('Invalid replay cursor');
      await session.subscribe(channel, last || undefined);
      if (res.destroyed || res.writableEnded) {
        await session.close();
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
        Connection: 'keep-alive',
      });
      res.flushHeaders();
      started = true;
      res.write(': connected\n\n');
      for (const e of pending)
        if (!res.write(`id: ${e.id}\nevent: message\ndata: ${JSON.stringify(e)}\n\n`)) {
          await session.close();
          break;
        }
      pending = [];
      if (!res.writableEnded) {
        heartbeat = setInterval(() => {
          if (!res.write(': heartbeat\n\n')) void session?.close();
        }, this.settings.heartbeatMs);
        heartbeat.unref();
      }
    } catch (e) {
      this.config.onError?.(e);
      if (!res.headersSent && !res.writableEnded) {
        res.statusCode = e instanceof ReplayGapError ? 409 : 403;
        res.end(
          e instanceof ReplayGapError
            ? 'Replay unavailable; resynchronize state'
            : 'Realtime connection denied',
        );
      }
      await session?.close();
    }
  }
  async close() {
    this.closed = true;
    await Promise.allSettled([...this.sessions].map((s) => s.close()));
    await this.broker.close?.();
  }
}
/** Native WebSocket transport. Optional ws dependency; attach only to a dedicated path. */
export async function attachWebSocket(server: Server, hub: RealtimeHub, path = '/ws') {
  const moduleName = 'ws';
  const { WebSocketServer } = await import(moduleName);
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: hub.settings.maxMessageBytes,
    perMessageDeflate: false,
  });
  let pending = 0;
  let closed = false;
  const upgrade = (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (req.url?.split('?')[0] !== path) return;
    if (closed || pending >= hub.settings.maxConnections) {
      socket.destroy();
      return;
    }
    pending++;
    socket.pause();
    void hub
      .authenticate(req)
      .then(
        (principal) => {
          if (closed || socket.destroyed) return;
          wss.handleUpgrade(req, socket, head, async (ws: any) => {
            let session: Connection | undefined;
            const earlyError = () => ws.terminate();
            ws.on('error', earlyError);
            try {
              session = await hub.open(
                principal,
                (event) => {
                  if (ws.readyState !== 1 || ws.bufferedAmount > hub.settings.maxMessageBytes * 2)
                    throw Error('Slow consumer');
                  ws.send(JSON.stringify(event));
                },
                () => ws.terminate(),
              );
            } catch {
              ws.close(1013, 'Capacity');
              return;
            }
            if (ws.readyState !== 1) {
              await session.close();
              return;
            }
            ws.off('error', earlyError);
            ws.on('error', () => {
              void session?.close();
            });
            ws.on('close', () => {
              void session?.close();
            });
            let active = false;
            let alive = true;
            ws.on('pong', () => {
              alive = true;
            });
            const heartbeat = setInterval(() => {
              if (!alive) {
                void session?.close();
                return;
              }
              alive = false;
              ws.ping();
            }, hub.settings.heartbeatMs);
            heartbeat.unref();
            ws.once('close', () => clearInterval(heartbeat));
            ws.on('message', (raw: Buffer) => {
              if (active) {
                ws.close(1008, 'Too many commands');
                return;
              }
              active = true;
              void (async () => {
                try {
                  const cmd = JSON.parse(raw.toString());
                  if (cmd.type === 'eventAck' && session!.ack) session!.ack(cmd.channel, cmd.id);
                  else if (cmd.type === 'subscribe')
                    await session!.subscribe(cmd.channel, cmd.after);
                  else if (cmd.type === 'unsubscribe') await session!.unsubscribe(cmd.channel);
                  else throw Error('Unknown command');
                  if (ws.readyState === 1)
                    ws.send(JSON.stringify({ type: 'ack', channel: cmd.channel }));
                } catch {
                  if (ws.readyState === 1)
                    ws.send(JSON.stringify({ type: 'error', message: 'Command denied' }));
                } finally {
                  active = false;
                }
              })();
            });
          });
          socket.resume();
        },
        () => {
          if (!socket.destroyed) {
            socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
            socket.destroy();
          }
        },
      )
      .catch(() => socket.destroy())
      .finally(() => {
        pending--;
      });
  };
  server.on('upgrade', upgrade);
  return {
    close: async () => {
      closed = true;
      server.off('upgrade', upgrade);
      for (const client of wss.clients) client.terminate();
      await new Promise<void>((resolve, reject) =>
        wss.close((e?: Error) => (e ? reject(e) : resolve())),
      );
    },
  };
}
/** Socket.IO transport. Optional socket.io dependency. No client-controlled tenant routing. */
export async function attachSocketIO(server: Server, hub: RealtimeHub, path = '/socket.io') {
  const moduleName = 'socket.io';
  const { Server: IO } = await import(moduleName);
  const io = new IO(server, {
    path,
    destroyUpgrade: false,
    maxHttpBufferSize: hub.settings.maxMessageBytes,
    perMessageDeflate: false,
    allowRequest: (req: IncomingMessage, cb: (e: string | null, ok: boolean) => void) =>
      cb(null, hub.originAllowed(req)),
  });
  let pending = 0;
  io.use((socket: any, next: (e?: Error) => void) => {
    if (pending >= hub.settings.maxConnections) {
      next(Error('Capacity'));
      return;
    }
    pending++;
    void hub
      .authenticate(socket.request, socket.handshake.auth)
      .then(
        (p) => {
          socket.data.saplingPrincipal = p;
          next();
        },
        () => next(Error('Unauthorized')),
      )
      .finally(() => {
        pending--;
      });
  });
  io.on('connection', async (socket: any) => {
    let session: Connection;
    try {
      session = await hub.open(
        socket.data.saplingPrincipal,
        (event) => {
          if (!socket.conn.transport.writable) throw Error('Slow consumer');
          socket.emit('sapling:event', event);
        },
        () => socket.disconnect(true),
      );
    } catch {
      socket.disconnect(true);
      return;
    }
    if (!socket.connected) {
      await session.close();
      return;
    }
    let active = false;
    const command = (action: 'subscribe' | 'unsubscribe') => (channel: unknown, ack?: unknown) => {
      if (active) {
        socket.disconnect(true);
        return;
      }
      active = true;
      void (async () => {
        try {
          if (action === 'subscribe' && channel && typeof channel === 'object') {
            const cmd = channel as { channel?: unknown; after?: unknown };
            if (
              typeof cmd.channel !== 'string' ||
              (cmd.after !== undefined && typeof cmd.after !== 'string')
            )
              throw Error('Invalid channel');
            await session.subscribe(cmd.channel, cmd.after);
          } else {
            if (typeof channel !== 'string') throw Error('Invalid channel');
            await session[action](channel);
          }
          if (typeof ack === 'function') ack({ ok: true });
        } catch {
          if (typeof ack === 'function') ack({ ok: false });
        } finally {
          active = false;
        }
      })();
    };
    socket.on('sapling:subscribe', command('subscribe'));
    socket.on('sapling:unsubscribe', command('unsubscribe'));
    socket.on('sapling:ack', (cmd: any, reply?: unknown) => {
      try {
        if (!session.ack || typeof cmd?.channel !== 'string' || typeof cmd?.id !== 'string')
          throw Error('Invalid ACK');
        session.ack(cmd.channel, cmd.id);
        if (typeof reply === 'function') reply({ ok: true });
      } catch {
        if (typeof reply === 'function') reply({ ok: false });
      }
    });
    socket.on('disconnect', () => {
      void session.close();
    });
  });
  return { close: () => new Promise<void>((resolve) => io.close(() => resolve())) };
}
