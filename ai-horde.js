const API_BASE = "https://aihorde.net/api/v2";
const CLIENT_AGENT =
  "aura-studio:2.0:https://github.com/akmalzokirjonov/aura-studio";
// This is AI Horde's documented public anonymous credential, not a secret.
const ANONYMOUS_KEY = "0000000000";
const MODELS = {
  auto: ["stable_diffusion", "Deliberate"],
  stable_diffusion: ["stable_diffusion"],
  Deliberate: ["Deliberate"],
};

export class HordeError extends Error {
  constructor(message, status = 0, retryAfter = 0) {
    super(message);
    this.name = "HordeError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

function abortError() {
  return new DOMException("Generation stopped.", "AbortError");
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const abort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", abort, { once: true });
  });
}

// Owns a single request: submit once, poll, retrieve, and clean up on cancellation.
// Dependencies are injectable so queue/error tests never consume volunteer GPUs.
export function createHordeClient({
  fetchImpl = (...args) => fetch(...args),
  sleep = wait,
  now = Date.now,
  pollInterval = 5000,
  maxWait = 10 * 60 * 1000,
} = {}) {
  async function request(path, { method = "GET", body, signal } = {}) {
    const controller = new AbortController();
    const relay = () => controller.abort();
    signal?.addEventListener("abort", relay, { once: true });
    if (signal?.aborted) controller.abort();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetchImpl(`${API_BASE}${path}`, {
        method,
        mode: "cors",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        headers: {
          "Client-Agent": CLIENT_AGENT,
          Accept: "application/json",
          ...(body
            ? { "Content-Type": "application/json", apikey: ANONYMOUS_KEY }
            : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });
      let data;
      try {
        data = await response.json();
      } catch {
        throw new HordeError(
          "The AI service returned an unreadable response. Try again shortly.",
          response.status,
        );
      }
      if (!response.ok) {
        const retryAfter = Math.min(
          60,
          Math.max(5, Number(response.headers.get("Retry-After")) || 15),
        );
        const messages = {
          400: "The AI service could not accept this prompt. Try a simpler description.",
          401: "Anonymous AI access is temporarily unavailable. No payment has been made.",
          403: "The service is restricting anonymous requests right now. Please try again later.",
          404: "This generation expired. You can start a new one.",
          429: `The free queue is busy. Please wait at least ${retryAfter} seconds before trying again.`,
          503: "The community AI service is temporarily unavailable. Please try again later.",
        };
        throw new HordeError(
          messages[response.status] ||
            "The AI service could not complete the request. Please try again later.",
          response.status,
          retryAfter,
        );
      }
      return data;
    } catch (error) {
      if (signal?.aborted) throw abortError();
      if (error.name === "AbortError")
        throw new HordeError(
          "The AI service took too long to respond. Please try again later.",
        );
      if (error instanceof HordeError) throw error;
      throw new HordeError(
        "Could not reach the AI service. Check your connection and try again.",
      );
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", relay);
    }
  }

  async function generateImage({
    prompt,
    model = "auto",
    signal,
    onProgress = () => {},
  }) {
    const description = prompt.trim();
    if (!description || description.length > 1000)
      throw new HordeError("Write a prompt between 1 and 1,000 characters.");
    if (!Object.hasOwn(MODELS, model))
      throw new HordeError("Choose one of the available image models.");
    if (signal?.aborted) throw abortError();
    let id;
    let finished = false;
    try {
      onProgress({ phase: "submitting" });
      // Do not abort or retry a POST: acquire the ID so cancellation can remove it.
      const accepted = await request("/generate/async", {
        method: "POST",
        body: {
          prompt: description,
          params: {
            n: 1,
            width: 512,
            height: 512,
            steps: 20,
            sampler_name: "k_euler_a",
            cfg_scale: 7,
          },
          models: MODELS[model],
          nsfw: false,
          censor_nsfw: true,
          trusted_workers: true,
          validated_backends: true,
          slow_workers: true,
          r2: false,
          // Anonymous Horde images are always shared; the UI requires acknowledgement.
          shared: true,
          allow_downgrade: true,
        },
      });
      if (
        typeof accepted?.id !== "string" ||
        !/^[a-f0-9-]{36}$/i.test(accepted.id)
      ) {
        throw new HordeError(
          "The AI service did not return a valid request. Please try again later.",
        );
      }
      id = accepted.id;
      const deadline = now() + maxWait;
      let failures = 0;
      while (now() < deadline) {
        if (signal?.aborted) throw abortError();
        let status;
        try {
          status = await request(`/generate/check/${id}`, { signal });
          failures = 0;
        } catch (error) {
          if (error.name === "AbortError") throw error;
          if (
            [0, 429, 500, 502, 503, 504].includes(error.status) &&
            ++failures <= 3
          ) {
            onProgress({ phase: "reconnecting" });
            await sleep(
              Math.max(pollInterval, (error.retryAfter || 5 * failures) * 1000),
              signal,
            );
            continue;
          }
          throw error;
        }
        if (status.faulted)
          throw new HordeError(
            "The generation failed on the community worker. Please try again.",
          );
        if (status.done) {
          const result = await request(`/generate/status/${id}`, { signal });
          const generations = Array.isArray(result?.generations)
            ? result.generations
            : [];
          const generation = generations.find(
            (item) =>
              !item.censored &&
              item.state !== "censored" &&
              typeof item.img === "string",
          );
          finished = true;
          if (!generation)
            throw new HordeError(
              "No usable image was returned. The safety filter may have blocked it; try a different prompt.",
            );
          if (
            generation.img.length > 12_000_000 ||
            !/^[A-Za-z0-9+/]+={0,2}$/.test(generation.img)
          ) {
            throw new HordeError(
              "The image response could not be read safely. Please try again.",
            );
          }
          return {
            src: `data:image/webp;base64,${generation.img}`,
            model: String(generation.model || "Stable Diffusion"),
            seed: String(generation.seed || ""),
            prompt: description,
          };
        }
        if (status.is_possible === false)
          throw new HordeError(
            "No compatible volunteer GPU is available. Try Smart choice or come back later.",
          );
        onProgress({
          phase: status.processing > 0 ? "generating" : "queued",
          position: Number.isFinite(status.queue_position)
            ? status.queue_position
            : null,
          estimate: Number.isFinite(status.wait_time) ? status.wait_time : null,
          slow: status.might_stall === true,
        });
        await sleep(pollInterval, signal);
      }
      throw new HordeError(
        "The free queue took longer than 10 minutes. Try again when more volunteer GPUs are available.",
      );
    } catch (error) {
      if (id && !finished) {
        try {
          await request(`/generate/status/${id}`, { method: "DELETE" });
          error.remoteCancelled = true;
        } catch (cleanupError) {
          error.remoteCancelled = cleanupError.status === 404;
        }
      }
      throw error;
    }
  }
  return { generateImage };
}
