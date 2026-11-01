"use strict";

const { get, run } = require("../database.cjs");

function sqliteTimestamp(date) {
  return date
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d{3}Z$/, "");
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function retryAfterMilliseconds(value) {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - Date.now()) : 0;
}

class BaseProvider {
  constructor(name, options = {}) {
    this.name = name;
    this.minIntervalMs = options.minIntervalMs || 1000;
    this.failureBackoffMinutes = options.failureBackoffMinutes || [1, 5, 15, 60];
    this.lastRequestStartedAt = 0;
    this.requestQueue = Promise.resolve();
  }

  async isAvailable() {
    const health = await get("SELECT * FROM provider_health WHERE provider = ?", [this.name]);
    const blockedUntil = [health?.next_retry_at, health?.circuit_open_until]
      .filter(Boolean)
      .map((value) => Date.parse(`${String(value).replace(" ", "T")}Z`))
      .filter(Number.isFinite)
      .reduce((latest, value) => Math.max(latest, value), 0);
    return blockedUntil <= Date.now();
  }

  async assertAvailable() {
    const available = await this.isAvailable();
    if (!available) {
      const health = await get("SELECT * FROM provider_health WHERE provider = ?", [this.name]);
      const err = new Error(
        `Provedor '${this.name}' temporariamente em espera / circuit breaker ativo`,
      );
      err.status = 503;
      err.provider = this.name;
      err.lastError = health?.last_error;
      throw err;
    }
  }

  async recordSuccess() {
    await run(
      `INSERT INTO provider_health(provider, consecutive_failures, next_retry_at, circuit_open_until, last_error)
       VALUES (?, 0, NULL, NULL, NULL)
       ON CONFLICT(provider) DO UPDATE SET consecutive_failures=0, next_retry_at=NULL,
         circuit_open_until=NULL, last_error=NULL, updated_at=CURRENT_TIMESTAMP`,
      [this.name],
    );
  }

  async recordFailure(error, retryAfterMs = 0) {
    const current = await get(
      "SELECT consecutive_failures FROM provider_health WHERE provider = ?",
      [this.name],
    );
    const failures = Number(current?.consecutive_failures || 0) + 1;
    const backoffMinutes =
      this.failureBackoffMinutes[Math.min(failures - 1, this.failureBackoffMinutes.length - 1)];
    const backoffMs = Math.max(backoffMinutes * 60_000, retryAfterMs);
    const nextRetryAt = new Date(Date.now() + backoffMs);
    const circuitOpenUntil = failures >= 3 ? new Date(Date.now() + 30 * 60_000) : null;

    await run(
      `INSERT INTO provider_health(provider, consecutive_failures, next_retry_at, circuit_open_until, last_error)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(provider) DO UPDATE SET consecutive_failures=excluded.consecutive_failures,
         next_retry_at=excluded.next_retry_at, circuit_open_until=excluded.circuit_open_until,
         last_error=excluded.last_error, updated_at=CURRENT_TIMESTAMP`,
      [
        this.name,
        failures,
        sqliteTimestamp(nextRetryAt),
        circuitOpenUntil ? sqliteTimestamp(circuitOpenUntil) : null,
        String(error.message || error).slice(0, 500),
      ],
    );
    return nextRetryAt;
  }

  async runQueued(task) {
    const execute = async () => {
      const remaining = this.minIntervalMs - (Date.now() - this.lastRequestStartedAt);
      if (remaining > 0) await wait(remaining);
      this.lastRequestStartedAt = Date.now();
      return task();
    };
    const result = this.requestQueue.then(execute, execute);
    this.requestQueue = result.catch(() => {});
    return result;
  }

  // Métodos que os adaptadores derivados devem implementar:
  async searchWorks(_query) {
    throw new Error(`searchWorks não implementado no provedor ${this.name}`);
  }

  async getWork(_externalId) {
    throw new Error(`getWork não implementado no provedor ${this.name}`);
  }

  async listChapters(_externalId, _options) {
    throw new Error(`listChapters não implementado no provedor ${this.name}`);
  }

  async resolvePages(_chapter) {
    throw new Error(`resolvePages não implementado no provedor ${this.name}`);
  }
}

module.exports = {
  BaseProvider,
  retryAfterMilliseconds,
  sqliteTimestamp,
  wait,
};
