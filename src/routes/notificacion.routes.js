import express from 'express'
import { verificarToken, soloAdmin } from '../middleware/auth.middleware.js'
import { notificarBienvenida, notificarPedidoConfirmado, notificarPedidoEnCamino, notificarPedidoEntregado } from '../services/whatsapp.service.js'
import { emailBienvenida, emailPedidoConfirmado, emailPedidoEntregado } from '../services/email.service.js'
import { PrismaClient } from '@prisma/client'

const router = express.Router()
const prisma = new PrismaClient()

router.post('/bienvenida', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { telefono, email, nombre } = req.body
    const resultados = {}
    if (telefono) resultados.whatsapp = await notificarBienvenida(telefono, nombre)
    if (email) resultados.email = await emailBienvenida(email, nombre)
    res.json({ ok: true, resultados })
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message })
  }
})

router.post('/pedido/:id', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { tipo } = req.body
    const pedido = await prisma.pedido.findUnique({
      where: { id: req.params.id },
      include: {
        comprador: { select: { nombre: true, email: true, telefono: true } },
        tienda: { select: { nombre: true, whatsapp: true } },
        delivery: { select: { nombre: true } },
        items: { include: { producto: { select: { nombre: true } } } }
      }
    })
    if (!pedido) return res.status(404).json({ ok: false, mensaje: 'Pedido no encontrado' })

    let resultado
    switch (tipo) {
      case 'CONFIRMADO':
        resultado = await notificarPedidoConfirmado(pedido.comprador.telefono, pedido)
        break
      case 'EN_CAMINO':
        resultado = await notificarPedidoEnCamino(pedido.comprador.telefono, pedido)
        break
      case 'ENTREGADO':
        resultado = await notificarPedidoEntregado(pedido.comprador.telefono, pedido)
        break
      default:
        return res.status(400).json({ ok: false, mensaje: 'Tipo no valido' })
    }
    res.json({ ok: true, tipo, resultado })
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message })
  }
})

export default router