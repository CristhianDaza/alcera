export type SeoLandingKind =
  "categorias" | "marcas" | "familias" | "colecciones";

export type SeoLanding = {
  kind: SeoLandingKind;
  slug: string;
  name: string;
  eyebrow: string;
  title: string;
  description: string;
  introduction: string;
  filterValue: string;
  filterValues?: string[];
};

export const seoLandings: SeoLanding[] = [
  {
    kind: "categorias",
    slug: "mujer",
    name: "Perfumes para mujer",
    eyebrow: "FRAGANCIAS PARA MUJER",
    title: "Perfumes para mujer en Colombia",
    description:
      "Explora perfumes para mujer disponibles en Colombia y compara marcas, familias olfativas, concentraciones, tamaños y precios en COP.",
    introduction:
      "Encuentra fragancias florales, frutales, dulces, frescas y amaderadas clasificadas por las marcas para mujer. Compara sus notas, concentración, presentación, disponibilidad y precio antes de elegir.",
    filterValue: "Mujer",
  },
  {
    kind: "categorias",
    slug: "hombre",
    name: "Perfumes para hombre",
    eyebrow: "FRAGANCIAS PARA HOMBRE",
    title: "Perfumes para hombre en Colombia",
    description:
      "Explora perfumes para hombre disponibles en Colombia y compara marcas, familias olfativas, concentraciones, tamaños y precios en COP.",
    introduction:
      "Descubre fragancias cítricas, aromáticas, especiadas, amaderadas y orientales clasificadas por las marcas para hombre. Revisa sus notas, presentación, disponibilidad y precio antes de consultar tu pedido.",
    filterValue: "Hombre",
  },
  {
    kind: "categorias",
    slug: "unisex",
    name: "Perfumes unisex",
    eyebrow: "FRAGANCIAS UNISEX",
    title: "Perfumes unisex en Colombia",
    description:
      "Explora perfumes unisex disponibles en Colombia y compara marcas, familias olfativas, concentraciones, tamaños y precios en COP.",
    introduction:
      "Explora aromas unisex sin limitar la elección a una etiqueta de género. Compara familias olfativas, notas, concentración, tamaños disponibles y precios para encontrar una fragancia acorde con tus preferencias.",
    filterValue: "Unisex",
  },
  {
    kind: "marcas",
    slug: "lattafa",
    name: "Perfumes Lattafa",
    eyebrow: "COLECCIÓN LATTAFA",
    title: "Perfumes Lattafa en Colombia",
    description:
      "Consulta perfumes Lattafa disponibles en Colombia. Compara referencias, notas, concentraciones, presentaciones, disponibilidad y precios en COP.",
    introduction:
      "Reúne en un solo lugar las referencias Lattafa publicadas en nuestra colección. Consulta la ficha de cada perfume para comparar su perfil olfativo, concentración, presentaciones, disponibilidad y precio actual.",
    filterValue: "Lattafa",
  },
  {
    kind: "marcas",
    slug: "armaf",
    name: "Perfumes Armaf",
    eyebrow: "COLECCIÓN ARMAF",
    title: "Perfumes Armaf en Colombia",
    description:
      "Consulta perfumes Armaf disponibles en Colombia. Compara referencias, notas, concentraciones, presentaciones, disponibilidad y precios en COP.",
    introduction:
      "Descubre las referencias Armaf publicadas en nuestra colección. Abre cada ficha para revisar notas, familia olfativa, concentración, tamaños, disponibilidad y precio actual antes de elegir.",
    filterValue: "Armaf",
  },
  {
    kind: "marcas",
    slug: "rasasi",
    name: "Perfumes Rasasi",
    eyebrow: "COLECCIÓN RASASI",
    title: "Perfumes Rasasi en Colombia",
    description:
      "Consulta perfumes Rasasi disponibles en Colombia. Compara referencias, notas, concentraciones, presentaciones, disponibilidad y precios en COP.",
    introduction:
      "Explora las referencias Rasasi publicadas en nuestro catálogo. Cada ficha reúne su perfil olfativo, concentración, presentaciones, disponibilidad y precio actual para ayudarte a compararlas.",
    filterValue: "Rasasi",
  },
  {
    kind: "marcas",
    slug: "bharara",
    name: "Perfumes Bharara",
    eyebrow: "COLECCIÓN BHARARA",
    title: "Perfumes Bharara en Colombia",
    description:
      "Consulta perfumes Bharara disponibles en Colombia. Compara referencias, notas, concentraciones, presentaciones, disponibilidad y precios en COP.",
    introduction:
      "Encuentra las referencias Bharara publicadas en nuestra colección. Revisa notas, familia olfativa, concentración, tamaños, disponibilidad y precio actual en la ficha de cada perfume.",
    filterValue: "Bharara",
  },
  {
    kind: "marcas",
    slug: "maison-alhambra",
    name: "Perfumes Maison Alhambra",
    eyebrow: "COLECCIÓN MAISON ALHAMBRA",
    title: "Perfumes Maison Alhambra en Colombia",
    description:
      "Consulta perfumes Maison Alhambra disponibles en Colombia y compara notas, concentraciones, presentaciones, disponibilidad y precios en COP.",
    introduction:
      "Consulta las referencias Maison Alhambra publicadas en nuestro catálogo. Compara su composición, concentración, presentaciones, disponibilidad y precio actual antes de elegir.",
    filterValue: "Maison Alhambra",
  },
  {
    kind: "marcas",
    slug: "al-haramain",
    name: "Perfumes Al Haramain",
    eyebrow: "COLECCIÓN AL HARAMAIN",
    title: "Perfumes Al Haramain en Colombia",
    description:
      "Consulta perfumes Al Haramain disponibles en Colombia y compara notas, concentraciones, presentaciones, disponibilidad y precios en COP.",
    introduction:
      "Descubre las referencias Al Haramain disponibles en nuestra colección. Abre cada ficha para revisar notas, perfil olfativo, concentración, tamaños, disponibilidad y precio actual.",
    filterValue: "Al Haramain",
  },
  {
    kind: "familias",
    slug: "dulces",
    name: "Perfumes dulces",
    eyebrow: "FAMILIA OLFATIVA DULCE",
    title: "Perfumes dulces en Colombia",
    description:
      "Explora perfumes dulces disponibles en Colombia con acordes gourmand, vainilla, caramelo, cacao o frutas. Compara tamaños y precios en COP.",
    introduction:
      "Los perfiles dulces pueden incluir acordes gourmand, vainilla, caramelo, cacao, praliné o frutas maduras. Compara las notas y la concentración de cada referencia, porque no todas ofrecen la misma intensidad ni evolución.",
    filterValue: "Dulce",
  },
  {
    kind: "familias",
    slug: "amaderados",
    name: "Perfumes amaderados",
    eyebrow: "FAMILIA OLFATIVA AMADERADA",
    title: "Perfumes amaderados en Colombia",
    description:
      "Explora perfumes amaderados disponibles en Colombia con cedro, sándalo, vetiver, pachulí y otros acordes. Compara tamaños y precios en COP.",
    introduction:
      "Las fragancias amaderadas pueden sentirse secas, cremosas, terrosas o cálidas según notas como cedro, sándalo, vetiver y pachulí. Revisa la ficha de cada perfume para comparar su composición y presentación.",
    filterValue: "Amaderada",
  },
  {
    kind: "familias",
    slug: "citricos",
    name: "Perfumes cítricos",
    eyebrow: "FAMILIA OLFATIVA CÍTRICA",
    title: "Perfumes cítricos en Colombia",
    description:
      "Explora perfumes cítricos disponibles en Colombia con bergamota, limón, mandarina, neroli y otros acordes frescos. Compara tamaños y precios en COP.",
    introduction:
      "Las composiciones cítricas suelen abrir con una sensación fresca y luminosa creada por notas como bergamota, limón, mandarina o neroli. Compara su evolución, concentración y presentación antes de elegir.",
    filterValue: "Cítrica",
  },
  {
    kind: "colecciones",
    slug: "perfumes-arabes",
    name: "Perfumes árabes",
    eyebrow: "SELECCIÓN DE PERFUMERÍA ÁRABE",
    title: "Perfumes árabes en Colombia",
    description:
      "Explora perfumes árabes de Lattafa, Armaf, Rasasi, Maison Alhambra y Al Haramain disponibles en Colombia, con precios en COP.",
    introduction:
      "Esta selección reúne las referencias publicadas de Lattafa, Armaf, Rasasi, Maison Alhambra y Al Haramain. Compara perfiles dulces, amaderados, especiados, frescos y orientales desde la información de cada ficha.",
    filterValue: "Perfumería árabe",
    filterValues: [
      "Lattafa",
      "Armaf",
      "Rasasi",
      "Maison Alhambra",
      "Al Haramain",
    ],
  },
];

export function seoLanding(kind: unknown, slug: unknown) {
  return seoLandings.find(
    (landing) => landing.kind === kind && landing.slug === slug,
  );
}
