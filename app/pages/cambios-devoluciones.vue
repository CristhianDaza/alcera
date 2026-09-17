<script setup lang="ts">
const store = useStore();

usePageSeo(
  computed(() => `Cambios, devoluciones y garantías · ${store.value.name}`),
  `Conoce cómo solicitar un cambio, garantía, retracto o reversión de pago, y cómo reportar productos incorrectos o afectados durante el transporte.`,
);
</script>

<template>
  <article class="shell section legal-page">
    <nav class="breadcrumbs" aria-label="Ruta de navegación">
      <NuxtLink to="/">Inicio</NuxtLink> /
      <span aria-current="page">Cambios, devoluciones y garantías</span>
    </nav>

    <header class="legal-page__hero">
      <span class="eyebrow">SOLUCIONES PARA TU PEDIDO</span>
      <h1>Cambios, devoluciones y garantías</h1>
      <p>
        No todas las solicitudes significan lo mismo. Identifica tu caso para
        saber qué información enviar y qué solución corresponde.
      </p>
      <span class="legal-page__updated"
        >Última actualización: 16 de septiembre de 2026</span
      >
    </header>

    <div class="legal-page__layout">
      <nav class="legal-page__index" aria-label="Contenido de esta página">
        <strong>Identifica tu caso</strong>
        <a href="#voluntario">Cambio voluntario</a>
        <a href="#garantia">Garantía legal</a>
        <a href="#retracto">Derecho de retracto</a>
        <a href="#reversion">Reversión del pago</a>
        <a href="#incorrecto">Pedido incorrecto</a>
        <a href="#transporte">Daño en transporte</a>
        <a href="#solicitud">Cómo solicitar ayuda</a>
      </nav>

      <div class="legal-page__content">
        <section class="legal-case-grid" aria-label="Resumen de alternativas">
          <article>
            <span>POR GUSTO O PREFERENCIA</span>
            <h2>Cambio voluntario</h2>
            <p>Depende de una política comercial adicional de la tienda.</p>
          </article>
          <article>
            <span>HAY UN DEFECTO</span>
            <h2>Garantía</h2>
            <p>Protege frente a problemas de calidad o idoneidad.</p>
          </article>
          <article>
            <span>COMPRA A DISTANCIA</span>
            <h2>Retracto</h2>
            <p>Permite deshacer la compra cuando legalmente procede.</p>
          </article>
          <article>
            <span>PAGO ELECTRÓNICO</span>
            <h2>Reversión</h2>
            <p>Aplica a causales y trámites específicos ante varios actores.</p>
          </article>
        </section>

        <section id="voluntario">
          <h2>1. Cambio voluntario</h2>
          <p>
            Es el cambio que se solicita porque prefieres otra fragancia,
            presentación o producto, aunque lo recibido esté correcto y en buen
            estado. Es distinto de la garantía y del retracto.
          </p>
          <div class="legal-callout legal-callout--caution">
            <strong>No ofrecemos cambios por preferencia personal</strong>
            <p>
              {{ store.name }} no ofrece cambios voluntarios por gusto, cambio
              de opinión, preferencia olfativa, elección incorrecta de
              fragancia, presentación o tamaño, cuando el producto entregado
              corresponde al pedido y se encuentra en buen estado.
            </p>
            <p>
              Solo se aplicará una política diferente cuando una promoción o
              condición comercial específica lo indique expresamente. Esta regla
              no limita el derecho de retracto cuando legalmente proceda, la
              garantía legal ni los demás derechos irrenunciables del
              consumidor.
            </p>
          </div>
        </section>

        <section id="garantia">
          <h2>2. Garantía legal</h2>
          <p>
            La garantía aplica cuando el producto no cumple las condiciones de
            calidad, idoneidad o seguridad exigibles, por ejemplo si presenta un
            defecto atribuible al producto. Para solicitarla:
          </p>
          <ol>
            <li>
              Contacta a {{ store.name }} e indica la referencia del pedido y el
              problema encontrado.
            </li>
            <li>
              Adjunta fotografías, video u otra evidencia razonable que permita
              evaluar el estado del producto, sin que esto impida presentar la
              reclamación por otros medios idóneos.
            </li>
            <li>
              Conserva el producto y sus elementos mientras se informa el
              procedimiento de revisión o recogida.
            </li>
          </ol>
          <p>
            La solución se determinará según el caso y la ley: reparación cuando
            resulte viable, reposición o devolución del dinero en los eventos
            legalmente previstos. Hacer efectiva la garantía no genera cobros al
            consumidor por los gastos necesarios para su atención.
          </p>

          <div class="legal-callout">
            <strong>Preferencias y percepción olfativa</strong>
            <p>
              La percepción de una fragancia, sus notas, intensidad, proyección
              y duración puede variar según factores como el tipo de piel, el
              clima, la forma de aplicación, el almacenamiento y la percepción
              individual. La insatisfacción subjetiva con el aroma o con el
              desempeño esperado no constituye por sí sola un defecto de calidad
              ni activa automáticamente la garantía legal.
            </p>
            <p>
              Lo anterior no limita las reclamaciones relacionadas con defectos
              objetivos, alteraciones del producto, falta de autenticidad,
              incumplimiento de las características expresamente anunciadas o
              cualquier otro evento protegido por la legislación colombiana.
            </p>
          </div>
        </section>

        <section id="retracto">
          <h2>3. Derecho de retracto</h2>
          <p>
            En una venta a distancia, puedes ejercer el derecho de retracto
            dentro de los cinco (5) días hábiles siguientes a la entrega,
            siempre que resulte legalmente procedente. Debes comunicar de manera
            clara tu decisión y devolver el producto por los mismos medios y en
            las mismas condiciones en que lo recibiste.
          </p>

          <ul>
            <li>
              Cuando proceda el retracto, los costos de transporte y los demás
              costos asociados a la devolución física del producto serán
              asumidos por el consumidor, conforme al artículo 47 de la Ley 1480
              de 2011.
            </li>
            <li>
              {{ store.name }} no cobrará por tramitar el retracto. Los costos
              financieros correspondientes a la devolución del dinero serán
              asumidos por quien legalmente corresponda y no se descontarán
              indebidamente del valor que deba restituirse al consumidor.
            </li>
            <li>
              Debes proporcionar la información necesaria para efectuar la
              devolución del dinero y seguir las instrucciones razonables
              comunicadas para entregar el producto.
            </li>
            <li>
              En comercio electrónico, una vez cumplidos los requisitos
              aplicables, la devolución del dinero se realizará dentro del plazo
              legal correspondiente, sin exceder quince (15) días calendario
              cuando resulte aplicable.
            </li>
          </ul>

          <div class="legal-callout legal-callout--caution">
            <strong>Estado obligatorio del producto</strong>
            <p>
              Cuando el producto haya sido entregado nuevo, sellado y sin uso,
              deberá devolverse en esas mismas condiciones. Debe conservar la
              caja original, el celofán o sello de seguridad del fabricante
              cuando exista, las etiquetas, accesorios y la totalidad de su
              contenido, sin señales de uso, aplicación, alteración, deterioro o
              apertura del sello atribuibles al consumidor.
            </p>
            <p>
              La apertura del embalaje exterior utilizado únicamente para el
              transporte no se considerará por sí sola uso del producto. Sin
              embargo, la apertura, ruptura o retiro del celofán o sello
              original del fabricante podrá demostrar que el producto ya no se
              encuentra en las mismas condiciones en que fue recibido.
            </p>
            <p>
              Cuando el producto no sea devuelto en las mismas condiciones en
              que fue entregado, la solicitud de retracto podrá resultar
              improcedente, previa evaluación del caso y sin perjuicio de los
              derechos irrenunciables del consumidor ni de las excepciones
              previstas legalmente.
            </p>
          </div>
        </section>

        <section id="reversion">
          <h2>4. Reversión del pago</h2>
          <p>
            Si la compra se realizó por comercio electrónico y se pagó con
            tarjeta u otro instrumento electrónico, puedes solicitar reversión
            cuando exista fraude, una operación no solicitada, el producto no
            llegue, sea distinto del pedido o sea defectuoso.
          </p>
          <p>
            Dentro de los cinco (5) días hábiles siguientes al momento legal
            aplicable debes presentar la queja ante {{ store.name }}, devolver
            el producto cuando proceda y notificar la reclamación al emisor del
            instrumento de pago. Como el sitio no procesa pagos directamente,
            también deberás seguir las instrucciones de la entidad mediante la
            cual pagaste.
          </p>
        </section>

        <section id="incorrecto">
          <h2>5. Producto incorrecto o pedido incompleto</h2>
          <p>
            Repórtalo tan pronto lo notes. Indica la referencia del pedido, qué
            producto o cantidad esperabas y qué recibiste. Si es posible,
            adjunta fotografías del contenido y del rótulo del envío. No uses el
            producto equivocado mientras se coordina la recogida o corrección.
          </p>
          <p>
            Verificaremos la confirmación del pedido y coordinaremos, sin costo
            para ti cuando el error sea atribuible a la tienda, el envío de lo
            faltante o correcto, la recogida del producto equivocado o la
            solución legal que corresponda.
          </p>
        </section>

        <section id="transporte">
          <h2>6. Producto afectado durante el transporte</h2>
          <p>
            Si el paquete llega abierto, golpeado, con derrames o con otra señal
            de afectación, deja constancia ante quien realiza la entrega cuando
            sea posible y comunícalo inmediatamente a {{ store.name }}. Conserva
            el empaque, la etiqueta, el producto y toma fotografías del estado
            exterior e interior.
          </p>
          <p>
            Revisaremos el caso con la información del despacho y la
            transportadora acordada. Una investigación de transporte no impide
            el ejercicio de la garantía ni de otros derechos que resulten
            aplicables.
          </p>
        </section>

        <section id="solicitud">
          <h2>7. Cómo solicitar ayuda</h2>
          <p v-if="store.contactEmail">
            Escribe a
            <a :href="`mailto:${store.contactEmail}`">{{
              store.contactEmail
            }}</a>
            con tu nombre, referencia del pedido, explicación del caso, solución
            que solicitas y soportes disponibles.
          </p>
          <p v-else>
            Utiliza uno de los canales de atención visibles del sitio e indica
            tu nombre, referencia del pedido, explicación del caso, solución que
            solicitas y soportes disponibles. Antes de publicar la tienda debe
            configurarse el correo para reclamaciones.
          </p>
          <LegalBusinessIdentity />
          <p>
            Te informaremos los pasos de revisión, devolución o recogida que
            correspondan. No envíes un producto sin recibir antes las
            instrucciones y datos de destino. Esta página complementa, sin
            reemplazar, los
            <NuxtLink to="/terminos-y-condiciones"
              >Términos y condiciones</NuxtLink
            >.
          </p>
        </section>
      </div>
    </div>
  </article>
</template>
