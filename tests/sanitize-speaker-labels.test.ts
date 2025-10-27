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

  it('removes inline B. reference', () => {
    expect(sanitizeSpeakerLabels('What do you think, B. For now')).toBe('What do you think,  For now')
  })

  it('removes inline A. reference', () => {
    expect(sanitizeSpeakerLabels('It will be, A. Yes')).toBe('It will be,  Yes')
  })

  it('removes PODSLICE GUEST. inline', () => {
    expect(sanitizeSpeakerLabels('Hello PODSLICE GUEST. Goodbye')).toBe('Hello  Goodbye')
  })

  it('does not remove non-speaker A or B', () => {
    expect(sanitizeSpeakerLabels('Vitamin A is good')).toBe('Vitamin A is good') // but this might remove if \bA\., but since no dot, ok
  })
})
