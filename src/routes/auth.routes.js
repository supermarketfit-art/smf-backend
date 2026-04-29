import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { verificarToken } from '../middleware/auth.middleware.js'

const router = express.Router()
const prisma = new PrismaClient()

const generarToken = (user) => {
  return jwt.sign(
    { id: user.id, rol: user.rol, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
}

// POST /api/auth/registro
router.post('/registro', async (req, res) => {
  try {
    const { nombre, email, password, telefono, direccion } = req.body

    if (!nombre || !email || !password) {
      return res.status(400).json({ ok: false, mensaje: 'Nombre, email y contraseña son requeridos' })
    }

    if (password.length < 6) {
      return res.status(400).json({ ok: false, mensaje: 'La contraseña debe tener mínimo 6 caracteres' })
    }

    const existe = await prisma.user.findUnique({ where: { email } })
    if (existe) {
      return res.status(409).json({ ok: false, mensaje: 'Ya existe una cuenta con ese email' })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: { nombre, email, passwordHash, telefono, direccion, rol: 'COMPRADOR' },
      select: { id: true, nombre: true, email: true, telefono: true, rol: true, createdAt: true }
    })

    const token = generarToken(user)

    res.status(201).json({
      ok: true,
      mensaje: `¡Bienvenido a SuperMarket Fit, ${user.nombre}!`,
      token,
      user
    })
  } catch (error) {
    console.error('Error en registro:', error)
    res.status(500).json({ ok: false, mensaje: 'Error al crear la cuenta' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ ok: false, mensaje: 'Email y contraseña son requeridos' })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, nombre: true, email: true, telefono: true, passwordHash: true, rol: true, activo: true }
    })

    if (!user || !user.activo) {
      return res.status(401).json({ ok: false, mensaje: 'Credenciales incorrectas' })
    }

    const passwordValida = await bcrypt.compare(password, user.passwordHash)
    if (!passwordValida) {
      return res.status(401).json({ ok: false, mensaje: 'Credenciales incorrectas' })
    }

    const token = generarToken(user)
    const { passwordHash, ...userSinPassword } = user

    res.json({
      ok: true,
      mensaje: `¡Hola de nuevo, ${user.nombre}!`,
      token,
      user: userSinPassword
    })
  } catch (error) {
    console.error('Error en login:', error)
    res.status(500).json({ ok: false, mensaje: 'Error al iniciar sesión' })
  }
})

// GET /api/auth/me
router.get('/me', verificarToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, nombre: true, email: true, telefono: true,
        rol: true, direccion: true, lat: true, lng: true, createdAt: true,
        tiendas: { select: { id: true, nombre: true, activa: true } }
      }
    })
    res.json({ ok: true, user })
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: 'Error al obtener el perfil' })
  }
})

export default router
