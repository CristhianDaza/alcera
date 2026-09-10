<script setup lang="ts">
import type { OlfactoryPyramid, Product, Settings } from "#shared/types";
import type { User } from "firebase/auth";

type EditableImage = Product["images"][number] & { file?: File };
type EditableProduct = Omit<
  Product,
  | "images"
  | "olfactoryPyramid"
  | "aromaDescription"
  | "idealFor"
  | "duration"
  | "projection"
  | "concentration"
  | "family"
> & {
  images: EditableImage[];
  olfactoryPyramid: OlfactoryPyramid;
  aromaDescription: string;
  idealFor: string[];
  duration: string;
  projection: string;
  concentration: string;
  family: string[];
};
const config = useRuntimeConfig(),
  demo = String(config.public.demo) === "true";
const route = useRoute(),
  router = useRouter();
const queryText = (value: unknown) => (typeof value === "string" ? value : "");
function updateAdminQuery(
  values: Record<string, string>,
  mode: "push" | "replace" = "push",
) {
  const query = { ...route.query };
  for (const [key, value] of Object.entries(values)) {
    if (value) query[key] = value;
    else delete query[key];
  }
  const navigate = mode === "push" ? router.push : router.replace;
  void navigate({ query });
}
const email = ref(""),
  password = ref(""),
  token = ref(""),
  notice = ref(""),
  busy = ref(false),
  checkingSession = ref(true);
const catalog = ref<Product[]>([]),
  storeForm = ref<Settings>({ ...useStore().value }),
  editor = ref<EditableProduct | null>(null);
const tab = ref<"products" | "orders" | "settings">("products"),
  productFilter = ref<"all" | Product["status"]>("all"),
  productSearch = ref("");
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const visibleCatalog = computed(() =>
  catalog.value.filter(
    (product) =>
      (productFilter.value === "all" ||
        product.status === productFilter.value) &&
      (!productSearch.value ||
        normalize(product.name).includes(normalize(productSearch.value))),
  ),
);
const adminPage = computed({
  get: () => {
    const page = Number.parseInt(queryText(route.query.page), 10);
    return Number.isFinite(page) && page > 0 ? page : 1;
  },
  set: (value) => updateAdminQuery({ page: value > 1 ? String(value) : "" }),
});
const adminPageSize = 10;
const adminTotalPages = computed(() =>
  Math.max(1, Math.ceil(visibleCatalog.value.length / adminPageSize)),
);
const paginatedCatalog = computed(() => {
  const start = (adminPage.value - 1) * adminPageSize;
  return visibleCatalog.value.slice(start, start + adminPageSize);
});
const displayedAdminPages = computed(() => {
  const total = adminTotalPages.value;
  const current = adminPage.value;
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | string)[] = [1];
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
});
watch([productFilter, productSearch], () => {
  updateAdminQuery({ page: "" }, "replace");
});
watch(adminTotalPages, (total) => {
  if (catalog.value.length && adminPage.value > total) {
    updateAdminQuery({ page: total > 1 ? String(total) : "" }, "replace");
  }
});
const notes = ref("");
const olfactoryFamilies = [
  "Floral",
  "Amaderada",
  "Cítrica",
  "Oriental",
  "Frutal",
  "Dulce",
  "Almizclado",
  "Especiado",
  "Aromático",
  "Acuático",
  "Cuero",
];
const topNotes = ref(""),
  heartNotes = ref(""),
  baseNotes = ref(""),
  idealFor = ref("");
