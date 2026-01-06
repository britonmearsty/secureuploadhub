# Portal Slug Validation

This document describes the slug validation system implemented to prevent invalid or weird URLs in portal creation.

## Overview

Portal slugs are used to create public URLs in the format `/p/{slug}`. To ensure clean, professional URLs and prevent conflicts, we've implemented comprehensive slug validation.

## Validation Rules

### Format Requirements
- **Length**: 2-50 characters
- **Characters**: Only lowercase letters (a-z), numbers (0-9), and hyphens (-)
- **Structure**: Cannot start or end with hyphens
- **Hyphens**: No consecutive hyphens allowed

### Content Restrictions
- **Reserved Words**: System routes and common terms are blocked (admin, api, dashboard, new, etc.)
- **Numeric Only**: Slugs cannot be only numbers (except single digits fail for length)
- **Technical Prefixes**: Cannot start with www-, api-, cdn-, mail-, etc.
- **URL-Breaking Characters**: Forward slashes, backslashes, query parameters, fragments are removed

### Reserved Slug List
The following slugs are reserved and cannot be used:
- System routes: `admin`, `api`, `dashboard`, `auth`, `login`, `logout`, etc.
- Common pages: `about`, `contact`, `help`, `support`, `faq`, etc.
- Technical terms: `www`, `mail`, `ftp`, `ssl`, `cdn`, etc.
- Service names: `facebook`, `twitter`, `google`, `apple`, etc.

## Implementation

### Backend Validation
- **API Route**: `/api/portals` (POST) validates slugs before creation
- **Database**: Unique constraint on slug field prevents duplicates
- **Error Codes**: Specific error codes for different validation failures
  - `INVALID_SLUG`: Format or content validation failed
  - `SLUG_TAKEN`: Slug already exists in database

### Frontend Validation
- **Real-time Feedback**: Slug input shows validation status as user types
- **Auto-sanitization**: Portal name automatically generates valid slug
- **Error Handling**: Specific error messages guide users to fix issues

## Usage Examples

### Valid Slugs
```
my-portal
client-uploads
project-2024
marketing-assets
legal-documents
```

### Invalid Slugs
```
My-Portal          → Contains uppercase
my_portal          → Contains underscore
my--portal         → Consecutive hyphens
-my-portal         → Starts with hyphen
my-portal-         → Ends with hyphen
admin              → Reserved word
new                → Reserved routing word
123                → Only numbers
www-portal         → Technical prefix
p/new/a            → Contains forward slashes
test\\path         → Contains backslashes
slug?query         → Contains query characters
slug#fragment      → Contains fragment characters
```

### Auto-Sanitization
```
"My Portal Name"     → "my-portal-name"
"Client Uploads!"    → "client-uploads"
"Test@#$Portal"      → "testportal"
"  Spaced   Out  "   → "spaced-out"
"p/new/a"            → "pnewa"
"test/path/here"     → "testpathhere"
"slug?with=query"    → "slugwithquery"
```

## Error Messages

The system provides clear, actionable error messages:
- "Slug must be at least 2 characters long"
- "Slug can only contain lowercase letters, numbers, and hyphens"
- "Slug cannot start or end with a hyphen"
- "Slug cannot contain consecutive hyphens"
- "This slug is reserved and cannot be used"
- "Slug cannot be only numbers"
- "This URL slug is already taken. Please choose a different one."

## Testing

Comprehensive tests cover:
- Valid slug acceptance
- Invalid slug rejection
- Reserved word blocking
- Sanitization functionality
- Suggestion generation
- Edge cases and error conditions

Run tests with:
```bash
npm test -- __tests__/lib/slug-validation.test.ts
```

## Benefits

1. **Professional URLs**: Clean, readable portal URLs
2. **No Conflicts**: Prevents system route conflicts
3. **SEO Friendly**: Hyphens and lowercase for better SEO
4. **User Experience**: Clear validation feedback
5. **Security**: Prevents potentially malicious slugs
6. **Consistency**: Standardized URL format across all portals