import express from 'express'
import { PrismaClient } from '@prisma/client'
import { verificarToken, soloAdmin, soloFruver } from '../middleware/auth.middleware.js'
import { actualizarPreciosMercado, generarChecklistFruver } from '../agents/inventario.agent.js'

const router = express.Router()
const prisma = new PrismaClient()

// GET /api/inventario/checklist/:tiendaId
// El fruver ve su checklist con precios sugeridos por IA
router.get('/checklist/:tiendaId', verificarToken, soloFruver, async (req, res) => {
  try {
    const { tiendaId } = req.params

    const tienda = await prisma.tienda.findUnique({ where: { id: tiendaId } })
    if (!tienda) {
      return res.status(404).json({ ok: false, mensaje: 'Tienda no encontrada' })
    }

    if (req.user.rol !== 'ADMIN' && tienda.ownerId !== req.user.id) {
      return res.status(403).json({ ok: false, mensaje: 'No tienes acceso a esta tienda' })
    }

    const checklist = await generarChecklistFruver(tiendaId)

    res.json({
      ok: true,
      tienda: { id: tienda.id, nombre: tienda.nombre },
      total: checklist.length,
      checklist
    })
  } catch (error) {
    console.error('Error generando checklist:', error)
    res.status(500).json({ ok: false, mensaje: 'Error al generar checklist' })
  }
})

// POST /api/inventario/actualizar/:tiendaId
// El fruver guarda su inventario confirmado
router.post('/actualizar/:tiendaId', verificarToken, soloFruver, async (req, res) => {
  try {
    const { tiendaId } = req.params
    const { items } = req.body

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ ok: false, mensaje: 'Se requiere array de items' })
    }

    const tienda = await prisma.tienda.findUnique({ where: { id: tiendaId } })
    if (!tienda) {
      return res.status(404).json({ ok: false, mensaje: 'Tienda no encontrada' })
    }

    if (req.user.rol !== 'ADMIN' && tienda.ownerId !== req.user.id) {
      return res.status(403).json({ ok: false, mensaje: 'No tienes acceso a esta tienda' })
    }

    // Upsert de cada item del inventario
    let actualizados = 0
    for (const item of items) {
      await prisma.inventarioTienda.upsert({
        where: {
          tiendaId_productoId: {
            tiendaId,
            productoId: item.productoId
          }
        },
        update: {
          disponible: item.disponible,
          precioVenta: item.precioVenta,
          stockAprox: item.stockAprox || 0
        },
        create: {
          tiendaId,
          productoId: item.productoId,
          disponible: item.disponible,
          precioVenta: item.precioVenta,
          stockAprox: item.stockAprox || 0
        }
      })
      actualizados++
    }

    res.json({
      ok: true,
      mensaje: `Inventario actualizado — ${actualizados} productos`,
      actualizados
    })
  } catch (error) {
    console.error('Error actualizando inventario:', error)
    res.status(500).json({ ok: false, mensaje: 'Error al actualizar inventario' })
  }
})

// POST /api/inventario/precios/actualizar
// Admin activa el agente IA para consultar precios de mercado
router.post('/precios/actualizar', verificarToken, soloAdmin, async (req, res) => {
  try {
    const resultado = await actualizarPreciosMercado()
    res.json({
      ok: true,
      mensaje: `Agente IA actualizó precios de mercado`,
      ...resultado
    })
  } catch (error) {
    console.error('Error actualizando precios:', error)
    res.status(500).json({ ok: false, mensaje: 'Error al actualizar precios de mercado' })
  }
})

// GET /api/inventario/tienda/:tiendaId
// Lista productos disponibles de una tienda (público)
router.get('/tienda/:tiendaId', async (req, res) => {
  try {
    const inventario = await prisma.inventarioTienda.findMany({
      where: {
        tiendaId: req.params.tiendaId,
        disponible: true
      },
      include: {
        producto: {
          select: {
            id: true, nombre: true, nombreComun: true,
            categoria: true, unidad: true, imagenUrl: true
          }
        }
      },
      orderBy: { producto: { categoria: 'asc' } }
    })

    res.json({ ok: true, total: inventario.length, inventario })
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: 'Error al obtener inventario' })
  }
})

export default router
