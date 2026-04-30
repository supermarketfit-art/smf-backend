import express from 'express'
import { PrismaClient } from '@prisma/client'
import { verificarToken, soloAdmin, soloFruver } from '../middleware/auth.middleware.js'

const router = express.Router()
const prisma = new PrismaClient()

// GET /api/tiendas - listar tiendas activas (público)
router.get('/', async (req, res) => {
  try {
    const { zona, lat, lng } = req.query

    const tiendas = await prisma.tienda.findMany({
      where: {
        activa: true,
        ...(zona && { zona })
      },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        direccion: true,
        lat: true,
        lng: true,
        zona: true,
        imagenUrl: true,
        logoUrl: true,
        costodomicilio: true,
        tiempoEstimadoMin: true,
        aceptaPickup: true,
        whatsapp: true,
        owner: { select: { nombre: true } }
      }
    })

    res.json({ ok: true, total: tiendas.length, tiendas })
  } catch (error) {
    console.error('Error listando tiendas:', error)
    res.status(500).json({ ok: false, mensaje: 'Error al obtener tiendas' })
  }
})

// GET /api/tiendas/:id - detalle de una tienda
router.get('/:id', async (req, res) => {
  try {
    const tienda = await prisma.tienda.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { nombre: true, telefono: true } },
        inventario: {
          where: { disponible: true },
          include: {
            producto: {
              select: { id: true, nombre: true, categoria: true, unidad: true, imagenUrl: true }
            }
          }
        }
      }
    })

    if (!tienda) {
      return res.status(404).json({ ok: false, mensaje: 'Tienda no encontrada' })
    }

    res.json({ ok: true, tienda })
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: 'Error al obtener la tienda' })
  }
})

// POST /api/tiendas - crear tienda (solo admin)
router.post('/', verificarToken, soloAdmin, async (req, res) => {
  try {
    const {
      ownerId, nombre, descripcion, direccion,
      lat, lng, zona, comisionPct, radioEntregaKm,
      costodomicilio, tiempoEstimadoMin, aceptaPickup, whatsapp
    } = req.body

    if (!ownerId || !nombre || !direccion || !lat || !lng || !zona) {
      return res.status(400).json({ ok: false, mensaje: 'Faltan campos requeridos: ownerId, nombre, direccion, lat, lng, zona' })
    }

    // Verificar que el owner existe
    const owner = await prisma.user.findUnique({ where: { id: ownerId } })
    if (!owner) {
      return res.status(404).json({ ok: false, mensaje: 'El usuario owner no existe' })
    }

    // Cambiar rol del owner a FRUVER_OWNER
    await prisma.user.update({
      where: { id: ownerId },
      data: { rol: 'FRUVER_OWNER' }
    })

    const tienda = await prisma.tienda.create({
      data: {
        ownerId, nombre, descripcion, direccion,
        lat: parseFloat(lat), lng: parseFloat(lng), zona,
        comisionPct: comisionPct || 8.0,
        radioEntregaKm: radioEntregaKm || 3.0,
        costodomicilio: costodomicilio || 5000,
        tiempoEstimadoMin: tiempoEstimadoMin || 45,
        aceptaPickup: aceptaPickup ?? true,
        whatsapp
      }
    })

    res.status(201).json({
      ok: true,
      mensaje: `¡Tienda ${tienda.nombre} registrada en la red SMF!`,
      tienda
    })
  } catch (error) {
    console.error('Error creando tienda:', error)
    res.status(500).json({ ok: false, mensaje: 'Error al crear la tienda' })
  }
})

// PUT /api/tiendas/:id - actualizar tienda (admin o dueño)
router.put('/:id', verificarToken, soloFruver, async (req, res) => {
  try {
    const tienda = await prisma.tienda.findUnique({ where: { id: req.params.id } })

    if (!tienda) {
      return res.status(404).json({ ok: false, mensaje: 'Tienda no encontrada' })
    }

    // Solo el dueño o admin puede editar
    if (req.user.rol !== 'ADMIN' && tienda.ownerId !== req.user.id) {
      return res.status(403).json({ ok: false, mensaje: 'No tienes permiso para editar esta tienda' })
    }

    const actualizada = await prisma.tienda.update({
      where: { id: req.params.id },
      data: req.body
    })

    res.json({ ok: true, mensaje: 'Tienda actualizada', tienda: actualizada })
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: 'Error al actualizar la tienda' })
  }
})

export default router
