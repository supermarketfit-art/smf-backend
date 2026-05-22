import { GoogleGenerativeAI } from '@google/generative-ai'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export const calcularMetricas = ({ peso, estatura, edad, sexo, actividad }) => {
  const estaturaMt = estatura / 100
  const imc = peso / (estaturaMt * estaturaMt)

  const tmb = sexo === 'M'
    ? 10 * peso + 6.25 * estatura - 5 * edad + 5
    : 10 * peso + 6.25 * estatura - 5 * edad - 161

  const factores = {
    sedentario: 1.2,
    ligero: 1.375,
    moderado: 1.55,
    activo: 1.725,
    muy_activo: 1.9
  }

  const getd = tmb * (factores[actividad] || 1.55)

  const categoriaIMC =
    imc < 18.5 ? 'Bajo peso' :
    imc < 25   ? 'Normal' :
    imc < 30   ? 'Sobrepeso' : 'Obesidad'

  return {
    imc:          Math.round(imc * 10) / 10,
    tmb:          Math.round(tmb),
    getd:         Math.round(getd),
    categoriaIMC
  }
}

export const generarPlanNutricional = async ({ peso, estatura, edad, sexo, actividad, objetivo }) => {
  try {
    const metricas = calcularMetricas({ peso, estatura, edad, sexo, actividad })

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `Eres un nutricionista experto en alimentación saludable colombiana.

Datos del usuario:
- Peso: ${peso} kg
- Estatura: ${estatura} cm
- Edad: ${edad} años
- Sexo: ${sexo === 'M' ? 'Masculino' : 'Femenino'}
- Nivel de actividad: ${actividad}
- Objetivo: ${objetivo}
- IMC: ${metricas.imc} (${metricas.categoriaIMC})
- TMB: ${metricas.tmb} kcal/día
- Calorías necesarias (GETD): ${metricas.getd} kcal/día

Responde SOLO con un JSON válido, sin texto adicional, sin markdown, con este formato exacto:
{
  "calorias_objetivo": número,
  "macros": {
    "proteinas_g": número,
    "carbohidratos_g": número,
    "grasas_g": número
  },
  "distribucion_comidas": {
    "desayuno_pct": número,
    "almuerzo_pct": número,
    "cena_pct": número,
    "snacks_pct": número
  },
  "menu_semanal": [
    {
      "dia": "Lunes",
      "desayuno": "descripción corta",
      "almuerzo": "descripción corta",
      "cena": "descripción corta",
      "snack": "descripción corta"
    }
  ],
  "lista_mercado": [
    {
      "producto": "nombre",
      "cantidad": "cantidad sugerida semanal",
      "categoria": "Frutas|Verduras|Proteínas|Carbohidratos|Lácteos|Otros"
    }
  ],
  "recomendaciones": ["consejo 1", "consejo 2", "consejo 3"]
}

El menu_semanal debe tener los 7 días (Lunes a Domingo).
La lista_mercado debe tener entre 15 y 20 productos priorizando frutas y verduras colombianas.
Las recomendaciones deben ser prácticas y específicas para el objetivo del usuario.`

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const clean = text.replace(/```json|```/g, '').trim()
    const planGemini = JSON.parse(clean)

    console.log('✅ Agente nutrición: plan generado correctamente')
    return { metricas, planGemini }

  } catch (error) {
    console.error('Error generando plan nutricional:', error)
    throw error
  }
}
