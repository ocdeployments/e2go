import * as fs from 'fs'

describe('CASL Email Compliance', () => {
  const emailFiles = [
    'src/lib/emails/clock1-inactivity.ts',
    'src/lib/emails/clock2-post-outcome.ts',
  ]

  emailFiles.forEach(filePath => {
    const fileName = filePath.split('/').pop()
    test(`${fileName} contains unsubscribe mechanism`, () => {
      const content = fs.readFileSync(filePath, 'utf8')
      const hasUnsubscribe = (
        content.toLowerCase().includes('unsubscribe') ||
        content.toLowerCase().includes('opt-out') ||
        content.toLowerCase().includes('opt out')
      )
      expect(hasUnsubscribe).toBe(true)
    })
    test(`${fileName} identifies e2go as sender`, () => {
      const content = fs.readFileSync(filePath, 'utf8')
      const identifies = content.toLowerCase().includes('e2go')
      expect(identifies).toBe(true)
    })
  })

  test('Clock 1 has day triggers 60 67 74 81', () => {
    const content = fs.readFileSync('src/lib/emails/clock1-inactivity.ts', 'utf8')
    expect(content).toContain('60')
    expect(content).toContain('67')
    expect(content).toContain('74')
    expect(content).toContain('81')
  })

  test('Clock 2 has day triggers 60 and 83', () => {
    const content = fs.readFileSync('src/lib/emails/clock2-post-outcome.ts', 'utf8')
    expect(content).toContain('60')
    expect(content).toContain('83')
  })
})