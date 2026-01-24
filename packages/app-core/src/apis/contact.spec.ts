import { describe, expect, it } from 'vitest'

import { initialOf } from './contact'

describe('initialOf', () => {
  it('英文名取大写首字母', () => {
    expect(initialOf('alice')).toBe('A')
    expect(initialOf('Bob')).toBe('B')
  })

  it('中文与数字落到 #', () => {
    expect(initialOf('李四')).toBe('#')
    expect(initialOf('8937')).toBe('#')
  })

  it('空串也不抛错', () => {
    expect(initialOf('   ')).toBe('#')
  })
})
