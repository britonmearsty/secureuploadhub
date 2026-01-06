import { describe, it, expect } from 'vitest'
import { validateSlug, sanitizeSlug, generateSlugSuggestion } from '@/lib/slug-validation'

describe('Slug Validation', () => {
  describe('validateSlug', () => {
    it('should accept valid slugs', () => {
      const validSlugs = [
        'my-portal',
        'client-uploads',
        'project-2024',
        'ab',
        'test123'
      ]

      validSlugs.forEach(slug => {
        const result = validateSlug(slug)
        if (!result.isValid) {
          console.log(`Failed slug: ${slug}, error: ${result.error}`)
        }
        expect(result.isValid).toBe(true)
        expect(result.sanitized).toBe(slug)
      })
    })

    it('should reject empty or invalid slugs', () => {
      const invalidSlugs = [
        '',
        ' ',
        'a',
        'My-Portal',
        'my_portal',
        'my portal',
        'my--portal',
        '-my-portal',
        'my-portal-',
        'my.portal',
        'my@portal',
        'my#portal',
        'my portal!',
        'p/new/a',
        'test/path',
        'slug\\with\\backslashes',
        'slug?with=query',
        'slug#with-fragment',
        'this-is-a-very-long-slug-that-exceeds-the-maximum-allowed-length-of-fifty-characters'
      ]

      invalidSlugs.forEach(slug => {
        const result = validateSlug(slug)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })

    it('should reject reserved slugs', () => {
      const reservedSlugs = [
        'admin',
        'api',
        'dashboard',
        'auth',
        'login',
        'www',
        'mail',
        'support',
        'portal',
        'portals'
      ]

      reservedSlugs.forEach(slug => {
        const result = validateSlug(slug)
        expect(result.isValid).toBe(false)
        expect(result.error).toContain('reserved')
      })
    })

    it('should reject numeric-only slugs', () => {
      const numericSlugs = ['123', '456789']

      numericSlugs.forEach(slug => {
        const result = validateSlug(slug)
        expect(result.isValid).toBe(false)
        expect(result.error).toContain('only numbers')
      })

      // Single digit should fail for length, not numeric rule
      const singleDigit = validateSlug('0')
      expect(singleDigit.isValid).toBe(false)
      expect(singleDigit.error).toContain('at least 2 characters')
    })

    it('should reject technical prefixes', () => {
      const technicalSlugs = ['www-portal', 'api-test', 'cdn-assets', 'mail-server']

      technicalSlugs.forEach(slug => {
        const result = validateSlug(slug)
        expect(result.isValid).toBe(false)
        expect(result.error).toContain('technical prefixes')
      })
    })
  })

  describe('sanitizeSlug', () => {
    it('should sanitize strings into valid slugs', () => {
      const testCases = [
        { input: 'My Portal Name', expected: 'my-portal-name' },
        { input: 'Client Uploads 2024!', expected: 'client-uploads-2024' },
        { input: 'Test@#$%Portal', expected: 'testportal' },
        { input: '  Spaced   Out  ', expected: 'spaced-out' },
        { input: 'multiple---hyphens', expected: 'multiple-hyphens' },
        { input: '-leading-and-trailing-', expected: 'leading-and-trailing' },
        { input: 'p/new/a', expected: 'pnewa' },
        { input: 'test/path/here', expected: 'testpathhere' },
        { input: 'slug\\with\\backslashes', expected: 'slugwithbackslashes' },
        { input: 'slug?with=query&params', expected: 'slugwithqueryparams' },
        { input: 'slug#with-fragment', expected: 'slugwith-fragment' },
        { input: '', expected: '' },
        { input: '123 Numbers Only', expected: '123-numbers-only' }
      ]

      testCases.forEach(({ input, expected }) => {
        const result = sanitizeSlug(input)
        expect(result).toBe(expected)
      })
    })

    it('should handle edge cases', () => {
      expect(sanitizeSlug(null as any)).toBe('')
      expect(sanitizeSlug(undefined as any)).toBe('')
      expect(sanitizeSlug(123 as any)).toBe('')
    })
  })

  describe('generateSlugSuggestion', () => {
    it('should generate valid slug suggestions', () => {
      const result = generateSlugSuggestion('My Portal')
      expect(result).toBe('my-portal')
      expect(validateSlug(result).isValid).toBe(true)
    })

    it('should handle existing slugs by adding numbers', () => {
      const existingSlugs = ['my-portal', 'my-portal-1', 'my-portal-2']
      const result = generateSlugSuggestion('My Portal', existingSlugs)
      expect(result).toBe('my-portal-3')
      expect(validateSlug(result).isValid).toBe(true)
    })

    it('should fallback to default when input is invalid', () => {
      const result = generateSlugSuggestion('')
      expect(result).toBe('portal-1') // Since 'portal' is reserved, it becomes 'portal-1'
      expect(validateSlug(result).isValid).toBe(true)
    })

    it('should handle reserved words by adding numbers', () => {
      const result = generateSlugSuggestion('admin')
      expect(result).toBe('admin-1')
      expect(validateSlug(result).isValid).toBe(true)
    })

    it('should generate timestamp-based fallback for extreme cases', () => {
      // Create a scenario where many suggestions are taken
      const existingSlugs = Array.from({ length: 1000 }, (_, i) => `portal-${i + 1}`)
      const result = generateSlugSuggestion('', existingSlugs)
      expect(result).toMatch(/^portal-\d{6}$/)
      expect(validateSlug(result).isValid).toBe(true)
    })
  })
})