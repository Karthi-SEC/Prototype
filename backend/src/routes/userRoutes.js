const express = require('express')
const { z } = require('zod')
const { db } = require('../db')
const { authRequired } = require('../auth/authMiddleware')

const router = express.Router()

router.use(authRequired)

router.get('/me', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const contacts = db
    .prepare('SELECT * FROM emergency_contacts WHERE user_id = ? ORDER BY is_primary DESC, created_at DESC')
    .all(req.user.id)

  return res.json({ user: mapUser(user), contacts })
})

router.put('/me', (req, res) => {
  const schema = z.object({
    name: z.string().min(2).optional(),
    age: z.number().int().optional().nullable(),
    gender: z.string().optional().nullable(),
    phone: z.string().min(6).optional().nullable(),
    address: z.string().optional().nullable(),
    blood_group: z.string().optional().nullable(),
    allergies: z.string().optional().nullable(),
    conditions_text: z.string().optional().nullable(),
  })

  const parse = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() })
  const data = parse.data

  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!current) return res.status(404).json({ error: 'User not found' })

  const next = {
    name: data.name ?? current.name,
    age: data.age ?? current.age,
    gender: data.gender ?? current.gender,
    phone: data.phone ?? current.phone,
    address: data.address ?? current.address,
    blood_group: data.blood_group ?? current.blood_group,
    allergies: data.allergies ?? current.allergies,
    conditions_text: data.conditions_text ?? current.conditions_text,
  }

  db.prepare(
    `UPDATE users
     SET name=@name, age=@age, gender=@gender, phone=@phone, address=@address, blood_group=@blood_group,
         allergies=@allergies, conditions_text=@conditions_text
     WHERE id=@id`,
  ).run({ id: req.user.id, ...next })

  return res.json({ ok: true })
})

router.get('/me/contacts', (req, res) => {
  const contacts = db
    .prepare('SELECT * FROM emergency_contacts WHERE user_id = ? ORDER BY is_primary DESC, created_at DESC')
    .all(req.user.id)
  return res.json({ contacts })
})

router.get('/me/requests', (req, res) => {
  const requests = db
    .prepare(
      'SELECT id, destination_label, status, created_at, route_total_time_seconds, route_total_distance_km, dispatched_ambulance_id FROM emergency_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
    )
    .all(req.user.id)
  return res.json({ requests })
})

router.get('/me/notifications', (req, res) => {
  const notifications = db
    .prepare('SELECT id, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20')
    .all(req.user.id)
  return res.json({ notifications })
})

router.put('/me/notifications/:id/read', (req, res) => {
  const id = Number(req.params.id)
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, req.user.id)
  return res.json({ ok: true })
})

router.post('/me/contacts', (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    phone: z.string().min(6),
    relationship: z.string().optional().nullable(),
    is_primary: z.boolean().optional().default(false),
  })
  const parse = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() })

  const data = parse.data

  const isPrimary = data.is_primary ? 1 : 0
  const insert = db.prepare(
    `INSERT INTO emergency_contacts (user_id, name, phone, relationship, is_primary)
     VALUES (@user_id,@name,@phone,@relationship,@is_primary)`,
  )

  const tx = db.transaction(() => {
    if (isPrimary === 1) {
      db.prepare('UPDATE emergency_contacts SET is_primary = 0 WHERE user_id = ?').run(req.user.id)
    }
    const r = insert.run({
      user_id: req.user.id,
      name: data.name,
      phone: data.phone,
      relationship: data.relationship ?? null,
      is_primary: isPrimary,
    })
    return r.lastInsertRowid
  })

  const contactId = tx()
  return res.status(201).json({ id: contactId })
})

router.put('/me/contacts/:id', (req, res) => {
  const id = Number(req.params.id)
  const schema = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().min(6).optional(),
    relationship: z.string().optional().nullable(),
    is_primary: z.boolean().optional(),
  })
  const parse = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() })

  const current = db.prepare('SELECT * FROM emergency_contacts WHERE id = ? AND user_id = ?').get(id, req.user.id)
  if (!current) return res.status(404).json({ error: 'Contact not found' })

  const next = {
    name: parse.data.name ?? current.name,
    phone: parse.data.phone ?? current.phone,
    relationship: parse.data.relationship !== undefined ? parse.data.relationship : current.relationship,
    is_primary: parse.data.is_primary !== undefined ? (parse.data.is_primary ? 1 : 0) : current.is_primary,
  }

  const tx = db.transaction(() => {
    if (next.is_primary === 1) {
      db.prepare('UPDATE emergency_contacts SET is_primary = 0 WHERE user_id = ?').run(req.user.id)
    }
    db.prepare(
      `UPDATE emergency_contacts
       SET name=@name, phone=@phone, relationship=@relationship, is_primary=@is_primary
       WHERE id=@id`,
    ).run({ id, ...next })
  })
  tx()
  return res.json({ ok: true })
})

router.delete('/me/contacts/:id', (req, res) => {
  const id = Number(req.params.id)
  db.prepare('DELETE FROM emergency_contacts WHERE id = ? AND user_id = ?').run(id, req.user.id)
  return res.json({ ok: true })
})

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    age: row.age,
    gender: row.gender,
    address: row.address,
    blood_group: row.blood_group,
    allergies: row.allergies,
    conditions_text: row.conditions_text,
  }
}

module.exports = router

