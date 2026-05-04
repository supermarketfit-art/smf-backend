import dotenv from 'dotenv'
dotenv.config()

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN
const PHONE_ID = process.env.WHATSAPP_PHONE_ID
const API_URL = 'https://graph.facebook.com/v19.0/' + PHONE_ID + '/messages'

const enviarMensaje = async (para, mensaje) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + WHATSAPP_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: para,
        type: 'text',
        text: { body: mensaje }
      })
    })
    const data = await response.json()
    if (!response.ok) throw new Error(JSON.stringify(data.error))
    console.log('WhatsApp enviado a ' + para)
    return { ok: true, data }
  } catch (error) {
    console.error('Error WhatsApp:', error.message)
    return { ok: false, error: error.message }
  }
}

export const notificarBienvenida = async (telefono, nombre) => {
  return enviarMensaje(telefono, 'Bienvenido a SuperMarket Fit ' + nombre + '! Tu tienda de frutas y verduras. Come bien, vive mejor.')
}

export const notificarPedidoConfirmado = async (telefono, pedido) => {
  return enviarMensaje(telefono, 'SMF: Pago confirmado! Pedido #' + pedido.id.substring(0,8).toUpperCase() + ' en preparacion. Total: $' + pedido.total.toLocaleString('es-CO'))
}

export const notificarPedidoEnCamino = async (telefono, pedido) => {
  return enviarMensaje(telefono, 'SMF: Tu pedido #' + pedido.id.substring(0,8).toUpperCase() + ' esta en camino! Tiempo estimado: 20-35 minutos.')
}

export const notificarPedidoEntregado = async (telefono, pedido) => {
  return enviarMensaje(telefono, 'SMF: Tu pedido #' + pedido.id.substring(0,8).toUpperCase() + ' fue entregado! Gracias por confiar en nosotros.')
}

export const notificarFruverPedidoNuevo = async (telefono, pedido) => {
  return enviarMensaje(telefono, 'SMF - Nuevo pedido #' + pedido.id.substring(0,8).toUpperCase() + '. Subtotal: $' + pedido.subtotal.toLocaleString('es-CO') + '. Por favor prepara el pedido.')
}

export default { notificarBienvenida, notificarPedidoConfirmado, notificarPedidoEnCamino, notificarPedidoEntregado, notificarFruverPedidoNuevo }