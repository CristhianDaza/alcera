<script setup lang="ts">
const store = useStore();
const { openPreferences } = useCookieConsent();

usePageSeo(
  `Política de cookies · ${store.value.name}`,
  `Conoce qué cookies y tecnologías similares utiliza ${store.value.name}, para qué sirven y cómo administrar tu consentimiento.`,
);

const whatsappUrl = computed(() => {
  const number = store.value.whatsapp?.replace(/\D/g, "");
  return store.value.whatsappEnabled !== false && number
    ? `https://wa.me/${number}`
    : "";
});
</script>

<template>
  <article class="shell section cookie-policy">
    <nav class="breadcrumbs" aria-label="Ruta de navegación">
      <NuxtLink to="/">Inicio</NuxtLink> /
      <span aria-current="page">Política de cookies</span>
    </nav>

    <header class="cookie-policy__hero">
      <span class="eyebrow">COOKIES Y PRIVACIDAD</span>
      <h1>Política de cookies</h1>
      <p>
        Aquí explicamos qué tecnologías utiliza {{ store.name }}, por qué las
        usamos y cómo puedes aceptar o rechazar las que son opcionales.
      </p>
      <span class="cookie-policy__updated"
        >Última actualización: 16 de septiembre de 2026</span
      >
    </header>

    <div class="cookie-policy__layout">
      <aside class="cookie-policy__summary" aria-label="Resumen">
        <strong>Tu elección</strong>
        <p>
          Las tecnologías necesarias mantienen la tienda funcionando. La
          medición y el chat solo se activan con tu autorización.
        </p>
        <button class="button" type="button" @click="openPreferences">
          Configurar cookies
        </button>
      </aside>

      <div class="cookie-policy__content">
        <section>
          <h2>1. ¿Qué son las cookies?</h2>
          <p>
            Las cookies son pequeños archivos que un sitio puede guardar en tu
            navegador. También utilizamos tecnologías similares, como el
            almacenamiento local y de sesión, para recordar información durante
            o entre visitas.
          </p>
          <p>
            Algunas son necesarias para prestar las funciones que solicitas.
            Otras nos ayudan a conocer, de manera general, cómo se utiliza la
            tienda o permiten ofrecer atención mediante chat; estas últimas son
            opcionales.
          </p>
        </section>

        <section>
          <h2>2. Tecnologías necesarias</h2>
          <p>
            Se usan para recordar tu bolsa, el tema visual, las respuestas del
            recomendador de perfumes, el estado temporal de un pedido y tu
            decisión sobre cookies. Son propias de {{ store.name }} y no se
            utilizan para publicidad.
          </p>
          <div class="cookie-policy__table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tecnología</th>
                  <th>Finalidad</th>
                  <th>Duración</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Almacenamiento local</td>
                  <td>
                    Conserva la bolsa, el tema, el recomendador y la elección de
                    cookies.
                  </td>
                  <td>Hasta que lo elimines desde tu navegador.</td>
                </tr>
                <tr>
                  <td>Almacenamiento de sesión</td>
                  <td>
                    Evita duplicar accidentalmente una solicitud de pedido.
                  </td>
                  <td>Hasta cerrar la pestaña o el navegador.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2>3. Cookies opcionales</h2>
          <p>
            No se instalan ni se cargan antes de que selecciones “Aceptar
            opcionales”. Si las rechazas, podrás seguir navegando, usando la
            bolsa y realizando pedidos normalmente.
          </p>

          <div class="cookie-policy__cards">
            <article>
              <span>Medición</span>
              <h3>Google Analytics para Firebase</h3>
              <p>
                Nos permite conocer datos generales sobre visitas, páginas
                consultadas, dispositivo e interacciones para mejorar la tienda.
                Puede utilizar las cookies <code>_ga</code> y
                <code>_ga_&lt;identificador&gt;</code>, con una duración
                predeterminada de hasta dos años.
              </p>
              <a
                href="https://support.google.com/analytics/answer/11397207?hl=es"
                target="_blank"
                rel="noopener noreferrer"
                >Información de cookies de Google Analytics</a
              >
            </article>

            <article>
              <span>Asistencia</span>
              <h3>Chat de Tawk.to</h3>
              <p>
                Permite iniciar y mantener una conversación de soporte. Puede
                guardar un identificador del visitante, datos de conexión y
                almacenamiento temporal. Sus elementos pueden durar durante la
                sesión o hasta seis meses, según su función.
              </p>
              <a
                href="https://help.tawk.to/es/article/%C2%BFqu%C3%A9-son-las-cookies-del-sitio-web-tawkto-y-para-qu%C3%A9-sirven"
                target="_blank"
                rel="noopener noreferrer"
                >Información de cookies de Tawk.to</a
              >
            </article>
          </div>
        </section>

        <section>
          <h2>4. Cómo administrar tu elección</h2>
          <p>
            Puedes aceptar o rechazar las tecnologías opcionales desde el aviso
            inicial. También puedes cambiar tu decisión en cualquier momento
            mediante el enlace “Configurar cookies” ubicado en el pie de página.
            Al rechazarlas, dejamos de activar la medición y el chat en visitas
            posteriores.
          </p>
          <p>
            Tu navegador también permite consultar, bloquear o eliminar cookies
            y datos almacenados. Al borrar el almacenamiento del sitio, se
            eliminarán también la bolsa, el tema y la preferencia de cookies
            guardados en ese dispositivo.
          </p>
        </section>

        <section>
          <h2>5. Responsable y contacto</h2>
          <p>
            {{ store.legalName || `${store.name} Perfumes`
            }}<template v-if="store.taxId"
              >, identificada con NIT {{ store.taxId }}</template
            >, es responsable de las decisiones sobre el uso de estas
            tecnologías en este sitio.
          </p>
          <p v-if="store.contactEmail || whatsappUrl">
            Para preguntas relacionadas con esta política o con tus datos
            personales, puedes escribirnos
            <template v-if="store.contactEmail">
              al correo
              <a :href="`mailto:${store.contactEmail}`">{{
                store.contactEmail
              }}</a
              ><template v-if="whatsappUrl"> o </template></template
            ><a
              v-if="whatsappUrl"
              :href="whatsappUrl"
              target="_blank"
              rel="noopener noreferrer"
              >por nuestro canal de WhatsApp</a
            >.
          </p>
        </section>

        <section>
          <h2>6. Cambios a esta política</h2>
          <p>
            Podemos actualizar esta política cuando cambien las tecnologías,
            proveedores o requisitos aplicables. La fecha de la versión vigente
            siempre aparecerá al inicio de esta página.
          </p>
        </section>
      </div>
    </div>
  </article>
</template>
