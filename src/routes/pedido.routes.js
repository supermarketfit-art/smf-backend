import express from 'express'
import { PrismaClient } from '@prisma/client'
import { verificarToken, soloAdmin, soloFruver, soloDelivery } from '../middleware/auth.middleware.js'

const router = express.Router()
const prisma = new PrismaClient()

// Calcular split financiero
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

    const tienda = await prisma.tienda.findUnique({ where: { id: tiendaId } })
    if (!tienda || !tienda.activa) {
      return res.status(404).json({ ok: false, mensaje: 'Tienda no encontrada o inactiva' })
    }

    // Verificar productos y calcular subtotal
    let subtotal = 0
    const itemsValidados = []

    for (const item of items) {
      const inventario = await prisma.inventarioTienda.findUnique({
        where: { tiendaId_productoId: { tiendaId, productoId: item.productoId } },
        include: { producto: true }
      })

      if (!inventario || !inventario.disponible) {
        return res.status(400).json({
          ok: false,
          mensaje: `Producto no disponible en esta tienda`
        })
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

    // Generar código pickup si aplica
    const codigoPickup = tipoDelivery === 'PICKUP_TIENDA'
      ? Math.random().toString(36).substring(2, 8).toUpperCase()
      : null

    // Crear pedido con items
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
        items: {
          create: itemsValidados
        }
      },
      include: {
        items: {
          include: { producto: { select: { nombre: true, unidad: true } } }
        },
        tienda: { select: { nombre: true, direccion: true, whatsapp: true } }
      }
    })

    res.status(201).json({
      ok: true,
      mensaje: '¡Pedido creado! Procede al pago para confirmarlo.',
      pedido
    })
  } catch (error) {
    console.error('Error creando pedido:', error)
    res.status(500).json({ ok: false, mensaje: 'Error al crear el pedido' })
  }
})

// GET /api/pedidos/mis-pedidos - pedidos del comprador
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

// GET /api/pedidos/tienda/:tiendaId - pedidos de un fruver
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

// GET /api/pedidos/:id - detalle de un pedido
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

// PATCH /api/pedidos/:id/estado - actualizar estado del pedido
router.patch('/:id/estado', verificarToken, async (req, res) => {
  try {
    const { estado } = req.body
    const { id } = req.params

    const pedido = await prisma.pedido.findUnique({ where: { id } })
    if (!pedido) {
      return res.status(404).json({ ok: false, mensaje: 'Pedido no encontrado' })
    }

    // Campos de timestamp según estado
    const timestampMap = {
      PAGADO: { pagadoAt: new Date() },
      PREPARANDO: { preparadoAt: new Date() },
      EN_CAMINO: { enCaminoAt: new Date() },
      ENTREGADO: { entregadoAt: new Date() }
    }

    const actualizado = await prisma.pedido.update({
      where: { id },
      data: {
        estado,
        ...timestampMap[estado]
      }
    })

    res.json({
      ok: true,
      mensaje: `Pedido actualizado a: ${estado}`,
      pedido: actualizado
    })
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: 'Error al actualizar el pedido' })
  }
})

export default router
