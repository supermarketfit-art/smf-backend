import express from 'express'
import { PrismaClient } from '@prisma/client'
import { verificarToken } from '../middleware/auth.middleware.js'
import { crearTransaccion, verificarFirmaWompi } from '../services/wompi.service.js'

const router = express.Router()
const prisma = new PrismaClient()

// POST /api/pagos/iniciar/:pedidoId
// El comprador inicia el pago de un pedido
router.post('/iniciar/:pedidoId', verificarToken, async (req, res) => {
  try {
    const pedido = await prisma.pedido.findUnique({
      where: { id: req.params.pedidoId },
      include: {
        comprador: { select: { nombre: true, email: true, telefono: true } }
      }
    })

    if (!pedido) {
      return res.status(404).json({ ok: false, mensaje: 'Pedido no encontrado' })
    }

    if (pedido.compradorId !== req.user.id) {
      return res.status(403).json({ ok: false, mensaje: 'No autorizado' })
    }

    if (pedido.estado !== 'PENDIENTE_PAGO') {
      return res.status(400).json({ ok: false, mensaje: 'Este pedido ya fue pagado' })
    }

    const { url, referencia } = await crearTransaccion(pedido, pedido.comprador)

    // Guardar referencia en el pedido
    await prisma.pedido.update({
      where: { id: pedido.id },
      data: { wompiRef: referencia }
    })

    res.json({
      ok: true,
      urlPago: url,
      referencia,
      total: pedido.total
    })

  } catch (error) {
    console.error('Error iniciando pago:', error)
    res.status(500).json({ ok: false, mensaje: 'Error al iniciar el pago' })
  }
})

// POST /api/pagos/webhook
// Wompi notifica el resultado del pago
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-event-checksum']
    const payload = req.body

    if (!verificarFirmaWompi(payload, signature)) {
      return res.status(401).json({ ok: false, mensaje: 'Firma inválida' })
    }

    const { event, data } = JSON.parse(payload)

    if (event === 'transaction.updated') {
      const transaccion = data.transaction

      if (transaccion.status === 'APPROVED') {
        const pedido = await prisma.pedido.findFirst({
          where: { wompiRef: transaccion.reference },
          include: {
            comprador: { select: { nombre: true, email: true, telefono: true } },
            tienda: { select: { nombre: true, whatsapp: true } },
            items: { include: { producto: { select: { nombre: true } } } }
          }
        })

        if (pedido) {
          await prisma.pedido.update({
            where: { id: pedido.id },
            data: {
              estado: 'PAGADO',
              pagadoAt: new Date()
            }
          })

          console.log(`✅ Pago confirmado para pedido ${pedido.id}`)
        }
      }
    }

    res.json({ ok: true })

  } catch (error) {
    console.error('Error en webhook Wompi:', error)
    res.status(500).json({ ok: false, mensaje: 'Error procesando webhook' })
  }
})

// GET /api/pagos/pedido/:pedidoId
// Consultar estado de un pedido
router.get('/pedido/:pedidoId', verificarToken, async (req, res) => {
  try {
    const pedido = await prisma.pedido.findUnique({
      where: { id: req.params.pedidoId },
      include: {
        items: { include: { producto: { select: { nombre: true, unidad: true } } } },
        tienda: { select: { nombre: true, direccion: true } }
      }
    })

    if (!pedido) {
      return res.status(404).json({ ok: false, mensaje: 'Pedido no encontrado' })
    }

    res.json({ ok: true, pedido })

  } catch (error) {
    res.status(500).json({ ok: false, mensaje: 'Error al obtener el pedido' })
  }
})

export default router