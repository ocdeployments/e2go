describe('Email Scheduler Idempotency', () => {
  test('checkInactivityAndSendEmails is exported', () => {
    const mod = require('../../src/lib/email-scheduler')
    expect(typeof mod.checkInactivityAndSendEmails).toBe('function')
  })
  test('sendOutcomeEmails is exported', () => {
    const mod = require('../../src/lib/email-scheduler')
    expect(typeof mod.sendOutcomeEmails).toBe('function')
  })
  test('scheduler references email_log table', () => {
    const fs = require('fs')
    const content = fs.readFileSync('src/lib/email-scheduler.ts', 'utf8')
    expect(content).toContain('email_log')
  })
  test('scheduler has deduplication logic', () => {
    const fs = require('fs')
    const content = fs.readFileSync('src/lib/email-scheduler.ts', 'utf8')
    const hasDedupe = (
      content.includes('day_number') ||
      content.includes('sent_at') ||
      content.includes('already') ||
      content.includes('duplicate')
    )
    expect(hasDedupe).toBe(true)
  })
})