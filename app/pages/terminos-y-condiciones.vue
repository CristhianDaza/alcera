<script setup lang="ts">
const store = useStore();

usePageSeo(
  computed(() => `Términos y condiciones · ${store.value.name}`),
  `Consulta las condiciones de uso, pedidos, pagos, envíos, retracto y garantía aplicables a la tienda en línea de ${store.value.name}.`,
);
</script>

<template>
  <article class="shell section legal-page">
    <nav class="breadcrumbs" aria-label="Ruta de navegación">
      <NuxtLink to="/">Inicio</NuxtLink> /
      <span aria-current="page">Términos y condiciones</span>
    </nav>

    <header class="legal-page__hero">
      <span class="eyebrow">CONDICIONES DE LA TIENDA</span>
      <h1>Términos y condiciones</h1>
      <p>
        Estas reglas explican cómo funciona el catálogo, cómo se registra y
        confirma un pedido y qué derechos acompañan una compra en
        {{ store.name }}.
      </p>
      <span class="legal-page__updated"
        >Última actualización: 16 de septiembre de 2026</span
      >
    </header>

    <div class="legal-page__layout">
      <nav class="legal-page__index" aria-label="Contenido de los términos">
        <strong>En esta página</strong>
        <a href="#identificacion">Identificación y objeto</a>
        <a href="#productos">Productos y precios</a>
        <a href="#compra">Proceso de compra</a>
        <a href="#pago">Pago</a>
        <a href="#envio">Envíos</a>
        <a href="#consumidor">Retracto y reversión</a>
        <a href="#garantia">Garantía y cancelación</a>
        <a href="#uso">Uso y propiedad intelectual</a>
        <a href="#vigencia">Responsabilidad y vigencia</a>
      </nav>

      <div class="legal-page__content">
        <section id="identificacion">
          <h2>1. Identificación y objeto</h2>
          <LegalBusinessIdentity />
          <p>
            {{ store.name }} ofrece productos de perfumería original mediante
            este catálogo electrónico. Al navegar aceptas las reglas de uso del
            sitio. Las obligaciones de una compraventa nacen cuando ambas partes
            confirman el pedido y sus condiciones por el canal de atención, no
            al guardar productos en la bolsa ni al registrar una solicitud.
          </p>
        </section>

        <section id="productos">
          <h2>2. Productos, disponibilidad y representación visual</h2>
          <p>
            Cada ficha informa la marca, descripción, presentación o tamaño,
            precio y disponibilidad conocidos. La disponibilidad se valida de
            nuevo al registrar la solicitud y debe confirmarse antes de pagar.
          </p>
          <p>
            Procuramos que fotografías, colores y proporciones representen el
            producto fielmente. Pueden existir diferencias razonables causadas
            por la pantalla, iluminación o actualizaciones de empaque del
            fabricante que no alteren la referencia adquirida. Ninguna imagen o
            descripción reduce los derechos legales del consumidor.
          </p>
          <h3>Originalidad y marcas</h3>
          <p>
            {{ store.name }} comercializa perfumes originales. Esta afirmación
            no implica ser distribuidor oficial ni tener una relación de
            patrocinio con las marcas del catálogo. Los nombres y signos de
            terceros pertenecen a sus respectivos titulares y se usan para
            identificar los productos ofrecidos.
          </p>
          <h3>Precios y promociones</h3>
          <p>
            Los precios se muestran en pesos colombianos (COP). El subtotal de
            la bolsa corresponde a los productos seleccionados y no incluye el
            envío. El costo del envío y la forma de pago se informan y acuerdan
            por WhatsApp antes de confirmar la compra. Las promociones se
            sujetan a las condiciones, fechas y existencias que se anuncien.
          </p>
          <h3>Errores evidentes</h3>
          <p>
            Si detectamos un error manifiesto de precio, descripción o
            disponibilidad antes de confirmar la compra, lo explicaremos y
            podrás aceptar la información corregida o desistir sin costo. Si el
            pedido ya fue confirmado o pagado, cualquier corrección se
            gestionará respetando la ley, la buena fe y tus derechos; esta regla
            no autoriza cancelaciones arbitrarias.
          </p>
        </section>

        <section id="compra">
          <h2>3. Cómo funciona una compra</h2>
          <ol>
            <li>Seleccionas la presentación y cantidad de cada perfume.</li>
            <li>
              La bolsa muestra los productos y su subtotal en COP, sin envío.
            </li>
            <li>
              Ingresas nombre, número de WhatsApp, ciudad y departamento, y
              autorizas el tratamiento necesario para gestionar la solicitud.
            </li>
            <li>
              El sitio valida precio y disponibilidad y registra una referencia
              de solicitud. Esto aún no reserva productos ni confirma una
              compra.
            </li>
            <li>
              Abres WhatsApp para acordar disponibilidad final, envío y forma de
              pago. La compra queda confirmada cuando ambas partes aceptan estas
              condiciones.
            </li>
          </ol>
          <div class="legal-callout">
            <strong>Antes de pagar</strong>
            <p>
              Revisa la referencia, presentación, cantidad, precio de los
              productos, costo de envío, datos de entrega y tiempo informado.
              Conserva la confirmación enviada por el canal de atención.
            </p>
          </div>
        </section>

        <section id="pago">
          <h2>4. Métodos y confirmación de pago</h2>
          <p>
            Este sitio no integra una pasarela de pago y no recibe datos de
            tarjetas o cuentas bancarias. Las opciones disponibles se informan y
            acuerdan por WhatsApp para cada pedido; no se ofrece desde este
            sitio un método que no haya sido confirmado expresamente.
          </p>
          <p>
            Si el pago se realiza a través de una entidad financiera u otro
            prestador, también se aplicarán sus controles y condiciones. Nunca
            compartas claves, contraseñas ni códigos de autenticación con
            {{ store.name }}.
          </p>
        </section>

        <section id="envio">
          <h2>5. Envíos</h2>
          <p>
            La tienda atiende solicitudes con destino en Colombia. El subtotal
            no incluye transporte: antes de confirmar el pedido se informará el
            costo, quién lo asume, la cobertura disponible y el plazo de entrega
            para que puedas aceptarlos o desistir de la solicitud.
          </p>
          <p>
            El comprador debe suministrar nombre, teléfono, ciudad y dirección
            completos y correctos al confirmar el pedido por el canal de
            atención. Si una novedad de transporte exige corregir datos o
            reprogramar la entrega, ambas partes coordinarán una solución y se
            informarán los costos adicionales que legalmente correspondan antes
            de generarlos.
          </p>
          <p>
            Los eventos ajenos al control razonable de la tienda o de la
            transportadora se informarán oportunamente. Si no se pacta un plazo
            de entrega, se aplica el máximo legal previsto para comercio
            electrónico. Consulta los detalles en
            <NuxtLink to="/informacion-envios">Información de envíos</NuxtLink>.
          </p>
        </section>

        <section id="consumidor">
          <h2>6. Derecho de retracto</h2>
          <p>
            En las ventas a distancia en las que legalmente proceda, puedes
            retractarte dentro de los cinco (5) días hábiles siguientes a la
            entrega. Debes informar claramente tu decisión por el canal de
            atención y devolver el producto por los mismos medios y en las
            mismas condiciones en que lo recibiste.
          </p>
          <p>
            Cuando el producto haya sido entregado nuevo, sellado y sin uso,
            deberá devolverse en esas mismas condiciones, conservando la caja
            original, el celofán o sello de seguridad del fabricante cuando
            exista, las etiquetas, accesorios y la totalidad de su contenido,
            sin señales de uso, aplicación, alteración o deterioro atribuibles
            al consumidor. Abrir únicamente el embalaje exterior de transporte
            no constituye por sí solo uso del producto.
          </p>
          <p>
            Cuando el retracto resulte procedente, los costos de transporte y
            los demás costos asociados a la devolución física serán asumidos por
            el consumidor. Si el producto no se devuelve en las mismas
            condiciones en que fue recibido, la solicitud podrá resultar
            improcedente, previa evaluación del caso y sin limitar los derechos
            irrenunciables del consumidor.
          </p>
          <p>
            Cuando el retracto proceda y se cumplan sus requisitos, el dinero se
            devolverá por el instrumento o medio correspondiente, o por el que
            acuerden las partes, dentro del plazo legal aplicable. La página de
            <NuxtLink to="/cambios-devoluciones"
              >cambios, devoluciones y garantías</NuxtLink
            >
            explica el procedimiento en lenguaje sencillo.
          </p>
          <h3>Reversión del pago</h3>
          <p>
            Si una compra se paga mediante tarjeta u otro instrumento
            electrónico, la reversión puede proceder en los casos legales de
            fraude, operación no solicitada, producto no recibido, producto
            distinto o producto defectuoso. Debes presentar la queja ante
            {{ store.name }} y notificar al emisor del medio de pago dentro de
            los cinco (5) días hábiles previstos por la ley, además de devolver
            el producto cuando corresponda. Esta figura es distinta del retracto
            y de la garantía.
          </p>
        </section>

        <section id="garantia">
          <h2>7. Garantía legal, errores y cancelación</h2>
          <p>
            Si el producto presenta un defecto, no corresponde a lo solicitado o
            tiene una afectación atribuible al producto, comunícate por los
            canales indicados y aporta la referencia del pedido, una descripción
            y evidencia razonable. Se aplicarán las soluciones de garantía legal
            que correspondan —reparación cuando sea viable, reposición o
            devolución del dinero en los eventos previstos— sin cobrar los
            gastos necesarios para hacerla efectiva.
          </p>
          <p>
            La garantía no se confunde con un cambio voluntario ni con el
            derecho de retracto. {{ store.name }} no ofrece cambios voluntarios
            por gusto, cambio de opinión, preferencia olfativa o elección
            incorrecta de fragancia, presentación o tamaño, salvo que una
            promoción o condición comercial específica indique expresamente lo
            contrario.
          </p>
          <p>
            Esta política no limita la garantía legal, el derecho de retracto
            cuando proceda ni los demás derechos irrenunciables del consumidor.
            Consulta el procedimiento completo en
            <NuxtLink to="/cambios-devoluciones">
              Cambios, devoluciones y garantías </NuxtLink
            >.
          </p>
          <h3>Cancelación</h3>
          <p>
            Una solicitud sin confirmar puede dejarse sin efecto por el canal de
            atención. Si la compra ya se confirmó pero todavía no se ha
            despachado, solicita la cancelación cuanto antes; se revisará el
            estado del pedido y las obligaciones ya ejecutadas. Después del
            despacho aplican, según el caso, el retracto, la garantía, la
            reversión u otros derechos legales. La cancelación nunca limita los
            derechos irrenunciables del consumidor.
          </p>
        </section>

        <section id="uso">
          <h2>8. Uso del sitio y propiedad intelectual</h2>
          <p>
            Puedes navegar y utilizar la tienda para fines personales y lícitos.
            No está permitido interferir con su seguridad, intentar acceder a
            áreas restringidas, automatizar solicitudes abusivas, suplantar a
            otras personas ni utilizar el sitio para fraude o actividades
            ilegales.
          </p>
          <p>
            La marca {{ store.name }}, el diseño del sitio, fotografías propias,
            textos, código y demás contenido original están protegidos por las
            normas aplicables. Las marcas, nombres e imágenes de productos de
            terceros pertenecen a sus respectivos propietarios. Su aparición en
            el catálogo no transfiere derechos ni implica patrocinio.
          </p>
        </section>

        <section id="vigencia">
          <h2>9. Responsabilidad, cambios y legislación</h2>
          <p>
            Procuramos mantener la tienda disponible y su información correcta,
            pero pueden presentarse mantenimientos, interrupciones o errores.
            Actuaremos con diligencia para corregirlos. Nada de estos términos
            excluye responsabilidades que la ley atribuya a la tienda ni limita
            los derechos irrenunciables del consumidor.
          </p>
          <p>
            Podemos actualizar estos términos por cambios operativos o legales.
            La versión publicada regirá hacia el futuro desde la fecha indicada
            y no modificará retroactivamente las condiciones de compras ya
            confirmadas, salvo acuerdo válido o mandato legal.
          </p>
          <p>
            Estos términos se rigen por las leyes de la República de Colombia.
            Puedes acudir a los mecanismos de atención y a las autoridades
            competentes, incluida la
            <a
              href="https://www.sic.gov.co/"
              target="_blank"
              rel="noopener noreferrer"
              >Superintendencia de Industria y Comercio</a
            >.
          </p>
          <p class="legal-source-note">
            Marco principal: Ley 1480 de 2011, modificada entre otras por la Ley
            2439 de 2024; Decreto 1074 de 2015 y Decreto 587 de 2016.
          </p>
        </section>
      </div>
    </div>
  </article>
</template>
