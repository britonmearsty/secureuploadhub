import '@testing-library/jest-dom'

// Mock Next.js environment variables
process.env.NODE_ENV = 'test'
process.env.AUTH_SECRET = 'test-secret'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// Mock fetch for API calls
global.fetch = vi.fn()

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
  },
  writable: true,
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock XMLHttpRequest for chunked upload tests
global.XMLHttpRequest = vi.fn().mockImplementation(() => ({
  open: vi.fn(),
  send: vi.fn(function() {
    // Simulate successful upload
    setTimeout(() => {
      this.status = 200
      this.responseText = JSON.stringify({ success: true })
      if (this.onload) this.onload()
    }, 10)
  }),
  setRequestHeader: vi.fn(),
  status: 200,
  responseText: '{"success": true}',
  onload: null,
  onerror: null,
}))

// Mock DragEvent and DataTransfer for drag-and-drop tests
global.DragEvent = class MockDragEvent {
  constructor(type, options = {}) {
    this.type = type
    this.bubbles = options.bubbles || false
    this.dataTransfer = options.dataTransfer || null
    this.preventDefault = vi.fn()
    this.stopPropagation = vi.fn()
  }
}

global.DataTransfer = class MockDataTransfer {
  constructor() {
    this.files = []
    this.items = {
      add: vi.fn((file) => {
        this.files.push(file)
      }),
    }
  }
}

// Mock File constructor to ensure it works properly in tests
const OriginalFile = global.File
global.File = class MockFile extends OriginalFile {
  constructor(bits, name, options = {}) {
    super(bits, name, options)
    // Ensure size property is properly set
    if (options.size !== undefined) {
      Object.defineProperty(this, 'size', { value: options.size, writable: false })
    }
  }
}