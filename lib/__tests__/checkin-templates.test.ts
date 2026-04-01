/* eslint-disable no-undef */
import { CHECKIN_TEMPLATES, getTemplateById } from "../checkin-templates";

describe("CHECKIN_TEMPLATES", () => {
  it("has 4 templates", () => {
    expect(CHECKIN_TEMPLATES).toHaveLength(4);
  });

  it("has unique IDs", () => {
    const ids = CHECKIN_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all templates have required fields", () => {
    for (const template of CHECKIN_TEMPLATES) {
      expect(template.id).toBeTruthy();
      expect(template.name).toBeTruthy();
      expect(template.description).toBeTruthy();
      expect(template.promptModifier).toBeTruthy();
    }
  });

  it("includes expected template IDs", () => {
    const ids = CHECKIN_TEMPLATES.map((t) => t.id);
    expect(ids).toContain("friday-review");
    expect(ids).toContain("midweek-pulse");
    expect(ids).toContain("monday-kickoff");
    expect(ids).toContain("quick-encouragement");
  });
});

describe("getTemplateById", () => {
  it("returns template for valid ID", () => {
    const template = getTemplateById("friday-review");
    expect(template).toBeDefined();
    expect(template!.name).toBe("Friday Weekly Review");
  });

  it("returns undefined for invalid ID", () => {
    expect(getTemplateById("nonexistent")).toBeUndefined();
  });
});
