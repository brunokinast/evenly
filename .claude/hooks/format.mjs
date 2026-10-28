// PostToolUse hook: formats each edited file with Prettier (unknown file types are ignored).
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8") || "{}");
const file = input.tool_input?.file_path;
if (file) spawnSync(`npx prettier --write --ignore-unknown "${file}"`, { shell: true });
