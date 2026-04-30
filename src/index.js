import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.routes.js'
import tiendaRoutes from './routes/tienda.routes.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/auth', authRoutes)
app.use('/api/tiendas', tiendaRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', proyecto: 'SuperMarket Fit', version: '1.0.0', timestamp: new Date().toISOString() })
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ ok: false, mensaje: err.message || 'Error interno del servidor' })
})

app.listen(PORT, () => {
  console.log('SuperMarket Fit corriendo en http://localhost:' + PORT)
})

export default app
