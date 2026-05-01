import express from 'express'
import { verificarToken, soloAdmin } from '../middleware/auth.middleware.js'
import {
  notificarBienvenida,
  notificarPedidoNuevo,
  notificarPedidoConfirmado,
  notificarPedidoEnCamino,
  notificarPedidoEntregado,
  notificarFruverPedidoNuevo
} from '../services/whatsapp.service.js'
import { PrismaClient } from '@prisma/client'

const router = express.Router()
const prisma = new PrismaClient()

// POST /api/notificaciones/bienvenida - prueba de bienvenida
router.post('/bienvenida', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { telefono, nombre } = req.body
    const resultado = await notificarBienvenida(telefono, nombre)
    res.json({ ok: true, resultado })
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message })
  }
})

// POST /api/notificaciones/pedido/:id - notificar estado de pedido
router.post('/pedido/:id', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { tipo } = req.body

    const pedido = await prisma.pedido.findUnique({
      where: { id: req.params.id },
      include: {
        comprador: { select: { nombre: true, telefono: true } },
        tienda: { select: { nombre: true, whatsapp: true } },
        delivery: { select: { nombre: true, telefono: true } },
        items: { include: { producto: { select: { nombre: true } } } }
      }
    })

    if (!pedido) {
      return res.status(404).json({ ok: false, mensaje: 'Pedido no encontrado' })
    }

    let resultado

    switch (tipo) {
      case 'CONFIRMADO':
        resultado = await notificarPedidoConfirmado(pedido.comprador.telefono, pedido)
        break
      case 'EN_CAMINO':
        resultado = await notificarPedidoEnCamino(pedido.comprador.telefono, pedido, pedido.delivery)
        break
      case 'ENTREGADO':
        resultado = await notificarPedidoEntregado(pedido.comprador.telefono, pedido)
        break
      case 'FRUVER_NUEVO':
        resultado = await notificarFruverPedidoNuevo(pedido.tienda.whatsapp, pedido, pedido.items)
        break
      default:
        return res.status(400).json({ ok: false, mensaje: 'Tipo de notificación no válido' })
    }

    res.json({ ok: true, tipo, resultado })
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message })
  }
})

export default router
