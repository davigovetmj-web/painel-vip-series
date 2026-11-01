const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function setup({ status = "vencido", banOk = true } = {}) {
  let handler;
  const calls = [];
  const updates = [];
  const db = { from() {
    const query = {
      select() { return query; }, eq() { return query; },
      update(value) { updates.push(value); return query; },
      maybeSingle: async () => ({ data: { id: 1, status }, error: null }),
      then(resolve) { return Promise.resolve({ error: null }).then(resolve); },
    };
    return query;
  }};
  const source = fs.readFileSync("supabase/functions/telegram-manual-webhook/index.ts", "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, {
    exports: {}, require: () => ({ createClient: () => db }),
    Request, Response, console: { error() {} },
    Deno: { env: { get: name => name === "VIP_MANUAL_INTERNAL_SECRET" ? "test-secret" : "test-value" }, serve: fn => { handler = fn; } },
    fetch: async (url) => {
      calls.push(url.split("/").pop());
      return { json: async () => ({ ok: banOk || !url.endsWith("/banChatMember") }) };
    },
  });
  return { calls, updates, run: (secret = "test-secret") => handler(new Request("https://example.test", {
    method: "POST", headers: { "x-vip-manual-internal-secret": secret },
    body: JSON.stringify({ action: "remover_cliente", telegram_id: 123 }),
  })) };
}

test("rejects invalid credentials before database or Telegram mutations", async () => {
  const s = setup();
  assert.equal((await s.run("wrong")).status, 401);
  assert.deepEqual(s.calls, []);
  assert.deepEqual(s.updates, []);
});
test("refuses removal until the panel blocks access", async () => {
  const s = setup({ status: "ativo" });
  assert.equal((await s.run()).status, 409);
  assert.deepEqual(s.calls, []);
});
test("records removal only after Telegram confirms ban and unban", async () => {
  const s = setup();
  assert.equal((await s.run()).status, 200);
  assert.deepEqual(s.calls, ["banChatMember", "unbanChatMember"]);
  assert.equal(s.updates.length, 1);
  assert.ok(s.updates[0].removido_telegram_em);
});
test("Telegram failure does not record a successful removal", async () => {
  const s = setup({ banOk: false });
  assert.equal((await s.run()).status, 500);
  assert.deepEqual(s.calls, ["banChatMember"]);
  assert.deepEqual(s.updates, []);
});
