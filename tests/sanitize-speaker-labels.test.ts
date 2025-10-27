import { describe, it, expect } from 'vitest'
import { sanitizeSpeakerLabels } from '@/lib/inngest/episode-shared'

describe('sanitizeSpeakerLabels', () => {
  it('removes A: prefix', () => {
    expect(sanitizeSpeakerLabels('A: Hello world')).toBe('Hello world')
  })

  it('removes B: prefix', () => {
    expect(sanitizeSpeakerLabels('B: Goodbye')).toBe('Goodbye')
  })

  it('removes HOST SLICE: prefix', () => {
    expect(sanitizeSpeakerLabels('HOST SLICE: Welcome')).toBe('Welcome')
  })

  it('removes PODSLICE GUEST - text', () => {
    expect(sanitizeSpeakerLabels('PODSLICE GUEST – Next')).toBe('Next')
  })

  it('handles no prefix', () => {
    expect(sanitizeSpeakerLabels('Plain text')).toBe('Plain text')
  })

  it('trims spaces', () => {
    expect(sanitizeSpeakerLabels('  A :  Hello  ')).toBe('Hello')
  })
})
