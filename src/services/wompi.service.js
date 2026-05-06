import crypto from 'crypto'
import dotenv from 'dotenv'
dotenv.config()

const WOMPI_PUBLIC_KEY = process.env.WOMPI_PUBLIC_KEY
const WOMPI_PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY
const WOMPI_API = 'https://sandbox.wompi.co/v1'

// Obtener token de aceptación
export const obtenerTokenAceptacion = async () => {
  try {
    console.log('KEY:', WOMPI_PUBLIC_KEY)
    const response = await fetch(`${WOMPI_API}/merchants/${WOMPI_PUBLIC_KEY}`)
    const data = await response.json()
    console.log('Wompi data:', JSON.stringify(data).substring(0, 200))
    return data.data.presigned_acceptance.acceptance_token
  } catch (error) {
    console.error('Error obteniendo token Wompi:', error)
    throw error
  }
}

// Crear transacción en Wompi
export const crearTransaccion = async (pedido, comprador) => {
  try {
    const acceptanceToken = await obtenerTokenAceptacion()

    const referencia = `SMF-${pedido.id.substring(0, 8).toUpperCase()}-${Date.now()}`
    const amountInCents = Math.round(pedido.total * 100)

    const transaccion = {
      acceptance_token: acceptanceToken,
      amount_in_cents: amountInCents,
      currency: 'COP',
      customer_email: comprador.email,
      reference: referencia,
      redirect_url: `http://localhost:5173/pedido/${pedido.id}`,
      customer_data: {
        full_name: comprador.nombre,
        phone_number: comprador.telefono || '3000000000'
      }
    }

    return {
      url: `https://checkout.wompi.co/p/?public-key=${WOMPI_PUBLIC_KEY}&currency=COP&amount-in-cents=${amountInCents}&reference=${referencia}&redirect-url=${encodeURIComponent(transaccion.redirect_url)}`,
      referencia,
      amountInCents
    }
  } catch (error) {
    console.error('Error creando transacción Wompi:', error)
    throw error
  }
}

// Verificar firma del webhook de Wompi
export const verificarFirmaWompi = (payload, signature) => {
  try {
    const secret = process.env.WOMPI_EVENTS_SECRET
    if (!secret) return true
    const hash = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex')
    return hash === signature
  } catch (error) {
    return false
  }
}

export default { obtenerTokenAceptacion, crearTransaccion, verificarFirmaWompi }