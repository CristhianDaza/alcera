<script setup lang="ts">
const store = useStore();
const { openPreferences } = useCookieConsent();

usePageSeo(
  computed(() => `Política de privacidad · ${store.value.name}`),
  `Conoce cómo ${store.value.name} recolecta, utiliza y protege tus datos personales, y cómo ejercer tus derechos como titular en Colombia.`,
);
</script>

<template>
  <article class="shell section legal-page">
    <nav class="breadcrumbs" aria-label="Ruta de navegación">
      <NuxtLink to="/">Inicio</NuxtLink> /
      <span aria-current="page">Política de privacidad</span>
    </nav>

    <header class="legal-page__hero">
      <span class="eyebrow">PRIVACIDAD Y DATOS PERSONALES</span>
      <h1>Política de privacidad y tratamiento de datos</h1>
      <p>
        Explicamos de forma clara qué información tratamos, para qué la usamos y
        cómo puedes ejercer tus derechos frente a {{ store.name }}.
      </p>
      <span class="legal-page__updated"
        >Última actualización: 16 de septiembre de 2026</span
      >
    </header>

    <div class="legal-page__layout">
      <nav class="legal-page__index" aria-label="Contenido de esta política">
        <strong>En esta página</strong>
        <a href="#responsable">Responsable</a>
        <a href="#datos">Datos tratados</a>
        <a href="#finalidades">Finalidades</a>
        <a href="#derechos">Tus derechos</a>
        <a href="#solicitudes">Consultas y reclamos</a>
        <a href="#terceros">Proveedores y terceros</a>
        <a href="#cookies">Cookies</a>
        <a href="#seguridad">Seguridad y vigencia</a>
      </nav>

      <div class="legal-page__content">
        <section id="responsable">
          <h2>1. Responsable del tratamiento</h2>
          <p>
            El responsable de decidir sobre el tratamiento de los datos
            personales recopilados mediante este sitio es:
          </p>
          <LegalBusinessIdentity />
          <p>
            Esta política se aplica al sitio de {{ store.name }}, a las
            solicitudes de pedido registradas en él y a la atención que se
            continúa por los canales habilitados.
          </p>
        </section>

        <section id="datos">
          <h2>2. Información que tratamos</h2>
          <p>Según la forma en que utilices la tienda, podemos tratar:</p>
          <ul>
            <li>
              Nombre, número celular o de WhatsApp, ciudad y departamento que
              suministras al registrar una solicitud.
            </li>
            <li>
              Productos consultados, cantidades, subtotal, estado, historial y
              referencia de la solicitud o pedido.
            </li>
            <li>
              Mensajes y datos que decidas compartir al continuar la atención
              por WhatsApp, Telegram o el chat, cuando esos canales estén
              habilitados.
            </li>
            <li>
              Datos técnicos y de navegación, como páginas visitadas,
              interacciones, tipo de dispositivo e identificadores en línea,
              únicamente para medición opcional cuando la autorices.
            </li>
            <li>
              Información técnica indispensable para seguridad, prevención de
              solicitudes repetidas y funcionamiento de la bolsa y del sitio.
            </li>
          </ul>
          <div class="legal-callout">
            <strong>Información de pago</strong>
            <p>
              El sitio no captura ni almacena números de tarjeta, credenciales
              bancarias ni datos de una pasarela de pagos. El pago y el envío se
              acuerdan después por WhatsApp. Si en ese momento interviene una
              entidad financiera u otro proveedor, esa entidad tratará los datos
              necesarios bajo sus propias condiciones.
            </p>
          </div>
        </section>

        <section id="finalidades">
          <h2>3. Para qué usamos los datos</h2>
          <ul>
            <li>
              Registrar, verificar y gestionar solicitudes de pedido, incluida
              la disponibilidad y el precio de los productos.
            </li>
            <li>
              Contactarte para confirmar la compra, el pago, el costo de envío y
              los datos necesarios para la entrega.
            </li>
            <li>
              Atender preguntas, peticiones, quejas, reclamos, garantías,
              retractos, reversiones y novedades de transporte.
            </li>
            <li>
              Conservar soportes de la relación comercial y cumplir deberes
              legales, contables, contractuales y de protección al consumidor.
            </li>
            <li>
              Proteger el sitio, limitar abusos y prevenir solicitudes
              duplicadas o comportamientos fraudulentos.
            </li>
            <li>
              Medir el uso del sitio y mejorarlo mediante Firebase Analytics,
              solo después de aceptar las tecnologías opcionales.
            </li>
          </ul>
          <p>
            No utilizamos los datos entregados para una solicitud de pedido con
            el fin de enviarte publicidad por el solo hecho de comprar. Las
            comunicaciones comerciales requieren una base jurídica o
            autorización aplicable y siempre podrás pedir que cesen.
          </p>
        </section>

        <section id="derechos">
          <h2>4. Derechos de las personas titulares</h2>
          <p>De acuerdo con la Ley 1581 de 2012, puedes, entre otros:</p>
          <ul>
            <li>Conocer, actualizar y rectificar tus datos personales.</li>
            <li>
              Solicitar prueba de la autorización, cuando esta sea exigible.
            </li>
            <li>Preguntar qué uso hemos dado a tu información.</li>
            <li>Presentar consultas y reclamos.</li>
            <li>
              Solicitar la supresión de datos o revocar la autorización cuando
              legalmente proceda, sin afectar obligaciones legales o
              contractuales que exijan conservarlos.
            </li>
            <li>
              Acceder gratuitamente a los datos objeto de tratamiento en los
              casos previstos por la ley.
            </li>
            <li>
              Presentar quejas ante la Superintendencia de Industria y Comercio
              una vez agotado el trámite previo aplicable ante el responsable.
            </li>
          </ul>
        </section>

        <section id="solicitudes">
          <h2>5. Consultas, reclamos y solicitudes</h2>
          <p v-if="store.contactEmail">
            Envía tu solicitud a
            <a :href="`mailto:${store.contactEmail}`">{{
              store.contactEmail
            }}</a
            >. Incluye tu nombre, una descripción clara de lo que solicitas, un
            medio para recibir respuesta y, cuando resulte necesario, los
            documentos que permitan acreditar tu identidad o representación.
          </p>
          <p v-else>
            Presenta tu solicitud por alguno de los canales de atención visibles
            del sitio. Antes de poner la tienda en producción debe configurarse
            un correo electrónico para este trámite.
          </p>
          <p>
            Las consultas se atienden, como máximo, dentro de los diez (10) días
            hábiles siguientes a su recepción. Si no es posible responder en ese
            plazo, se informará la causa y la nueva fecha, que no podrá superar
            los cinco (5) días hábiles adicionales.
          </p>
          <p>
            Los reclamos deben identificar al titular, describir los hechos,
            indicar los datos de contacto y acompañar los soportes disponibles.
            Si están incompletos, se solicitará su corrección en los términos
            legales. Un reclamo completo se atiende, como máximo, dentro de los
            quince (15) días hábiles siguientes a su recepción; cuando no sea
            posible, se informará la razón y la fecha de respuesta, que no podrá
            superar ocho (8) días hábiles adicionales.
          </p>
        </section>

        <section id="terceros">
          <h2>6. Encargados, proveedores y transferencias</h2>
          <p>
            Podemos permitir el acceso estrictamente necesario a proveedores que
            apoyan la operación. En el código actual intervienen:
          </p>
          <ul>
            <li>
              <strong>Google Firebase:</strong> base de datos de pedidos y
              configuración, autenticación administrativa y, con consentimiento,
              analítica.
            </li>
            <li>
              <strong>WhatsApp (Meta) y Telegram:</strong> comunicación cuando
              eliges abrir esos canales y se encuentran habilitados.
            </li>
            <li>
              <strong>Tawk.to:</strong> chat de atención, únicamente después de
              aceptar tecnologías opcionales y cuando esté habilitado.
            </li>
            <li>
              <strong>Cloudinary:</strong> alojamiento y entrega de imágenes del
              catálogo; no se le envían los datos del formulario de pedido.
            </li>
            <li>
              <strong>Empresas de transporte:</strong> si confirmas una compra,
              la información mínima necesaria para entregar el pedido podrá
              comunicarse a la transportadora que se acuerde contigo.
            </li>
          </ul>
          <p>
            Algunos proveedores pueden operar infraestructura fuera de Colombia.
            En esos casos se aplicarán los requisitos legales sobre transmisión
            o transferencia internacional de datos y las medidas contractuales
            que correspondan. No vendemos tus datos personales.
          </p>
        </section>

        <section id="cookies">
          <h2>7. Cookies y tecnologías similares</h2>
          <p>
            La tienda usa almacenamiento local y de sesión para recordar la
            bolsa, el tema, las preferencias del recomendador, tu decisión de
            cookies y un intento temporal de solicitud. Firebase Analytics y el
            chat de Tawk.to solo se activan si aceptas las tecnologías
            opcionales.
          </p>
          <p>
            Consulta los detalles en la
            <NuxtLink to="/politica-de-cookies">Política de cookies</NuxtLink>
            o
            <button
              class="legal-inline-button"
              type="button"
              @click="openPreferences"
            >
              cambia tu elección
            </button>
            en cualquier momento.
          </p>
        </section>

        <section id="seguridad">
          <h2>8. Seguridad, conservación y vigencia</h2>
          <p>
            Adoptamos medidas administrativas y técnicas razonables para evitar
            pérdida, alteración, consulta, uso o acceso no autorizado. Ningún
            sistema es completamente infalible, por lo que revisamos estas
            medidas de acuerdo con los riesgos y la evolución del servicio.
          </p>
          <p>
            Conservamos la información durante el tiempo necesario para las
            finalidades descritas y para atender obligaciones legales o
            contractuales. Después se elimina, anonimiza o restringe su uso
            cuando corresponda.
          </p>
          <p>
            Esta política rige desde la fecha indicada al inicio. Los cambios
            sustanciales que afecten la identificación del responsable o las
            finalidades serán comunicados por medios adecuados antes de su
            implementación cuando la normativa así lo exija.
          </p>
          <p class="legal-source-note">
            Marco principal: Ley 1581 de 2012 y capítulo 25 del Decreto 1074 de
            2015, además de las instrucciones aplicables de la Superintendencia
            de Industria y Comercio.
          </p>
        </section>
      </div>
    </div>
  </article>
</template>
