import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RouteLine } from "@/components/journeys/route-line";

describe("shareable journey route line", () => {
  it("keeps explicit SVG paint values when html-to-image clones the card", () => {
    const markup = renderToStaticMarkup(<RouteLine/>);

    expect(markup).toContain('fill="none"');
    expect(markup).toContain('stroke="#d99c4d"');
    expect(markup.match(/fill="#181613"/gu)).toHaveLength(2);
    expect(markup.match(/stroke="#9a6930"/gu)).toHaveLength(2);
  });
});
