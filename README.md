# ALCÉRA

## Configuración del QR Bre-B

El checkout carga el QR estático del comercio desde la variable pública
`NUXT_PUBLIC_BREB_QR_IMAGE`. En producción, configura esa variable en el
proveedor de hosting con la URL HTTPS de la imagen QR y vuelve a desplegar.
El cliente debe poder acceder a esa imagen sin iniciar sesión. Si la variable
está vacía o no contiene una URL HTTPS válida, el pago Bre-B no se ofrece.

Bre-B utiliza los precios vigentes del catálogo de Firestore y no incluye el
envío; el envío se paga al recibir. El cliente solo reporta el pago y un
administrador lo verifica manualmente. El flujo anterior de coordinación por
WhatsApp sigue disponible. Esta aplicación no tiene una pasarela Wompi
conectada; para aceptar pagos Wompi hace falta configurar e integrar esa
pasarela por separado.
