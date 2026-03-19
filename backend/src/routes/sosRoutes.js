const express = require('express')
const { z } = require('zod')
const { db } = require('../db')
const { authRequired } = require('../auth/authMiddleware')
const { createSosRequest } = require('../services/sosService')

const router = express.Router()

// Authenticated SOS request
router.post('/request', authRequired, (req, res) => {
  const schema = z.object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
  })
  const parse = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() })

  const { lat, lon } = parse.data
  const requestId = createSosRequest({ userId: req.user.id, userLat: lat, userLon: lon })
  return res.status(201).json({ requestId })
})

// Emergency SOS - No authentication required (for emergency situations)
router.post('/emergency', (req, res) => {
  const schema = z.object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    phone: z.string().optional(),
    name: z.string().optional(),
  })
  const parse = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() })

  const { lat, lon, phone, name } = parse.data

  // Create anonymous emergency user
  try {
    const result = db
      .prepare(
        `INSERT INTO users (name, email, phone, password_hash, address)
         VALUES (@name, @email, @phone, @password_hash, @address)`,
      )
      .run({
        name: name || 'Emergency User',
        email: `emergency_${Date.now()}@anonymous.local`,
        phone: phone || 'N/A',
        password_hash: '', // No password for anonymous emergency
        address: `Emergency (${lat.toFixed(3)}, ${lon.toFixed(3)})`,
      })

    const userId = result.lastInsertRowid
    const requestId = createSosRequest({ userId, userLat: lat, userLon: lon })

    return res.status(201).json({
      requestId,
      userId,
      message: 'Emergency SOS activated. Ambulance dispatched.',
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Emergency SOS error:', error)
    return res.status(500).json({ error: 'Failed to create emergency request' })
  }
})

module.exports = router

