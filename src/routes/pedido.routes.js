import express from 'express'
import { PrismaClient } from '@prisma/client'
import { verificarToken, soloFruver } from '../middleware/auth.middleware.js'
import { notificarFruverPedidoNuevo, notificarPedidoConfirmado } from '../services/whatsapp.service.js'
import { emailPedidoConfirmado } from '../services/email.service.js'

const router = express.Router()
const prisma = new PrismaClient()

const calcularSplit = (subtotal, costoDelivery, comisionPct) => {
  const comisionSmf = subtotal * (comisionPct / 100)
  const pagoTienda = subtotal - comisionSmf
  const total = subtotal + costoDelivery
  return { comisionSmf, pagoTienda, pagoDelivery: costoDelivery * 0.8, total }
}

// POST /api/pedidos - crear pedido
router.post('/', verificarToken, async (req, res) => {
  try {
    const { tiendaId, items, tipoDelivery, direccionEntrega, latEntrega, lngEntrega } = req.body

    if (!tiendaId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, mensaje: 'tiendaId e items son requeridos' })
    }

    const tienda = await prisma.tienda.findUnique({
      where: { id: tiendaId },
      include: { owner: { select: { nombre: true, telefono: true, email: true } } }
    })
    if (!tienda || !tienda.activa) {
      return res.status(404).json({ ok: false, mensaje: 'Tienda no encontrada o inactiva' })
    }

    let subtotal = 0
    const itemsValidados = []

    for (const item of items) {
      const inventario = await prisma.inventarioTienda.findUnique({
        where: { tiendaId_productoId: { tiendaId, productoId: item.productoId } },
        include: { producto: true }
      })

      if (!inventario || !inventario.disponible) {
        return res.status(400).json({ ok: false, mensaje: 'Producto no disponible en esta tienda' })
      }

      const itemSubtotal = inventario.precioVenta * item.cantidad
      subtotal += itemSubtotal
      itemsValidados.push({
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioUnitario: inventario.precioVenta,
        subtotal: itemSubtotal
      })
    }

    const costoDelivery = tipoDelivery === 'PICKUP_TIENDA' ? 0 : tienda.costodomicilio
    const { comisionSmf, pagoTienda, pagoDelivery, total } = calcularSplit(subtotal, costoDelivery, tienda.comisionPct)
    const codigoPickup = tipoDelivery === 'PICKUP_TIENDA'
      ? Math.random().toString(36).substring(2, 8).toUpperCase()
      : null

    const pedido = await prisma.pedido.create({
      data: {
        compradorId: req.user.id,
        tiendaId,
        tipoDelivery: tipoDelivery || 'RED_SMF',
        direccionEntrega,
        latEntrega,
        lngEntrega,
        subtotal,
        costoDelivery,
        total,
        comisionSmf,
        pagoTienda,
        pagoDelivery,
        codigoPickup,
        estado: 'PAGADO',
        pagadoAt: new Date(),
        items: { create: itemsValidados }
      },
      include: {
        items: { include: { producto: { select: { nombre: true, unidad: true } } } },
        tienda: { select: { nombre: true, direccion: true, whatsapp: true } },
        comprador: { select: { nombre: true, telefono: true, email: true } }
      }
    })

    // Notificar al fruver por WhatsApp
    if (tienda.whatsapp) {
      notificarFruverPedidoNuevo(tienda.whatsapp, pedido).catch(e =>
        console.error('Error notificando fruver WhatsApp:', e)
      )
    }

    // Notificar al comprador por WhatsApp
    if (pedido.comprador.telefono) {
      notificarPedidoConfirmado(pedido.comprador.telefono, pedido).catch(e =>
        console.error('Error notificando comprador WhatsApp:', e)
      )
    }

    // Notificar al comprador por email
    if (pedido.comprador.email) {
      emailPedidoConfirmado(pedido.comprador.email, pedido.comprador.nombre, pedido).catch(e =>
        console.error('Error notificando comprador email:', e)
      )
    }

    res.status(201).json({
      ok: true,
      mensaje: '¡Pedido creado y confirmado!',
      pedido
    })
  } catch (error) {
    console.error('Error creando pedido:', error)
    res.status(500).json({ ok: false, mensaje: 'Error al crear el pedido' })
  }
})

// GET /api/pedidos/mis-pedidos
router.get('/mis-pedidos', verificarToken, async (req, res) => {
  try {
    const pedidos = await prisma.pedido.findMany({
      where: { compradorId: req.user.id },
      include: {
        items: { include: { producto: { select: { nombre: true, unidad: true } } } },
        tienda: { select: { nombre: true, direccion: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ ok: true, total: pedidos.length, pedidos })
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: 'Error al obtener pedidos' })
  }
})

// GET /api/pedidos/tienda/:tiendaId
router.get('/tienda/:tiendaId', verificarToken, soloFruver, async (req, res) => {
  try {
    const pedidos = await prisma.pedido.findMany({
      where: {
        tiendaId: req.params.tiendaId,
        estado: { not: 'PENDIENTE_PAGO' }
      },
      include: {
        items: { include: { producto: { select: { nombre: true, unidad: true } } } },
        comprador: { select: { nombre: true, telefono: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ ok: true, total: pedidos.length, pedidos })
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: 'Error al obtener pedidos' })
  }
})

// GET /api/pedidos/:id
router.get('/:id', verificarToken, async (req, res) => {
  try {
    const pedido = await prisma.pedido.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { producto: { select: { nombre: true, unidad: true, imagenUrl: true } } } },
        tienda: { select: { nombre: true, direccion: true, whatsapp: true } },
        comprador: { select: { nombre: true, telefono: true } },
        delivery: { select: { nombre: true, telefono: true } }
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

// PATCH /api/pedidos/:id/estado
router.patch('/:id/estado', verificarToken, async (req, res) => {
  try {
    const { estado } = req.body
    const { id } = req.params

    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: {
        comprador: { select: { nombre: true, telefono: true, email: true } }
      }
    })
    if (!pedido) {
      return res.status(404).json({ ok: false, mensaje: 'Pedido no encontrado' })
    }

    const timestampMap = {
      PAGADO: { pagadoAt: new Date() },
      PREPARANDO: { preparadoAt: new Date() },
      EN_CAMINO: { enCaminoAt: new Date() },
      ENTREGADO: { entregadoAt: new Date() }
    }

    const actualizado = await prisma.pedido.update({
      where: { id },
      data: { estado, ...timestampMap[estado] }
    })

    // Notificar al comprador cuando el pedido está en camino o entregado
    if (estado === 'EN_CAMINO' && pedido.comprador.telefono) {
      notificarPedidoConfirmado(pedido.comprador.telefono, pedido).catch(console.error)
    }

    res.json({ ok: true, mensaje: 'Pedido actualizado a: ' + estado, pedido: actualizado })
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: 'Error al actualizar el pedido' })
  }
})

export default router