import { Resend } from 'resend'
import dotenv from 'dotenv'

dotenv.config()

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev'

// Función base para enviar emails
const enviarEmail = async (para, asunto, html) => {
  try {
    const data = await resend.emails.send({
      from: FROM,
      to: para,
      subject: asunto,
      html
    })
    console.log(`✅ Email enviado a ${para} — ID: ${data.id}`)
    return { ok: true, id: data.id }
  } catch (error) {
    console.error(`❌ Error enviando email a ${para}:`, error.message)
    return { ok: false, error: error.message }
  }
}

// Bienvenida
export const emailBienvenida = async (email, nombre) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px">
      <div style="background:#2D7A3A;padding:20px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="color:white;margin:0;font-size:24px">🥦 SuperMarket Fit</h1>
        <p style="color:#a8d5a2;margin:5px 0 0">Come bien, vive mejor</p>
      </div>
      <div style="background:white;padding:30px;border-radius:0 0 12px 12px">
        <h2 style="color:#2D7A3A">¡Bienvenido, ${nombre}! 👋</h2>
        <p style="color:#555;line-height:1.6">
          Estamos felices de tenerte en la familia SMF. Ahora tienes acceso a:
        </p>
        <div style="background:#f0f9f1;border-left:4px solid #2D7A3A;padding:15px;border-radius:4px;margin:20px 0">
          <p style="margin:5px 0;color:#333">🛒 <strong>Tienda virtual</strong> — frutas y verduras frescas de tu barrio</p>
          <p style="margin:5px 0;color:#333">🥗 <strong>Plan nutricional</strong> — personalizado con inteligencia artificial</p>
          <p style="margin:5px 0;color:#333">🚴 <strong>Delivery SMF</strong> — entrega rápida a tu puerta</p>
        </div>
        <div style="text-align:center;margin:30px 0">
          <a href="http://localhost:5173" style="background:#2D7A3A;color:white;padding:14px 30px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">
            Ir a la tienda →
          </a>
        </div>
        <p style="color:#999;font-size:12px;text-align:center">
          SuperMarket Fit · Bogotá, Colombia<br>
          <a href="mailto:contacto@supermarketfit.com" style="color:#2D7A3A">contacto@supermarketfit.com</a>
        </p>
      </div>
    </div>
  `
  return enviarEmail(email, '¡Bienvenido a SuperMarket Fit! 🥦', html)
}

// Pedido confirmado
export const emailPedidoConfirmado = async (email, nombre, pedido) => {
  const itemsHtml = pedido.items.map(i => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${i.producto.nombre}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.cantidad}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${i.subtotal.toLocaleString('es-CO')}</td>
    </tr>
  `).join('')

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px">
      <div style="background:#2D7A3A;padding:20px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="color:white;margin:0;font-size:24px">🥦 SuperMarket Fit</h1>
      </div>
      <div style="background:white;padding:30px;border-radius:0 0 12px 12px">
        <h2 style="color:#2D7A3A">¡Pedido confirmado, ${nombre}! ✅</h2>
        <p style="color:#555">Tu pedido <strong>#${pedido.id.substring(0,8).toUpperCase()}</strong> está siendo preparado.</p>
        
        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          <thead>
            <tr style="background:#f0f9f1">
              <th style="padding:10px;text-align:left;color:#2D7A3A">Producto</th>
              <th style="padding:10px;text-align:center;color:#2D7A3A">Cant.</th>
              <th style="padding:10px;text-align:right;color:#2D7A3A">Subtotal</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <div style="background:#f0f9f1;padding:15px;border-radius:8px;margin:20px 0">
          <p style="margin:5px 0;color:#333">💰 Subtotal: <strong>$${pedido.subtotal.toLocaleString('es-CO')}</strong></p>
          <p style="margin:5px 0;color:#333">🚴 Domicilio: <strong>$${pedido.costoDelivery.toLocaleString('es-CO')}</strong></p>
          <p style="margin:5px 0;color:#2D7A3A;font-size:18px">Total: <strong>$${pedido.total.toLocaleString('es-CO')}</strong></p>
        </div>

        <p style="color:#999;font-size:12px;text-align:center">
          SuperMarket Fit · Come bien, vive mejor 🥦
        </p>
      </div>
    </div>
  `
  return enviarEmail(email, `Pedido #${pedido.id.substring(0,8).toUpperCase()} confirmado ✅`, html)
}

// Pedido entregado
export const emailPedidoEntregado = async (email, nombre, pedido) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px">
      <div style="background:#2D7A3A;padding:20px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="color:white;margin:0;font-size:24px">🥦 SuperMarket Fit</h1>
      </div>
      <div style="background:white;padding:30px;border-radius:0 0 12px 12px">
        <h2 style="color:#2D7A3A">¡Pedido entregado! 🎉</h2>
        <p style="color:#555">
          Hola <strong>${nombre}</strong>, tu pedido <strong>#${pedido.id.substring(0,8).toUpperCase()}</strong> 
          fue entregado exitosamente.
        </p>
        <p style="color:#555">
          Gracias por confiar en SuperMarket Fit. ¡Esperamos que disfrutes tus productos frescos! 🥦🍎
        </p>
        <p style="color:#999;font-size:12px;text-align:center;margin-top:30px">
          SuperMarket Fit · Come bien, vive mejor
        </p>
      </div>
    </div>
  `
  return enviarEmail(email, `¡Tu pedido fue entregado! 🎉`, html)
}

export default { emailBienvenida, emailPedidoConfirmado, emailPedidoEntregado }
