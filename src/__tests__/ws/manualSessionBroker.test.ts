// Copyright (c) 2026 CoverIt Labs. All Rights Reserved.
// Proprietary and confidential. Unauthorized use is strictly prohibited.
// See LICENSE file in the project root for full license information.

import { readFileSync } from "fs";
import { join } from "path";

describe("manualSessionBroker websocket allowlists", () => {
  const source = readFileSync(join(__dirname, "../../ws/manualSessionBroker.ts"), "utf8");

  test("allows manual flow completion and bug reporting messages", () => {
    expect(source).toContain('"flow.finish"');
    expect(source).toContain('"bug.report"');
    expect(source).toContain('"flow.completed"');
    expect(source).toContain('"bug.reported"');
  });

  test("allows manual rewind step messages", () => {
    expect(source).toContain('"flow.rewind"');
    expect(source).toContain('"flow.rewound"');
    expect(source).toContain('"recorded.step"');
  });

  test("allows manual session ttl messages from the crawler", () => {
    expect(source).toContain('"session.ttl"');
  });
});
