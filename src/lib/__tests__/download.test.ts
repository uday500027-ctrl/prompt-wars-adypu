import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadFile } from "../download";

describe("downloadFile utility", () => {
  let createdUrl: string;
  let clicked = false;
  let appendedChild: unknown = null;
  let removedChild: unknown = null;
  const originalDocument = globalThis.document;

  beforeEach(() => {
    clicked = false;
    appendedChild = null;
    removedChild = null;

    globalThis.URL.createObjectURL = vi.fn().mockImplementation(() => {
      createdUrl = "blob:http://localhost/mock-blob-id";
      return createdUrl;
    });

    globalThis.URL.revokeObjectURL = vi.fn();

    const mockAnchor = {
      href: "",
      download: "",
      click: () => {
        clicked = true;
      },
    };

    const mockDoc = {
      createElement: vi.fn().mockImplementation((tagName: string) => {
        if (tagName.toLowerCase() === "a") {
          return mockAnchor;
        }
        return {};
      }),
      body: {
        appendChild: vi.fn().mockImplementation((node) => {
          appendedChild = node;
          return node;
        }),
        removeChild: vi.fn().mockImplementation((node) => {
          removedChild = node;
          return node;
        }),
      },
    };

    // @ts-expect-error mocking minimal document for node test environment
    globalThis.document = mockDoc;
  });

  afterEach(() => {
    globalThis.document = originalDocument;
    vi.restoreAllMocks();
  });

  it("creates a blob, triggers click on download anchor, and revokes URL", () => {
    downloadFile("test content", "output.txt", "text/plain");

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(clicked).toBe(true);
    expect(appendedChild).toBe(removedChild);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(createdUrl);
  });

  it("uses default mimeType when omitted", () => {
    downloadFile("sanitized csv", "data.csv");

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(clicked).toBe(true);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });
});
