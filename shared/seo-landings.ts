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
    kind: "marcas",
    slug: "game-of-spades",
    name: "Perfumes Game of Spades",
    eyebrow: "COLECCIÓN GAME OF SPADES",
    title: "Perfumes Game of Spades en Colombia",
    description:
      "Consulta perfumes Game of Spades disponibles en Colombia y compara notas, concentraciones, presentaciones, disponibilidad y precios en COP.",
    introduction:
      "Explora las referencias Game of Spades publicadas en nuestro catálogo. Consulta cada ficha para comparar su perfil olfativo, concentración, tamaños, disponibilidad y precio actual.",
    filterValue: "Game of Spades",
  },
  {
    kind: "marcas",
    slug: "ariana-grande",
    name: "Perfumes Ariana Grande",
    eyebrow: "COLECCIÓN ARIANA GRANDE",
    title: "Perfumes Ariana Grande en Colombia",
    description:
      "Consulta perfumes Ariana Grande disponibles en Colombia y compara notas, concentraciones, presentaciones, disponibilidad y precios en COP.",
    introduction:
      "Encuentra las referencias Ariana Grande publicadas en nuestra colección. Compara sus notas, perfil olfativo, concentración, presentaciones, disponibilidad y precio actual antes de elegir.",
    filterValue: "Ariana Grande",
  },
  {
    kind: "marcas",
    slug: "paco-rabanne",
    name: "Perfumes Paco Rabanne",
    eyebrow: "COLECCIÓN PACO RABANNE",
    title: "Perfumes Paco Rabanne en Colombia",
    description:
      "Consulta perfumes Paco Rabanne disponibles en Colombia y compara notas, concentraciones, presentaciones, disponibilidad y precios en COP.",
    introduction:
      "Revisa las referencias Paco Rabanne publicadas en nuestro catálogo. Cada ficha permite comparar notas, familia olfativa, concentración, tamaños, disponibilidad y precio actual.",
    filterValue: "Paco Rabanne",
  },
  {
    kind: "marcas",
    slug: "carolina-herrera",
    name: "Perfumes Carolina Herrera",
    eyebrow: "COLECCIÓN CAROLINA HERRERA",
    title: "Perfumes Carolina Herrera en Colombia",
    description:
      "Consulta perfumes Carolina Herrera disponibles en Colombia y compara notas, concentraciones, presentaciones, disponibilidad y precios en COP.",
    introduction:
      "Descubre las referencias Carolina Herrera disponibles en nuestra colección. Abre cada ficha para conocer sus notas, concentración, presentaciones, disponibilidad y precio actual.",
    filterValue: "Carolina Herrera",
  },
  {
    kind: "marcas",
    slug: "dolce-gabbana",
    name: "Perfumes Dolce & Gabbana",
    eyebrow: "COLECCIÓN DOLCE & GABBANA",
    title: "Perfumes Dolce & Gabbana en Colombia",
    description:
      "Consulta perfumes Dolce & Gabbana disponibles en Colombia y compara notas, concentraciones, presentaciones, disponibilidad y precios en COP.",
    introduction:
      "Consulta las referencias Dolce & Gabbana publicadas en nuestro catálogo. Compara su perfil olfativo, concentración, tamaños disponibles y precio actual desde cada ficha.",
    filterValue: "Dolce & Gabbana",
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
    kind: "familias",
    slug: "florales",
    name: "Perfumes florales",
    eyebrow: "FAMILIA OLFATIVA FLORAL",
    title: "Perfumes florales en Colombia",
    description:
      "Explora perfumes florales disponibles en Colombia con rosa, jazmín, azahar, peonía y otros acordes. Compara tamaños y precios en COP.",
    introduction:
      "Las fragancias florales pueden sentirse luminosas, cremosas, frescas o intensas según la combinación de rosa, jazmín, azahar, peonía y otras flores. Compara sus notas y evolución antes de elegir.",
    filterValue: "Floral",
  },
  {
    kind: "familias",
    slug: "frutales",
    name: "Perfumes frutales",
    eyebrow: "FAMILIA OLFATIVA FRUTAL",
    title: "Perfumes frutales en Colombia",
    description:
      "Explora perfumes frutales disponibles en Colombia con pera, manzana, durazno, frutos rojos y otros acordes. Compara tamaños y precios en COP.",
    introduction:
      "Los perfiles frutales pueden ir de frescos y jugosos a dulces y envolventes. Revisa las notas, la concentración y la evolución de cada referencia para distinguir sus diferentes estilos.",
    filterValue: "Frutal",
  },
  {
    kind: "familias",
    slug: "orientales",
    name: "Perfumes orientales y ambarados",
    eyebrow: "FAMILIA OLFATIVA ORIENTAL Y AMBARADA",
    title: "Perfumes orientales y ambarados en Colombia",
    description:
      "Explora perfumes orientales y ambarados disponibles en Colombia con ámbar, resinas, vainilla, especias e incienso. Compara tamaños y precios.",
    introduction:
      "Las composiciones orientales, también descritas como ambaradas, suelen combinar ámbar, resinas, vainilla, especias o incienso. Compara las notas y la concentración porque su intensidad y evolución pueden variar.",
    filterValue: "Oriental",
  },
  {
    kind: "familias",
    slug: "especiados",
    name: "Perfumes especiados",
    eyebrow: "FAMILIA OLFATIVA ESPECIADA",
    title: "Perfumes especiados en Colombia",
    description:
      "Explora perfumes especiados disponibles en Colombia con pimienta, canela, cardamomo, clavo y otros acordes. Compara tamaños y precios en COP.",
    introduction:
      "Las notas de pimienta, canela, cardamomo, clavo y otras especias pueden aportar frescura, contraste o calidez. Consulta cada ficha para comparar cómo se integran con maderas, flores, frutas y ámbar.",
    filterValue: "Especiado",
  },
  {
    kind: "familias",
    slug: "aromaticos",
    name: "Perfumes aromáticos",
    eyebrow: "FAMILIA OLFATIVA AROMÁTICA",
    title: "Perfumes aromáticos en Colombia",
    description:
      "Explora perfumes aromáticos disponibles en Colombia con lavanda, romero, salvia, hierbas y acordes frescos. Compara tamaños y precios en COP.",
    introduction:
      "Las fragancias aromáticas combinan con frecuencia lavanda, salvia, romero y otras notas herbales. Pueden sentirse verdes, frescas o clásicas según las notas cítricas, especiadas y amaderadas que las acompañen.",
    filterValue: "Aromático",
  },
  {
    kind: "familias",
    slug: "acuaticos",
    name: "Perfumes acuáticos",
    eyebrow: "FAMILIA OLFATIVA ACUÁTICA",
    title: "Perfumes acuáticos en Colombia",
    description:
      "Explora perfumes acuáticos disponibles en Colombia con acordes marinos, ozónicos, minerales y frescos. Compara presentaciones y precios en COP.",
    introduction:
      "Los acordes acuáticos, marinos y ozónicos buscan una sensación fresca y aireada. Compara las notas complementarias, la concentración y la presentación de cada perfume para encontrar el perfil que prefieres.",
    filterValue: "Acuático",
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

export function seoLandingForFilter(kind: SeoLandingKind, filterValue: string) {
  return seoLandings.find(
    (landing) => landing.kind === kind && landing.filterValue === filterValue,
  );
}