const addAnother = ref(true);
const crypto = globalThis.crypto;
let stopAuthListener: (() => void) | undefined;
let restoredUid = "";
let restoringSession: Promise<void> | undefined;
useSeoMeta({ title: "Administración · ALCÉRA", robots: "noindex, nofollow" });
async function auth() {
  const { initializeApp, getApps } = await import("firebase/app");
  const { browserLocalPersistence, getAuth, setPersistence } =
    await import("firebase/auth");
  if (!config.public.firebaseApiKey)
    throw new Error("Configura Firebase para iniciar sesión.");
  const instance = getAuth(
    getApps()[0] ??
      initializeApp({
        apiKey: config.public.firebaseApiKey,
        authDomain: config.public.firebaseAuthDomain,
        projectId: config.public.firebaseProjectId,
      }),
  );
  await setPersistence(instance, browserLocalPersistence);
  return instance;
}
async function headers() {
  const user = (await auth()).currentUser;
  if (!user) throw new Error("La sesión expiró. Vuelve a iniciar sesión.");
  return { Authorization: `Bearer ${await user.getIdToken()}` };
}
function message(e: unknown) {
  return (
    (e as { data?: { statusMessage?: string }; message?: string }).data
      ?.statusMessage ||
    (e as Error).message ||
    "No se pudo completar la operación."
  );
}
async function restoreSession(user: User) {
  const claims = await user.getIdTokenResult();
  if (claims.claims.admin !== true) {
    await logout();
    throw new Error("Esta cuenta no tiene permisos de administrador.");
  }
  token.value = claims.token;
  catalog.value = await $fetch<Product[]>("/api/admin/products", {
    headers: await headers(),
  });
  restoredUid = user.uid;
}
async function ensureSession(user: User) {
  if (restoredUid === user.uid) return;
  if (restoringSession) return restoringSession;
  restoringSession = restoreSession(user).finally(() => {
    restoringSession = undefined;
  });
  return restoringSession;
}
onMounted(async () => {
  try {
    const { onIdTokenChanged } = await import("firebase/auth");
    const instance = await auth();
    stopAuthListener = onIdTokenChanged(instance, async (user) => {
      if (!user) {
        token.value = "";
        restoredUid = "";
        editor.value = null;
        catalog.value = [];
        checkingSession.value = false;
        return;
      }
      try {
        await ensureSession(user);
        notice.value = "";
      } catch (e) {
        token.value = "";
        notice.value = message(e);
      } finally {
        checkingSession.value = false;
      }
    });
  } catch (e) {
    notice.value = message(e);
    checkingSession.value = false;
  }
});
onBeforeUnmount(() => stopAuthListener?.());
async function login() {
  busy.value = true;
  notice.value = "";
  try {
    const { signInWithEmailAndPassword } = await import("firebase/auth");
    const a = await auth(),
      result = await signInWithEmailAndPassword(a, email.value, password.value);
    await ensureSession(result.user);
    password.value = "";
  } catch (e) {
    token.value = "";
    notice.value = message(e);
  } finally {
    busy.value = false;
  }
}
async function logout() {
  const { signOut } = await import("firebase/auth");
  await signOut(await auth());
  token.value = "";
  restoredUid = "";
  editor.value = null;
  catalog.value = [];
}
async function removeProduct(product: Product) {
  if (
    !window.confirm(
      `¿Eliminar “${product.name}”? Esta acción no se puede deshacer.`,
    )
  )
    return;
  busy.value = true;
  notice.value = "";
  try {
    await $fetch(`/api/admin/products/${product.id}`, {
      method: "DELETE",
      headers: await headers(),
    });
    catalog.value = catalog.value.filter((item) => item.id !== product.id);
    notice.value = "Perfume eliminado.";
  } catch (e) {
    notice.value = message(e);
  } finally {
    busy.value = false;
  }
}
function edit(p?: Product) {
  addAnother.value = !p;
  editor.value = p
    ? {
        ...structuredClone(toRaw(p)),
        variants: p.variants.map((v) => ({
          ...v,
          size: v.size.replace(/\D/g, ""),
        })),
        olfactoryPyramid: {
          top: p.olfactoryPyramid?.top ?? [],
          heart: p.olfactoryPyramid?.heart ?? [],
          base: p.olfactoryPyramid?.base ?? [],
        },
        aromaDescription: p.aromaDescription ?? "",
        idealFor: p.idealFor ?? [],
        duration: p.duration ?? "",
        projection: p.projection ?? "",
        concentration: p.concentration ?? "",
        family: p.family ?? [],
      }
    : {
        id: "",
        slug: "",
        name: "",
        brand: "",
        description: "",
        category: "Unisex",
        family: [],
        notes: [],
        olfactoryPyramid: { top: [], heart: [], base: [] },
        aromaDescription: "",
        idealFor: [],
        duration: "",
        projection: "",
        concentration: "",
        images: [],
        variants: [
          { id: crypto.randomUUID(), size: "", price: 0, available: true },
        ],
        status: "published",
        featured: false,
      };
  notes.value = editor.value.notes.join(", ");
  notice.value = "";
  topNotes.value = editor.value.olfactoryPyramid.top.join(", ");
  heartNotes.value = editor.value.olfactoryPyramid.heart.join(", ");
  baseNotes.value = editor.value.olfactoryPyramid.base.join(", ");
  idealFor.value = editor.value.idealFor.join(", ");
}
function openEditor(product?: Product) {
  edit(product);
  updateAdminQuery({ editor: product?.id ?? "new" });
}
function closeEditor(mode: "push" | "replace" = "replace") {
  editor.value = null;
  updateAdminQuery({ editor: "" }, mode);
}
watch(
  [catalog, () => route.query.editor],
  () => {
    const editorId = queryText(route.query.editor);
    if (!editorId) {
      editor.value = null;
      return;
    }
    if (editorId === "new") {
      edit();
      return;
    }
    const product = catalog.value.find((item) => item.id === editorId);
    if (product) edit(product);
    else editor.value = null;
  },
  { immediate: true },
);
function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function setSize(variant: EditableProduct["variants"][number], event: Event) {
  variant.size = (event.target as HTMLInputElement).value.replace(/\D/g, "");
}
function displaySize(value: string) {
  return value.replace(/\D/g, "");
}
function setPrice(variant: EditableProduct["variants"][number], event: Event) {
  variant.price =
    Number((event.target as HTMLInputElement).value.replace(/\D/g, "")) || 0;
}
function displayPrice(value: number) {
  return value ? new Intl.NumberFormat("es-CO").format(value) : "";
}
function values(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
watch(
  () => editor.value?.name,
  (name) => {
    if (editor.value && !editor.value.id)
      editor.value.slug = slugify(name ?? "");
  },
);
async function save() {
  if (!editor.value) return;
  const shouldAddAnother = !editor.value.id && addAnother.value;
  busy.value = true;
  notice.value = "";
  try {
    editor.value.notes = notes.value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    editor.value.olfactoryPyramid = {
      top: values(topNotes.value),
      heart: values(heartNotes.value),
      base: values(baseNotes.value),
    };
    editor.value.idealFor = values(idealFor.value);
    editor.value.aromaDescription = editor.value.aromaDescription.trim();
    editor.value.duration = editor.value.duration.trim();
    editor.value.projection = editor.value.projection.trim();
    editor.value.concentration = editor.value.concentration.trim();
    editor.value.family = editor.value.family
      .map((item) => item.trim())
      .filter(Boolean);
    const form = new FormData();
    const product = {
      ...editor.value,
      variants: editor.value.variants.map((variant) => ({
        ...variant,
        size: `${variant.size} ml`,
      })),
      images: editor.value.images.map(({ file, ...image }) =>
        file ? { publicId: "", url: "", alt: image.alt } : image,
      ),
    };
    if (
      !product.olfactoryPyramid.top.length &&
      !product.olfactoryPyramid.heart.length &&
      !product.olfactoryPyramid.base.length
    )
      Reflect.deleteProperty(product, "olfactoryPyramid");
    if (!product.aromaDescription)
      Reflect.deleteProperty(product, "aromaDescription");
    if (!product.idealFor.length) Reflect.deleteProperty(product, "idealFor");
    if (!product.duration) Reflect.deleteProperty(product, "duration");
    if (!product.projection) Reflect.deleteProperty(product, "projection");
    if (!product.concentration)
      Reflect.deleteProperty(product, "concentration");
    if (!product.family.length) Reflect.deleteProperty(product, "family");
    form.append("product", JSON.stringify(product));
    for (const image of editor.value.images)
      if (image.file) form.append("images", image.file);
    const result = await $fetch<Product>("/api/admin/products", {
      method: "POST",
      headers: await headers(),
      body: form,
    });
    const index = catalog.value.findIndex((p) => p.id === result.id);
    if (index >= 0) catalog.value[index] = result;
    else catalog.value.push(result);
    if (shouldAddAnother) {
      updateAdminQuery({ editor: "new" }, "replace");
      edit();
      await nextTick();
      window.scrollTo({ top: 0, behavior: "smooth" });
      notice.value =
        "Perfume guardado. Agrega el siguiente cuando estés listo.";
    } else {
      closeEditor();
      notice.value = "Perfume guardado.";
    }
  } catch (e) {
    notice.value = message(e);
  } finally {
    busy.value = false;
  }
}
async function saveSettings() {
  busy.value = true;
  try {
    useStore().value = await $fetch<Settings>("/api/admin/settings", {
      method: "PUT",
      headers: await headers(),
      body: storeForm.value,
    });
    notice.value = "Configuración guardada.";
  } catch (e) {
    notice.value = message(e);
  } finally {
    busy.value = false;
  }
}
function selectImage(event: Event) {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0];
  if (!file || !editor.value) return;
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 10 * 1024 * 1024
  ) {
    notice.value = "Usa JPEG, PNG o WebP de hasta 10 MB.";
    return;
  }
  editor.value.images.push({
    publicId: "",
    url: URL.createObjectURL(file),
    alt: editor.value.name || file.name,
    file,
  });
  notice.value = "Imagen lista. Se subirá únicamente al guardar el perfume.";
  input.value = "";
}
function move(index: number, direction: number) {
  if (!editor.value) return;
  const images = editor.value.images;
  const target = index + direction;
  if (target >= 0 && target < images.length)
    [images[index], images[target]] = [images[target]!, images[index]!];
}
</script>
<template>
  <section class="shell section admin">
    <div class="section-heading">
      <div>
        <span class="eyebrow">ESPACIO PRIVADO</span>
        <h1>El atelier.</h1>
      </div>
      <button v-if="token" class="text-link" @click="logout">
        Cerrar sesión ↗
      </button>
    </div>
    <p v-if="demo" class="demo-banner">
      Modo de demostración. Para administrar el catálogo real, configura los
      servicios y desactiva la demostración.
    </p>
    <p v-if="notice" class="notice" role="status">{{ notice }}</p>
    <div v-if="checkingSession" class="login-panel" role="status">
      <h2>Preparando el atelier…</h2>
      <p>Estamos comprobando tu sesión.</p>
    </div>
    <form v-else-if="!token" class="login-panel" @submit.prevent="login">
      <h2>Bienvenido de nuevo.</h2>
      <p>Accede con tu cuenta de administrador.</p>
      <label
        >Correo electrónico<input
          v-model="email"
          type="email"
          autocomplete="username"
          required /></label
      ><label
        >Contraseña<input
          v-model="password"
          type="password"
          autocomplete="current-password"
          required /></label
      ><button class="button full" :disabled="busy">
        {{ busy ? "Entrando…" : "Entrar al atelier ↗" }}
      </button>
    </form>
    <template v-else>
      <div class="admin-tabs" role="tablist" aria-label="Administración">
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'products'"
          @click="tab = 'products'"
        >
          Perfumes
        </button>
        <button
          v-if="!demo"
          type="button"
          role="tab"
          :aria-selected="tab === 'orders'"
          @click="tab = 'orders'"
        >
          Pedidos
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'settings'"
          @click="tab = 'settings'"
        >
          Configuración
        </button>
      </div>
      <section v-if="tab === 'settings'" class="settings">
        <h2>Configuración de la tienda</h2>
        <form class="admin-fields" @submit.prevent="saveSettings">
          <label
            >Nombre de la tienda<input
              v-model="storeForm.name"
              required
              maxlength="200" /></label
          ><label
            >WhatsApp con código de país (sin +)<input
              v-model="storeForm.whatsapp"
              placeholder="Sin configurar"
              pattern="[1-9][0-9]{7,14}" /></label
          ><button class="button" :disabled="busy || demo">
            Guardar configuración
          </button>
        </form>
      </section>
      <AdminOrders
        v-else-if="tab === 'orders' && !demo"
        :get-headers="headers"
      />
      <template v-else-if="tab === 'products' && !editor"
        ><div class="section-heading">
          <h2>Perfumes · {{ catalog.length }}</h2>
          <button class="button" @click="openEditor()">Nuevo perfume ＋</button>
        </div>
        <div class="admin-filters">
          <label class="admin-search-label"
            >Buscar por nombre<input
              v-model="productSearch"
              type="search"
              placeholder="Nombre del perfume…"
          /></label>
          <label class="admin-filter"
            >Mostrar<select v-model="productFilter">
              <option value="all">Todos los perfumes</option>
              <option value="published">Activos (publicados)</option>
              <option value="draft">Inactivos (borradores)</option>
            </select></label
          >
        </div>
        <p v-if="!visibleCatalog.length" class="empty-notice">
          {{
            productSearch
              ? `No encontramos ningún perfume con el nombre “${productSearch}”.`
              : "No hay perfumes en esta selección."
          }}
        </p>
        <template v-else>
          <div class="admin-list">
            <div
              v-for="p in paginatedCatalog"
              :key="p.id"
              class="admin-product"
            >
              <button type="button" class="edit-product" @click="openEditor(p)">
                <img :src="p.images[0]?.url" :alt="p.name" /><span
                  ><strong>{{ p.name }}</strong
                  ><small
                    >{{ p.brand }} ·
                    {{ p.variants.length }} presentaciones</small
                  ></span
                ><span class="product-status"
                  >{{ p.status === "published" ? "Activo" : "Inactivo" }} ·
                  Editar ↗</span
                >
              </button>
              <button
                type="button"
                class="text-link delete-product"
                :disabled="busy || demo"
                @click="removeProduct(p)"
              >
                Eliminar
              </button>
            </div>
          </div>
          <nav
            v-if="adminTotalPages > 1"
            class="pagination admin-pagination"
            aria-label="Paginación de perfumes en administración"
          >
            <span class="pagination-info" role="status">
              Mostrando
              {{ (adminPage - 1) * adminPageSize + 1 }}–{{
                Math.min(adminPage * adminPageSize, visibleCatalog.length)
              }}
              de {{ visibleCatalog.length }}
            </span>
            <div class="pagination-controls">
              <button
                type="button"
                class="text-link pagination-btn"
                :disabled="adminPage <= 1"
                @click="adminPage--"
              >
                ← Anterior
              </button>
              <div class="pagination-pages">
                <template v-for="(p, idx) in displayedAdminPages" :key="idx">
                  <span
                    v-if="typeof p === 'string'"
                    class="pagination-ellipsis"
                    >{{ p }}</span
                  >
                  <button
                    v-else
                    type="button"
                    class="pagination-page-btn"
                    :class="{ active: p === adminPage }"
                    :aria-current="p === adminPage ? 'page' : undefined"
                    @click="adminPage = p"
                  >
                    {{ p }}
                  </button>
                </template>
              </div>
              <button
                type="button"
                class="text-link pagination-btn"
                :disabled="adminPage >= adminTotalPages"
                @click="adminPage++"
              >
                Siguiente →
              </button>
            </div>
          </nav>
        </template></template
      >
      <form
        v-else-if="tab === 'products' && editor"
        class="editor"
        @submit.prevent="save"
      >
        <div class="section-heading">
          <h2>{{ editor.id ? "Editar perfume" : "Nuevo perfume" }}</h2>
          <button type="button" class="text-link" @click="closeEditor()">
            Cancelar
          </button>
        </div>
        <div class="admin-fields">
          <label
            >Nombre<input
              v-model="editor.name"
              required
              maxlength="200" /></label
          ><label
            >Enlace único<input
              :value="editor.slug"
              readonly
              placeholder="Se genera con el nombre" /></label
          ><label
            >Marca<input
              v-model="editor.brand"
              required
              maxlength="200" /></label
          ><label
            >Categoría<select v-model="editor.category">
              <option>Mujer</option>
              <option>Hombre</option>
              <option>Unisex</option>
            </select></label
          >
          <fieldset class="family-options">
            <legend>Familias olfativas (opcional)</legend>
            <label
              v-for="olfactoryFamily in olfactoryFamilies"
              :key="olfactoryFamily"
              class="check"
            >
              <input
                v-model="editor.family"
                type="checkbox"
                :value="olfactoryFamily"
              />
              {{ olfactoryFamily }}
            </label>
          </fieldset>
          ><label
            >Concentración (opcional)<input
              v-model="editor.concentration"
              maxlength="500"
              placeholder="Eau de Parfum" /></label
          ><label
            >Notas generales (opcional)<input
              v-model="notes"
              placeholder="Bergamota, Sándalo, Ámbar" /></label
          ><label
            >Notas de salida (opcional)<input
              v-model="topNotes"
              placeholder="Cedro, Sándalo" /></label
          ><label
            >Notas de corazón (opcional)<input
              v-model="heartNotes"
              placeholder="Ámbar, Resinas cálidas" /></label
          ><label
            >Notas de fondo (opcional)<input
              v-model="baseNotes"
              placeholder="Cedro, Almizcle" /></label
          ><label
            >Duración (opcional)<input
              v-model="editor.duration"
              maxlength="500"
              placeholder="Moderada" /></label
          ><label
            >Proyección (opcional)<input
              v-model="editor.projection"
              maxlength="500"
              placeholder="Moderada" /></label
          ><label class="wide"
            >¿A qué huele? (opcional)<textarea
              v-model="editor.aromaDescription"
              maxlength="5000"
              rows="3"
              placeholder="Describe la evolución y el carácter del aroma."
            /></label
          ><label class="wide"
            >Ideal para (opcional, separado por comas)<input
              v-model="idealFor"
              placeholder="Uso diario, Todo el año, Climas frescos" /></label
          ><label class="wide"
            >Descripción<textarea
              v-model="editor.description"
              required
              maxlength="5000"
              rows="4"
            />
          </label>
        </div>
        <h3>Presentaciones</h3>
        <div
          v-for="(v, i) in editor?.variants"
          :key="v.id"
          class="variant-editor"
        >
          <label
            >Tamaño<span class="input-with-suffix"
              ><input
                :value="displaySize(v.size)"
                @input="setSize(v, $event)"
                inputmode="numeric"
                pattern="[0-9]+"
                required
                placeholder="50"
              /><span>ml</span></span
            ></label
          ><label
            >Precio COP<input
              :value="displayPrice(v.price)"
              @input="setPrice(v, $event)"
              inputmode="numeric"
              required
              placeholder="50.000" /></label
          ><label class="check"
            ><input v-model="v.available" type="checkbox" /> Disponible</label
          ><button
            type="button"
            class="text-link"
            :disabled="editor?.variants.length === 1"
            @click="editor?.variants.splice(i, 1)"
          >
            Eliminar
          </button>
        </div>
        <button
          type="button"
          class="text-link"
          :disabled="editor?.variants.length >= 20"
          @click="
            editor?.variants.push({
              id: crypto.randomUUID(),
              size: '',
              price: 0,
              available: true,
            })
          "
        >
          Añadir presentación ＋
        </button>
        <h3>Imágenes · La primera será la portada</h3>
        <label class="upload-label"
          >Elegir fotografía · JPEG, PNG o WebP · Máximo 10 MB<input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            :disabled="busy || editor?.images.length >= 10"
            @change="selectImage"
        /></label>
        <div
          v-for="(img, i) in editor?.images"
          :key="img.url"
          class="image-editor"
        >
          <img :src="img.url" :alt="img.alt" /><label
            >Texto alternativo<input
              v-model="img.alt"
              required
              maxlength="200" /></label
          ><button
            type="button"
            :disabled="i === 0"
            aria-label="Mover imagen antes"
            @click="move(i, -1)"
          >
            ↑</button
          ><button
            type="button"
            :disabled="i === editor?.images.length - 1"
            aria-label="Mover imagen después"
            @click="move(i, 1)"
          >
            ↓</button
          ><button type="button" @click="editor?.images.splice(i, 1)">
            Retirar
          </button>
        </div>
        <div class="publish-controls">
          <label class="check"
            ><input
              v-model="editor.status"
              type="checkbox"
              true-value="published"
              false-value="draft"
            />
            Publicado</label
          ><label class="check"
            ><input v-model="editor.featured" type="checkbox" /> Destacar en
            inicio</label
          ><label v-if="!editor.id" class="check"
            ><input v-model="addAnother" type="checkbox" /> Agregar otro al
            guardar</label
          ><button class="button" :disabled="busy || demo">
            {{ busy ? "Guardando…" : "Guardar perfume" }}
          </button>
        </div>
      </form>
    </template>
  </section>
</template>
