const express = require('express')
const { z } = require('zod')
const { db } = require('../db')
const { hashPassword, verifyPassword } = require('../auth/password')
const { signToken } = require('../auth/jwt')

const router = express.Router()

router.post('/register', async (req, res) => {
  const schema = z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Valid email required'),
    phone: z.string().min(6, 'Phone required'),
    password: z.string().min(8, 'Password min length is 8'),
    confirmPassword: z.string().min(8, 'Confirm password min length is 8'),
    age: z.number().int().optional().nullable(),
    gender: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    blood_group: z.string().optional(),
    allergies: z.string().optional(),
    conditions_text: z.string().optional(),
  })

  const parse = schema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() })
  }
  const data = parse.data

  if (data.password !== data.confirmPassword) {
    return res.status(400).json({ error: 'Password and confirm password do not match' })
  }

  const passwordHash = await hashPassword(data.password)

  try {
    const stmt = db.prepare(
      `INSERT INTO users (name,email,phone,password_hash,age,gender,address,blood_group,allergies,conditions_text)
       VALUES (@name,@email,@phone,@password_hash,@age,@gender,@address,@blood_group,@allergies,@conditions_text)`,
    )
    const result = stmt.run({
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      password_hash: passwordHash,
      age: data.age ?? null,
      gender: data.gender ?? null,
      address: data.address ?? null,
      blood_group: data.blood_group ?? null,
      allergies: data.allergies ?? null,
      conditions_text: data.conditions_text ?? null,
    })

    const userId = result.lastInsertRowid
    return res.status(201).json({ token: signToken({ userId }), user: { id: userId } })
  } catch (err) {
    if (String(err).includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Email already registered' })
    }
    return res.status(500).json({ error: 'Registration failed' })
  }
})

router.post('/login', async (req, res) => {
  const schema = z.object({
    email: z.string().email('Valid email required'),
    password: z.string().min(1, 'Password required'),
  })

  const parse = schema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() })
  }

  const { email, password } = parse.data
  const row = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email.toLowerCase())

  if (!row) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const ok = await verifyPassword(password, row.password_hash)
  if (!ok) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  return res.json({
    token: signToken({ userId: row.id }),
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
    },
  })
})

module.exports = router

