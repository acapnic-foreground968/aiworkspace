import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { makeTmpDir, buildFakeWorkspace, runScript } from "./helpers.mjs";

let tmp;
afterEach(() => tmp?.cleanup());

const hooksScript = (ws) => join(ws, "scripts", "install-hooks.mjs");

describe("install-hooks", () => {
  it("creates post-merge and post-checkout hooks", () => {
    tmp = makeTmpDir();
    const { ws } = buildFakeWorkspace(tmp.dir);
    mkdirSync(join(ws, ".git", "hooks"), { recursive: true });

    runScript(hooksScript(ws), [], { cwd: ws });

    for (const hook of ["post-merge", "post-checkout"]) {
      const p = join(ws, ".git", "hooks", hook);
      assert.ok(existsSync(p), `missing ${hook}`);
    }
  });

  it("hooks contain the marker comment", () => {
    tmp = makeTmpDir();
    const { ws } = buildFakeWorkspace(tmp.dir);
    mkdirSync(join(ws, ".git", "hooks"), { recursive: true });
    runScript(hooksScript(ws), [], { cwd: ws });

    const content = readFileSync(join(ws, ".git", "hooks", "post-merge"), "utf8");
    assert.ok(content.includes("# workspace-skills-auto-setup"));
  });

  it("hooks are executable", () => {
    tmp = makeTmpDir();
    const { ws } = buildFakeWorkspace(tmp.dir);
    mkdirSync(join(ws, ".git", "hooks"), { recursive: true });
    runScript(hooksScript(ws), [], { cwd: ws });

    const mode = statSync(join(ws, ".git", "hooks", "post-merge")).mode;
    assert.equal(mode & 0o111, 0o111);
  });

  it("exits cleanly without .git", () => {
    tmp = makeTmpDir();
    const { ws } = buildFakeWorkspace(tmp.dir);
    const { exitCode } = runScript(hooksScript(ws), [], { cwd: ws });
    assert.equal(exitCode, 0);
  });

  it("preserves custom hooks without marker", () => {
    tmp = makeTmpDir();
    const { ws } = buildFakeWorkspace(tmp.dir);
    mkdirSync(join(ws, ".git", "hooks"), { recursive: true });
    writeFileSync(join(ws, ".git", "hooks", "post-merge"), "#!/bin/sh\necho custom\n");

    runScript(hooksScript(ws), [], { cwd: ws });
    const content = readFileSync(join(ws, ".git", "hooks", "post-merge"), "utf8");
    assert.ok(content.includes("echo custom"));
    assert.ok(!content.includes("workspace-skills-auto-setup"));
  });

  it("replaces hooks that have the marker", () => {
    tmp = makeTmpDir();
    const { ws } = buildFakeWorkspace(tmp.dir);
    mkdirSync(join(ws, ".git", "hooks"), { recursive: true });
    writeFileSync(join(ws, ".git", "hooks", "post-merge"),
      "#!/bin/sh\n# workspace-skills-auto-setup\nold version\n");

    runScript(hooksScript(ws), [], { cwd: ws });
    const content = readFileSync(join(ws, ".git", "hooks", "post-merge"), "utf8");
    assert.ok(content.includes("# workspace-skills-auto-setup"));
    assert.ok(!content.includes("old version"));
  });
});
