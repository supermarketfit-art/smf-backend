import { GoogleGenerativeAI } from '@google/generative-ai'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Consulta precios de mercado colombiano via Gemini
export const consultarPreciosMercado = async () => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `Eres un experto en precios de frutas y verduras en Colombia, específicamente en Bogotá y Corabastos.
    
Genera una lista de precios actuales aproximados en pesos colombianos (COP) para estos productos.
Responde SOLO con un JSON válido, sin texto adicional, con este formato exacto:

{
  "precios": [
    {
      "nombre": "Manzana",
      "precioMin": 800,
      "precioMax": 1500,
      "precioSugerido": 1200,
      "unidad": "UNIDAD"
    }
  ]
}

Productos a consultar: Manzana, Banano, Naranja, Mandarina, Fresa, Uva, Mango, Papaya, Piña, Aguacate, Tomate, Cebolla, Papa, Papa criolla, Zanahoria, Espinaca, Lechuga, Brócoli, Cilantro, Pimentón, Habichuela, Arveja, Maíz, Almendras, Nueces, Maní, Avena, Quinoa, Arroz integral.

Precios por unidad de venta típica en tienda de barrio (fruver) en Bogotá Colombia 2025.`

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    const clean = text.replace(/```json|```/g, '').trim()
    const data = JSON.parse(clean)

    return data.precios

  } catch (error) {
    console.error('Error consultando precios Gemini:', error)
    throw error
  }
}

// Actualiza precios de mercado en la BD
export const actualizarPreciosMercado = async () => {
  try {
    console.log('🤖 Agente inventario: consultando precios de mercado...')

    const precios = await consultarPreciosMercado()

    const productos = await prisma.productoCatalogo.findMany({
      where: { activo: true }
    })

    let actualizados = 0

    for (const precio of precios) {
      const producto = productos.find(p =>
        p.nombre.toLowerCase() === precio.nombre.toLowerCase() ||
        (p.nombreComun && p.nombreComun.toLowerCase().includes(precio.nombre.toLowerCase()))
      )

      if (producto) {
        await prisma.precioMercado.create({
          data: {
            productoId: producto.id,
            precioMin: precio.precioMin,
            precioMax: precio.precioMax,
            precioSugerido: precio.precioSugerido,
            fuente: 'gemini-corabastos'
          }
        })
        actualizados++
      }
    }

    console.log(`✅ Agente inventario: ${actualizados} precios actualizados`)
    return { actualizados, total: precios.length }

  } catch (error) {
    console.error('Error actualizando precios:', error)
    throw error
  }
}

// Genera checklist de inventario para un fruver
export const generarChecklistFruver = async (tiendaId) => {
  try {
    const productos = await prisma.productoCatalogo.findMany({
      where: { activo: true },
      include: {
        preciosMercado: {
          orderBy: { fecha: 'desc' },
          take: 1
        },
        inventarios: {
          where: { tiendaId }
        }
      },
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }]
    })

    const checklist = productos.map(p => ({
      productoId: p.id,
      nombre: p.nombre,
      nombreComun: p.nombreComun,
      categoria: p.categoria,
      unidad: p.unidad,
      precioSugerido: p.preciosMercado[0]?.precioSugerido || null,
      precioMin: p.preciosMercado[0]?.precioMin || null,
      precioMax: p.preciosMercado[0]?.precioMax || null,
      // Estado actual en inventario de esta tienda
      disponible: p.inventarios[0]?.disponible || false,
      precioVenta: p.inventarios[0]?.precioVenta || p.preciosMercado[0]?.precioSugerido || 0,
      stockAprox: p.inventarios[0]?.stockAprox || 0
    }))

    return checklist

  } catch (error) {
    console.error('Error generando checklist:', error)
    throw error
  }
}
