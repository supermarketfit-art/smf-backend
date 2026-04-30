import express from 'express'
import { PrismaClient } from '@prisma/client'
import { verificarToken, soloAdmin } from '../middleware/auth.middleware.js'

const router = express.Router()
const prisma = new PrismaClient()

// GET /api/productos - listar catálogo completo (público)
router.get('/', async (req, res) => {
  try {
    const { categoria, buscar } = req.query

    const productos = await prisma.productoCatalogo.findMany({
      where: {
        activo: true,
        ...(categoria && { categoria }),
        ...(buscar && {
          OR: [
            { nombre: { contains: buscar } },
            { nombreComun: { contains: buscar } }
          ]
        })
      },
      include: {
        preciosMercado: {
          orderBy: { fecha: 'desc' },
          take: 1
        }
      },
      orderBy: { nombre: 'asc' }
    })

    res.json({ ok: true, total: productos.length, productos })
  } catch (error) {
    console.error('Error listando productos:', error)
    res.status(500).json({ ok: false, mensaje: 'Error al obtener productos' })
  }
})

// GET /api/productos/:id - detalle de un producto
router.get('/:id', async (req, res) => {
  try {
    const producto = await prisma.productoCatalogo.findUnique({
      where: { id: req.params.id },
      include: {
        preciosMercado: {
          orderBy: { fecha: 'desc' },
          take: 5
        }
      }
    })

    if (!producto) {
      return res.status(404).json({ ok: false, mensaje: 'Producto no encontrado' })
    }

    res.json({ ok: true, producto })
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: 'Error al obtener el producto' })
  }
})

// POST /api/productos - crear producto en catálogo (solo admin)
router.post('/', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { nombre, nombreComun, categoria, unidad, descripcion, imagenUrl } = req.body

    if (!nombre || !categoria) {
      return res.status(400).json({ ok: false, mensaje: 'Nombre y categoría son requeridos' })
    }

    const producto = await prisma.productoCatalogo.create({
      data: { nombre, nombreComun, categoria, unidad: unidad || 'UNIDAD', descripcion, imagenUrl }
    })

    res.status(201).json({ ok: true, mensaje: `Producto ${producto.nombre} agregado al catálogo`, producto })
  } catch (error) {
    console.error('Error creando producto:', error)
    res.status(500).json({ ok: false, mensaje: 'Error al crear el producto' })
  }
})

// POST /api/productos/seed - cargar catálogo inicial SMF (solo admin)
router.post('/seed/catalogo', verificarToken, soloAdmin, async (req, res) => {
  try {
    const productosSMF = [
      { nombre: 'Manzana', nombreComun: 'Manzana roja', categoria: 'FRUTAS', unidad: 'UNIDAD' },
      { nombre: 'Banano', nombreComun: 'Banano criollo', categoria: 'FRUTAS', unidad: 'UNIDAD' },
      { nombre: 'Naranja', nombreComun: 'Naranja de mesa', categoria: 'FRUTAS', unidad: 'UNIDAD' },
      { nombre: 'Mandarina', nombreComun: 'Mandarina arrayana', categoria: 'FRUTAS', unidad: 'UNIDAD' },
      { nombre: 'Fresa', nombreComun: 'Fresa colombiana', categoria: 'FRUTAS', unidad: 'GRAMO' },
      { nombre: 'Uva', nombreComun: 'Uva red globe', categoria: 'FRUTAS', unidad: 'GRAMO' },
      { nombre: 'Mango', nombreComun: 'Mango tommy', categoria: 'FRUTAS', unidad: 'UNIDAD' },
      { nombre: 'Papaya', nombreComun: 'Papaya maradol', categoria: 'FRUTAS', unidad: 'UNIDAD' },
      { nombre: 'Piña', nombreComun: 'Piña gold', categoria: 'FRUTAS', unidad: 'UNIDAD' },
      { nombre: 'Aguacate', nombreComun: 'Aguacate hass', categoria: 'FRUTAS', unidad: 'UNIDAD' },
      { nombre: 'Tomate', nombreComun: 'Tomate chonto', categoria: 'VERDURAS_HORTALIZAS', unidad: 'KILOGRAMO' },
      { nombre: 'Cebolla', nombreComun: 'Cebolla cabezona', categoria: 'VERDURAS_HORTALIZAS', unidad: 'KILOGRAMO' },
      { nombre: 'Papa', nombreComun: 'Papa pastusa', categoria: 'VERDURAS_HORTALIZAS', unidad: 'KILOGRAMO' },
      { nombre: 'Papa criolla', nombreComun: 'Papa criolla amarilla', categoria: 'VERDURAS_HORTALIZAS', unidad: 'KILOGRAMO' },
      { nombre: 'Zanahoria', nombreComun: 'Zanahoria baby', categoria: 'VERDURAS_HORTALIZAS', unidad: 'KILOGRAMO' },
      { nombre: 'Espinaca', nombreComun: 'Espinaca fresca', categoria: 'VERDURAS_HORTALIZAS', unidad: 'MANOJO' },
      { nombre: 'Lechuga', nombreComun: 'Lechuga batavia', categoria: 'VERDURAS_HORTALIZAS', unidad: 'UNIDAD' },
      { nombre: 'Brócoli', nombreComun: 'Brócoli verde', categoria: 'VERDURAS_HORTALIZAS', unidad: 'UNIDAD' },
      { nombre: 'Cilantro', nombreComun: 'Cilantro fresco', categoria: 'VERDURAS_HORTALIZAS', unidad: 'MANOJO' },
      { nombre: 'Pimentón', nombreComun: 'Pimentón rojo', categoria: 'VERDURAS_HORTALIZAS', unidad: 'UNIDAD' },
      { nombre: 'Habichuela', nombreComun: 'Habichuela verde', categoria: 'VERDURAS_HORTALIZAS', unidad: 'KILOGRAMO' },
      { nombre: 'Arveja', nombreComun: 'Arveja verde', categoria: 'VERDURAS_HORTALIZAS', unidad: 'KILOGRAMO' },
      { nombre: 'Maíz', nombreComun: 'Mazorca de maíz', categoria: 'VERDURAS_HORTALIZAS', unidad: 'UNIDAD' },
      { nombre: 'Almendras', nombreComun: 'Almendras crudas', categoria: 'FRUTOS_SECOS_SEMILLAS', unidad: 'GRAMO' },
      { nombre: 'Nueces', nombreComun: 'Nueces de castilla', categoria: 'FRUTOS_SECOS_SEMILLAS', unidad: 'GRAMO' },
      { nombre: 'Maní', nombreComun: 'Maní tostado', categoria: 'FRUTOS_SECOS_SEMILLAS', unidad: 'GRAMO' },
      { nombre: 'Avena', nombreComun: 'Avena en hojuelas', categoria: 'CEREALES', unidad: 'GRAMO' },
      { nombre: 'Quinoa', nombreComun: 'Quinoa blanca', categoria: 'CEREALES', unidad: 'GRAMO' },
      { nombre: 'Arroz integral', nombreComun: 'Arroz integral', categoria: 'CEREALES', unidad: 'KILOGRAMO' },
    ]

    const creados = await prisma.productoCatalogo.createMany({
      data: productosSMF,
      skipDuplicates: true
    })

    res.status(201).json({
      ok: true,
      mensaje: `Catálogo inicial cargado: ${creados.count} productos agregados`,
      count: creados.count
    })
  } catch (error) {
    console.error('Error en seed:', error)
    res.status(500).json({ ok: false, mensaje: 'Error al cargar el catálogo' })
  }
})

export default router
