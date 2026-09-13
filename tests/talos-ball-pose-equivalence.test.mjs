import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { test } from "vitest";
import { createPoseManifest } from "./helpers/talos-ball-pose-equivalence.mjs";

// fileURLToPath 而非 URL.pathname:Windows 下 pathname 是百分号编码的
// "/D:/..." 形式,直接喂给 fs 会得到 "D:\D:\%E9..." 这类损坏路径。
const vendorRoot = fileURLToPath(
  new URL("../src/talos-ball/runtime/vendor/talos-ball-runtime/", import.meta.url)
);
const expected = JSON.parse(
  await readFile(
    new URL("./fixtures/talos-ball-pose-manifest.json", import.meta.url),
    "utf8"
  )
);

test("all 32 deterministic pose traces match the pinned upstream baseline", async () => {
  const actual = await createPoseManifest(vendorRoot);
  assert.deepEqual(actual, expected);
});
