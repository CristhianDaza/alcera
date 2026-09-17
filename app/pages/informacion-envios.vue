<script setup lang="ts">
const store = useStore();

usePageSeo(
  computed(() => `Información de envíos · ${store.value.name}`),
  `Consulta cómo se acuerdan la cobertura, el costo, el plazo, el despacho y el seguimiento de los pedidos de ${store.value.name} en Colombia.`,
);
</script>

<template>
  <article class="shell section legal-page">
    <nav class="breadcrumbs" aria-label="Ruta de navegación">
      <NuxtLink to="/">Inicio</NuxtLink> /
      <span aria-current="page">Información de envíos</span>
    </nav>

    <header class="legal-page__hero">
      <span class="eyebrow">DE ALCÉRA A TU PUERTA</span>
      <h1>Información de envíos</h1>
      <p>
        El envío se cotiza y acuerda contigo antes de confirmar la compra. Aquí
        encontrarás el proceso y cómo actuar frente a una novedad.
      </p>
      <span class="legal-page__updated"
        >Última actualización: 16 de septiembre de 2026</span
      >
    </header>

    <div class="legal-page__layout">
      <nav class="legal-page__index" aria-label="Contenido de esta página">
        <strong>En esta página</strong>
        <a href="#cobertura">Cobertura</a>
        <a href="#costo">Costo</a>
        <a href="#plazo">Procesamiento y plazo</a>
        <a href="#seguimiento">Seguimiento</a>
        <a href="#datos">Datos de entrega</a>
        <a href="#novedades">Novedades</a>
      </nav>

      <div class="legal-page__content">
        <section class="legal-shipping-summary" aria-label="Resumen del envío">
          <div>
            <span>COBERTURA</span>
            <strong>Colombia</strong>
          </div>
          <div>
            <span>COSTO</span>
            <strong>Se confirma antes de comprar</strong>
          </div>
          <div>
            <span>PLAZO</span>
            <strong>Se informa con la confirmación</strong>
          </div>
        </section>

        <section id="cobertura">
          <h2>1. Cobertura</h2>
          <p>
            {{ store.name }} atiende solicitudes de envío dentro de Colombia. La
            cobertura específica depende de que exista servicio disponible hacia
            la ciudad, municipio o zona indicada y se valida antes de confirmar
            la compra.
          </p>
          <p>
            El código actual no define una transportadora única. La empresa que
            realizará el despacho se informa cuando se coordina el pedido.
          </p>
        </section>

        <section id="costo">
          <h2>2. Costo y quién lo asume</h2>
          <p>
            El precio mostrado en el catálogo y el subtotal de la bolsa no
            incluyen el envío. Después de registrar la solicitud, cotizamos el
            transporte según el destino y las condiciones del pedido.
          </p>
          <p>
            Antes de confirmar la compra te informaremos el valor y quién debe
            asumirlo. Solo se incorporará al total cuando lo hayas aceptado; si
            no estás de acuerdo, puedes desistir de la solicitud sin que exista
            todavía una compra confirmada.
          </p>
        </section>

        <section id="plazo">
          <h2>3. Procesamiento y tiempo de entrega</h2>
          <p>
            El registro en la bolsa crea una solicitud. Primero validamos
            disponibilidad, costo de envío, forma de pago y datos de entrega por
            WhatsApp. El procesamiento y despacho comienzan según las
            condiciones confirmadas y el estado del pago acordado.
          </p>
          <div class="legal-callout legal-callout--caution">
            <strong>Sin plazo comercial fijo configurado</strong>
            <p>
              La tienda no tiene actualmente un tiempo de entrega definido en su
              configuración. Informaremos un plazo antes de confirmar cada
              compra. Si no se pacta uno, se aplica el máximo legal previsto
              para comercio electrónico, actualmente treinta (30) días
              calendario desde el día siguiente a la comunicación del pedido.
            </p>
          </div>
          <p>
            Los tiempos informados pueden verse afectados por la ubicación,
            horarios de operación, alta demanda, novedades de la transportadora
            o hechos fuera del control razonable de las partes. Si surge una
            demora, te comunicaremos la novedad y las alternativas aplicables.
          </p>
        </section>

        <section id="seguimiento">
          <h2>4. Despacho y seguimiento</h2>
          <p>
            Cuando la transportadora genere una guía o referencia de seguimiento
            y esta se encuentre disponible, la compartiremos por el canal de
            atención utilizado para confirmar el pedido. La ausencia temporal de
            actualización en la guía no significa por sí sola que el paquete no
            esté en tránsito.
          </p>
        </section>

        <section id="datos">
          <h2>5. Revisa tus datos de entrega</h2>
          <p>
            Al confirmar la compra, proporciona nombre de quien recibe,
            dirección completa, ciudad y departamento, número de contacto y las
            indicaciones necesarias para ubicar el destino. Revisa estos datos
            antes del despacho.
          </p>
          <p>
            Una dirección o teléfono incorrectos pueden causar devoluciones,
            reprogramaciones o costos adicionales. Si detectas un error,
            comunícalo de inmediato. Te indicaremos si aún es posible corregir
            la guía y, antes de generarlos, los costos que legalmente debas
            asumir por una nueva gestión de transporte.
          </p>
        </section>

        <section id="novedades">
          <h2>6. Novedades, pérdida o afectación</h2>
          <p>
            Si el seguimiento no avanza, la entrega aparece cumplida y no la
            recibiste, o el paquete llega abierto, golpeado o con derrames,
            contáctanos con la referencia del pedido y la guía. Cuando exista
            afectación visible, conserva el empaque y toma fotografías del
            estado exterior e interior.
          </p>
          <p>
            Coordinaremos la revisión con la transportadora y te informaremos el
            avance. Este trámite no limita la garantía ni los demás derechos que
            puedan corresponder. Para un producto incorrecto, incompleto o
            afectado consulta
            <NuxtLink to="/cambios-devoluciones"
              >Cambios, devoluciones y garantías</NuxtLink
            >.
          </p>
          <LegalBusinessIdentity />
        </section>
      </div>
    </div>
  </article>
</template>
