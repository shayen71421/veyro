import { describe, expect, it } from "vitest";
import {
  extractKnownStationRoute,
  extractMobileTicketRoute,
  extractPaperTicketRoute,
  extractSplitMobileTicketRoute,
} from "@/lib/ocr/ticket-ocr";

describe("ticket route extraction", () => {
  it("extracts labelled paper ticket fields", () => {
    expect(extractPaperTicketRoute("Date: 18/07/2026\nFrom: Changampuzha Park\nTo: Aluva\nPrice: 40")).toEqual({
      from: "Changampuzha Park", to: "Aluva",
    });
  });

  it("extracts mobile ticket arrow variations", () => {
    expect(extractMobileTicketRoute("Aluva → SN Junction")).toEqual({ from: "Aluva", to: "SN Junction" });
    expect(extractMobileTicketRoute("Kalamassery TO Vyttila")).toEqual({ from: "Kalamassery", to: "Vyttila" });
  });

  it("recovers mobile routes split across lines by a graphical arrow", () => {
    expect(extractKnownStationRoute("KOCHI METRO\nAluva\n\nSN Junction\nSingle Journey")).toEqual({
      from: "Aluva", to: "SN Junction",
    });
  });

  it("combines station labels OCR reads from separate mobile-ticket regions", () => {
    expect(extractSplitMobileTicketRoute(" Aluva \n", "\n Vyttila ")).toEqual({
      from: "Aluva", to: "Vyttila",
    });
  });
});
