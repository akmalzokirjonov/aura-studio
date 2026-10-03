import test from "node:test";
import assert from "node:assert/strict";
import { createHordeClient } from "../ai-horde.js";

const id = "11111111-1111-4111-8111-111111111111";
const image = "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA";
const reply = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers });

function harness(steps, extras = {}) {
  const calls = [];
  const client = createHordeClient({
    fetchImpl: async (url, options) => {
      calls.push({ url, ...options });
      assert(steps.length, `Unexpected request: ${options.method} ${url}`);
      return steps.shift()(url, options);
    },
    sleep: async () => {},
    ...extras,
  });
  return { client, calls };
}

test("a queue completes with one anonymous submission and one image retrieval", async () => {
  const progress = [];
  const { client, calls } = harness([
    () => reply({ id }, 202),
    () =>
      reply({ done: false, processing: 0, queue_position: 3, wait_time: 40 }),
    () => reply({ done: false, processing: 1 }),
    () => reply({ done: true }),
    () =>
      reply({
        generations: [
          { img: image, model: "Deliberate", seed: "42", censored: false },
        ],
      }),
  ]);
  const result = await client.generateImage({
    prompt: "A mountain",
    onProgress: (p) => progress.push(p.phase),
  });
  assert.equal(result.src, `data:image/webp;base64,${image}`);
  assert.equal(result.seed, "42");
  assert.deepEqual(progress, ["submitting", "queued", "generating"]);
  assert.equal(calls.filter((call) => call.method === "POST").length, 1);
  assert.equal(calls[0].headers.apikey, "0000000000");
  assert.equal(calls[0].credentials, "omit");
  const body = JSON.parse(calls[0].body);
  assert.equal(body.nsfw, false);
  assert.equal(body.censor_nsfw, true);
  assert.equal(body.shared, true);
  assert.equal(body.r2, false);
});

test("cancelling during submission still obtains the ID and cancels the remote job", async () => {
  const controller = new AbortController();
  const { client, calls } = harness([
    () => {
      controller.abort();
      return reply({ id }, 202);
    },
    () => reply({ done: true }),
  ]);
  await assert.rejects(
    client.generateImage({ prompt: "A mountain", signal: controller.signal }),
    (error) => error.name === "AbortError" && error.remoteCancelled === true,
  );
  assert.deepEqual(
    calls.map((call) => call.method),
    ["POST", "DELETE"],
  );
});

test("polling rate limits retry the same request without resubmitting", async () => {
  const waits = [];
  const { client, calls } = harness(
    [
      () => reply({ id }, 202),
      () => reply({ message: "Rate limited" }, 429, { "Retry-After": "12" }),
      () => reply({ done: true }),
      () => reply({ generations: [{ img: image }] }),
    ],
    { sleep: async (ms) => waits.push(ms) },
  );
  await client.generateImage({ prompt: "A mountain" });
  assert.deepEqual(waits, [12000]);
  assert.equal(calls.filter((call) => call.method === "POST").length, 1);
});

test("a rejected submission is never automatically retried", async () => {
  const { client, calls } = harness([() => reply({ message: "Busy" }, 429)]);
  await assert.rejects(
    client.generateImage({ prompt: "A mountain" }),
    /free queue is busy/,
  );
  assert.equal(calls.length, 1);
});

test("no compatible workers produces an actionable error and removes the queued job", async () => {
  const { client, calls } = harness([
    () => reply({ id }, 202),
    () => reply({ done: false, is_possible: false }),
    () => reply({ done: true }),
  ]);
  await assert.rejects(
    client.generateImage({ prompt: "A mountain" }),
    /No compatible volunteer GPU/,
  );
  assert.equal(calls.at(-1).method, "DELETE");
});

test("censored output is not returned as a generated image", async () => {
  const { client } = harness([
    () => reply({ id }, 202),
    () => reply({ done: true }),
    () => reply({ generations: [{ img: image, censored: true }] }),
  ]);
  await assert.rejects(
    client.generateImage({ prompt: "A mountain" }),
    /safety filter/,
  );
});

test("a long-running queue times out and cancels instead of polling forever", async () => {
  let time = 0;
  const { client, calls } = harness(
    [
      () => reply({ id }, 202),
      () => reply({ done: false }),
      () => reply({ done: true }),
    ],
    {
      now: () => time,
      sleep: async () => {
        time += 1000;
      },
      maxWait: 500,
    },
  );
  await assert.rejects(
    client.generateImage({ prompt: "A mountain" }),
    /longer than 10 minutes/,
  );
  assert.equal(calls.at(-1).method, "DELETE");
});

test("an expired request does not restart and is safely treated as already cleaned up", async () => {
  const { client } = harness([
    () => reply({ id }, 202),
    () => reply({}, 404),
    () => reply({}, 404),
  ]);
  await assert.rejects(
    client.generateImage({ prompt: "A mountain" }),
    (error) => /expired/.test(error.message) && error.remoteCancelled,
  );
});

test("invalid input and unrecognized models never contact the provider", async () => {
  const { client, calls } = harness([]);
  await assert.rejects(
    client.generateImage({ prompt: "   " }),
    /Write a prompt/,
  );
  await assert.rejects(
    client.generateImage({ prompt: "A mountain", model: "other" }),
    /Choose one/,
  );
  assert.equal(calls.length, 0);
});
