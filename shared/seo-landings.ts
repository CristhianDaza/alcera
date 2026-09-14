export type SeoLandingKind = "categorias" | "marcas";

export type SeoLanding = {
  kind: SeoLandingKind;
  slug: string;
  name: string;
  eyebrow: string;
  title: string;
  description: string;
  introduction: string;
  filterValue: string;
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
];

export function seoLanding(kind: unknown, slug: unknown) {
  return seoLandings.find(
    (landing) => landing.kind === kind && landing.slug === slug,
  );
}
