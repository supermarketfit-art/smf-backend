import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const verificarToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, mensaje: 'Token de acceso requerido' })
    }
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, nombre: true, email: true, rol: true, activo: true }
    })
    if (!user || !user.activo) {
      return res.status(401).json({ ok: false, mensaje: 'Usuario no válido o inactivo' })
    }
    req.user = user
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ ok: false, mensaje: 'Token expirado' })
    }
    return res.status(401).json({ ok: false, mensaje: 'Token inválido' })
  }
}

export const requiereRol = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, mensaje: 'No autenticado' })
    }
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ ok: false, mensaje: `Acceso denegado. Se requiere rol: ${roles.join(' o ')}` })
    }
    next()
  }
}

export const soloAdmin = requiereRol('ADMIN')
export const soloFruver = requiereRol('FRUVER_OWNER', 'ADMIN')
export const soloDelivery = requiereRol('DELIVERY', 'ADMIN')
export const soloComprador = requiereRol('COMPRADOR', 'ADMIN')
