import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.routes.js'
import tiendaRoutes from './routes/tienda.routes.js'
import productoRoutes from './routes/producto.routes.js'
import inventarioRoutes from './routes/inventario.routes.js'
import pedidoRoutes from './routes/pedido.routes.js'
import notificacionRoutes from './routes/notificacion.routes.js'
import pagoRoutes from './routes/pago.routes.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(helmet())
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://smf-frontend-production.up.railway.app',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/auth', authRoutes)
app.use('/api/tiendas', tiendaRoutes)
app.use('/api/productos', productoRoutes)
app.use('/api/inventario', inventarioRoutes)
app.use('/api/pedidos', pedidoRoutes)
app.use('/api/notificaciones', notificacionRoutes)
app.use('/api/pagos', pagoRoutes)

// Ruta temporal para generar hash - ELIMINAR DESPUÉS
app.get('/temp/hash/:password', async (req, res) => {
  const bcrypt = await import('bcryptjs')
  const hash = await bcrypt.default.hash(req.params.password, 12)
  res.json({ hash })
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok', proyecto: 'SuperMarket Fit', version: '1.0.0', timestamp: new Date().toISOString() })
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ ok: false, mensaje: err.message || 'Error interno del servidor' })
})
app.get('/temp/resetpass/:email', async (req, res) => {
  const bcrypt = await import('bcryptjs')
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()
  const hash = await bcrypt.default.hash('smf2025', 12)
  await prisma.user.update({
    where: { email: decodeURIComponent(req.params.email) },
    data: { passwordHash: hash }
  })
  res.json({ ok: true, mensaje: 'Password actualizado' })
})
app.listen(PORT, () => {
  console.log('SuperMarket Fit corriendo en http://localhost:' + PORT)
})

export default app