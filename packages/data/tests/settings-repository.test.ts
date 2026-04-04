import { afterEach, describe, expect, it } from "vitest";
import { AuralRepository } from "../src/repositories";
import { openAuralDatabase } from "../src/store";

const databases: Array<ReturnType<typeof openAuralDatabase>> = [];

afterEach(() => {
  while (databases.length) {
    databases.pop()?.close();
  }
});

describe("settings repository", () => {
  it("writes multiple settings in one call and persists the latest values", () => {
    const database = openAuralDatabase({ memory: true });
    databases.push(database);
    const repository = new AuralRepository(database);

    const records = repository.setManySettings([
      { key: "player.volume", value: 0.35 },
      { key: "online.providerBaseUrl", value: "embedded" }
    ]);

    expect(records).toHaveLength(2);
    expect(repository.getSetting("player.volume")?.value).toBe(0.35);
    expect(repository.getSetting("online.providerBaseUrl")?.value).toBe("embedded");
  });

  it("returns an empty array when no settings are provided", () => {
    const database = openAuralDatabase({ memory: true });
    databases.push(database);
    const repository = new AuralRepository(database);

    expect(repository.setManySettings([])).toEqual([]);
    expect(repository.getAllSettings()).toEqual([]);
  });
});
