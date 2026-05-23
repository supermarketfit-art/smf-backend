import express from 'express'
import { PrismaClient } from '@prisma/client'
import { verificarToken } from '../middleware/auth.middleware.js'
import { generarPlanNutricional, calcularMetricas } from '../agents/nutricion.agent.js'

const router = express.Router()
const prisma = new PrismaClient()

// POST /api/nutricion/plan — genera y guarda un plan nutricional
router.post('/plan', verificarToken, async (req, res) => {
  try {
    const { peso, estatura, edad, sexo, actividad, objetivo } = req.body

    if (!peso || !estatura || !edad || !sexo || !actividad || !objetivo) {
      return res.status(400).json({ ok: false, mensaje: 'Faltan datos obligatorios' })
    }

    const pesoNum    = parseFloat(peso)
    const estaturaNum = parseFloat(estatura)
    const edadNum    = parseInt(edad)

    const { metricas, planGemini } = await generarPlanNutricional({
      peso: pesoNum,
      estatura: estaturaNum,
      edad: edadNum,
      sexo,
      actividad,
      objetivo
    })

    const fechaNacimiento = new Date(new Date().getFullYear() - edadNum, 0, 1)

    const plan = await prisma.planNutricional.create({
      data: {
        userId:          req.user.id,
        peso:            pesoNum,
        estatura:        estaturaNum,
        sexo,
        fechaNacimiento,
        actividad,
        objetivo,
        imc:             metricas.imc,
        tmb:             metricas.tmb,
        getd:            metricas.getd,
        planGemini
      }
    })

    res.json({ ok: true, id: plan.id, metricas, planGemini })

  } catch (error) {
    console.error('Error generando plan nutricional:', error)
    res.status(500).json({ ok: false, mensaje: 'Error al generar el plan nutricional' })
  }
})

// GET /api/nutricion/mi-plan — trae el último plan del usuario
router.get('/mi-plan', verificarToken, async (req, res) => {
  try {
    const plan = await prisma.planNutricional.findFirst({
      where:   { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    })

    if (!plan) {
      return res.status(404).json({ ok: false, mensaje: 'No tienes un plan generado aún' })
    }

    res.json({
      ok: true,
      id:        plan.id,
      metricas: {
        imc:          plan.imc,
        tmb:          plan.tmb,
        getd:         plan.getd,
        categoriaIMC:
          plan.imc < 18.5 ? 'Bajo peso' :
          plan.imc < 25   ? 'Normal' :
          plan.imc < 30   ? 'Sobrepeso' : 'Obesidad'
      },
      planGemini: plan.planGemini,
      createdAt:  plan.createdAt
    })

  } catch (error) {
    console.error('Error obteniendo plan:', error)
    res.status(500).json({ ok: false, mensaje: 'Error al obtener el plan' })
  }
})

export default router
