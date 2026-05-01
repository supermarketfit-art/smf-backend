import twilio from 'twilio'
import dotenv from 'dotenv'

dotenv.config()

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

const FROM = process.env.TWILIO_WHATSAPP_FROM

// Función base para enviar mensajes
const enviarMensaje = async (para, mensaje) => {
  try {
    const message = await client.messages.create({
      from: FROM,
      to: `whatsapp:${para}`,
      body: mensaje
    })
    console.log(`✅ WhatsApp enviado a ${para} — SID: ${message.sid}`)
    return { ok: true, sid: message.sid }
  } catch (error) {
    console.error(`❌ Error enviando WhatsApp a ${para}:`, error.message)
    return { ok: false, error: error.message }
  }
}

// Notificaciones por evento del pedido
export const notificarPedidoNuevo = async (telefono, pedido, tienda) => {
  const mensaje = `🛒 *SuperMarket Fit*
  
¡Hola! Tu pedido ha sido recibido.

📦 *Pedido #${pedido.id.substring(0, 8).toUpperCase()}*
🏪 Tienda: ${tienda.nombre}
💰 Total: $${pedido.total.toLocaleString('es-CO')}
🚴 Tipo entrega: ${pedido.tipoDelivery === 'RED_SMF' ? 'Domicilio SMF' : 'Recoger en tienda'}

Estado: *Pendiente de pago* ⏳

_SuperMarket Fit — Come bien, vive mejor_ 🥦`

  return enviarMensaje(telefono, mensaje)
}

export const notificarPedidoConfirmado = async (telefono, pedido) => {
  const mensaje = `✅ *SuperMarket Fit*

¡Pago confirmado! Tu pedido está en preparación.

📦 *Pedido #${pedido.id.substring(0, 8).toUpperCase()}*
💰 Total pagado: $${pedido.total.toLocaleString('es-CO')}

Te avisaremos cuando esté listo para envío. 🚴

_SuperMarket Fit — Come bien, vive mejor_ 🥦`

  return enviarMensaje(telefono, mensaje)
}

export const notificarPedidoEnCamino = async (telefono, pedido, delivery) => {
  const mensaje = `🚴 *SuperMarket Fit*

¡Tu pedido está en camino!

📦 *Pedido #${pedido.id.substring(0, 8).toUpperCase()}*
👤 Mensajero: ${delivery.nombre}
📍 Dirección entrega: ${pedido.direccionEntrega}

Tiempo estimado: 20-35 minutos ⏱

_SuperMarket Fit — Come bien, vive mejor_ 🥦`

  return enviarMensaje(telefono, mensaje)
}

export const notificarPedidoEntregado = async (telefono, pedido) => {
  const mensaje = `🎉 *SuperMarket Fit*

¡Tu pedido fue entregado!

📦 *Pedido #${pedido.id.substring(0, 8).toUpperCase()}*

¿Cómo fue tu experiencia? Tu opinión nos ayuda a mejorar.

Gracias por confiar en SMF 🥦
_Come bien, vive mejor_`

  return enviarMensaje(telefono, mensaje)
}

export const notificarFruverPedidoNuevo = async (telefono, pedido, items) => {
  const listaItems = items.map(i =>
    `• ${i.producto.nombre} x${i.cantidad} — $${i.subtotal.toLocaleString('es-CO')}`
  ).join('\n')

  const mensaje = `🔔 *SuperMarket Fit — Nuevo Pedido*

📦 *Pedido #${pedido.id.substring(0, 8).toUpperCase()}*

*Productos:*
${listaItems}

💰 Subtotal: $${pedido.subtotal.toLocaleString('es-CO')}
🚴 Entrega: ${pedido.tipoDelivery === 'RED_SMF' ? 'Domicilio SMF' : 'Pickup'}
📍 Dirección: ${pedido.direccionEntrega || 'Recoger en tienda'}

Por favor prepara el pedido lo antes posible. ✅`

  return enviarMensaje(telefono, mensaje)
}

export const notificarBienvenida = async (telefono, nombre) => {
  const mensaje = `👋 *¡Bienvenido a SuperMarket Fit, ${nombre}!*

Somos tu tienda de frutas y verduras frescas con entrega a domicilio y asesoría nutricional personalizada. 🥦🍎

*¿Qué puedes hacer?*
🛒 Comprar productos frescos de tu fruver más cercano
🥗 Recibir tu plan nutricional personalizado con IA
🚴 Recibir todo en la puerta de tu casa

_Come bien, vive mejor_ ✨`

  return enviarMensaje(telefono, mensaje)
}

export default { 
  notificarPedidoNuevo,
  notificarPedidoConfirmado,
  notificarPedidoEnCamino,
  notificarPedidoEntregado,
  notificarFruverPedidoNuevo,
  notificarBienvenida
}
