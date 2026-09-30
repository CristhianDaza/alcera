import { describe, expect, it } from "vitest";
import { googleMerchantFeed } from "../shared/google-merchant";
import { demoProducts } from "../shared/demo";

describe("Feed de Google Merchant", () => {
  it("genera un artículo por variante con precio, disponibilidad y URLs públicas", () => {
    const product = {
      ...demoProducts[0]!,
      id: "bruma",
      slug: "bruma-dorada",
      name: "Bruma & Dorada",
      description: "Una fragancia <especial>",
      images: [
        { publicId: "a", url: "https://images.example.com/main.jpg", alt: "" },
        {
          publicId: "b",
          url: "https://images.example.com/second.jpg",
          alt: "",
        },
      ],
      variants: [
        { id: "50ml", size: "50 ml", price: 285_000, available: true },
        { id: "100ml", size: "100 ml", price: 420_000, available: false },
      ],
    };
    const feed = googleMerchantFeed([product], "https://alceraperfumes.com");

    expect(feed).toContain('<rss xmlns:g="http://base.google.com/ns/1.0"');
    expect(feed.match(/<item>/g)).toHaveLength(2);
    const ids = [...feed.matchAll(/<g:id>([^<]+)<\/g:id>/g)].map(
      (match) => match[1]!,
    );
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(ids.every((id) => /^alc-[a-f0-9]{32}$/.test(id))).toBe(true);
    expect(feed).toContain("<g:title>Bruma &amp; Dorada 50 ml</g:title>");
    expect(feed).toContain("Una fragancia &lt;especial&gt;");
    expect(feed).toContain(
      "<g:link>https://alceraperfumes.com/perfumes/bruma-dorada</g:link>",
    );
    expect(feed).toContain("<g:price>285000 COP</g:price>");
    expect(feed).toContain("<g:availability>out_of_stock</g:availability>");
    expect(feed).toContain(
      "<g:additional_image_link>https://images.example.com/second.jpg</g:additional_image_link>",
    );
    expect(feed).toMatch(
      /<g:item_group_id>alc-[a-f0-9]{32}<\/g:item_group_id>/,
    );
    expect(feed).toContain("<g:identifier_exists>no</g:identifier_exists>");
  });

  it("incluye GTIN y MPN cuando el producto los tiene", () => {
    const product = {
      ...demoProducts[0]!,
      gtin: "4006381333931",
      mpn: "BRUMA-50",
    };
    const feed = googleMerchantFeed([product], "https://alceraperfumes.com");

    expect(feed).toContain("<g:gtin>4006381333931</g:gtin>");
    expect(feed).toContain("<g:mpn>BRUMA-50</g:mpn>");
    expect(feed).not.toContain("<g:identifier_exists>no</g:identifier_exists>");
  });
});
