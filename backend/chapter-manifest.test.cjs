const test = require("node:test");
const assert = require("node:assert/strict");
const { createManifestLoader } = require("./chapter-manifest.cjs");
const chapter = { external_id: "chapter-test" };
const payload = { result: "ok", baseUrl: "https://uploads.mangadex.org", chapter: { hash: "hash", data: ["1.jpg", "2.jpg"] } };
test("48 concurrent pages share one request; expiry fetches again", async () => {
  let calls = 0, now = 0;
  const load = createManifestLoader(async () => { calls++; return { json: async () => payload }; }, { now: () => now, ttlMs: 10 });
  const result = await Promise.all(Array.from({ length: 48 }, () => load(chapter)));
  assert.equal(calls, 1);
  assert.equal(result[47].length, 2);
  await load(chapter); assert.equal(calls, 1);
  now = 11; await load(chapter); assert.equal(calls, 2);
});
test("failed request is not cached; bounded cache evicts oldest", async () => {
  let calls = 0;
  const load = createManifestLoader(async () => {
    if (++calls === 1) throw new Error("provider cooldown");
    return { json: async () => payload };
  }, { maxEntries: 1 });
  await assert.rejects(load(chapter));
  await load(chapter); assert.equal(calls, 2);
  await load({ external_id: "another" }); await load(chapter);
  assert.equal(calls, 4);
});
