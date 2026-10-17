// Authoritative gameplay tests run against the connected database in one
// transaction. All test characters and clock changes are rolled back.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe.skipIf(!process.env['DAILY_LIFE_DB_TESTS'])("Vie quotidienne — règles serveur", () => {
  it("vérifie les trois parcours, l’énergie, l’argent, les droits et la persistance sans modifier de sauvegarde", () => {
    const sql = readFileSync("src/game/daily-life.integration.sql", "utf8");
    const result = execFileSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-At"], { input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    expect(result).toContain("DAILY_LIFE_RULES_OK");
  }, 30000);
});