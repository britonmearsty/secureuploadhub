/**
 * Batch Upload Client Example
 * 
 * This example shows how to implement batch uploads on the client side
 * to receive a single email notification after all files are uploaded.
 */

class BatchUploadClient {
  constructor(portalId, options = {}) {
    this.portalId = portalId
    this.baseUrl = options.baseUrl || ''
    this.token = options.token || null
    this.batchId = null
  }

  /**
   * Upload multiple files as a batch
   * @param {File[]} files - Array of File objects to upload
   * @param {Object} clientInfo - Client information
   * @returns {Promise<Object>} Upload results
   */
  async uploadBatch(files, clientInfo = {}) {
    if (!files || files.length === 0) {
      throw new Error('No files provided for upload')
    }

    console.log(`🚀 Starting batch upload of ${files.length} files`)

    try {
      // Step 1: Create batch session
      await this.createBatchSession(files.length, clientInfo)

      // Step 2: Upload all files with batch ID
      const uploadResults = await this.uploadFiles(files, clientInfo)

      // Step 3: Return results
      console.log(`✅ Batch upload completed! Single email notification will be sent.`)
      return {
        success: true,
        batchId: this.batchId,
        uploadCount: uploadResults.length,
        results: uploadResults
      }

    } catch (error) {
      console.error('❌ Batch upload failed:', error)
      throw error
    }
  }

  /**
   * Create a batch upload session
   */
  async createBatchSession(fileCount, clientInfo) {
    console.log(`📦 Creating batch session for ${fileCount} files`)

    const response = await fetch(`${this.baseUrl}/api/upload/batch/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        portalId: this.portalId,
        fileCount: fileCount,
        clientName: clientInfo.clientName,
        clientEmail: clientInfo.clientEmail,
        clientMessage: clientInfo.clientMessage,
        token: this.token
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to create batch session: ${error.error}`)
    }

    const result = await response.json()
    this.batchId = result.batchId

    console.log(`✅ Batch session created: ${this.batchId}`)
  }

  /**
   * Upload all files with batch tracking
   */
  async uploadFiles(files, clientInfo) {
    console.log(`📤 Uploading ${files.length} files...`)

    // Upload files in parallel for better performance
    const uploadPromises = files.map((file, index) => 
      this.uploadSingleFile(file, clientInfo, index)
    )

    return Promise.all(uploadPromises)
  }

  /**
   * Upload a single file with batch ID
   */
  async uploadSingleFile(file, clientInfo, index) {
    console.log(`📁 Uploading file ${index + 1}: ${file.name}`)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('portalId', this.portalId)
    formData.append('batchId', this.batchId) // Important: Include batch ID
    
    if (clientInfo.clientName) {
      formData.append('clientName', clientInfo.clientName)
    }
    if (clientInfo.clientEmail) {
      formData.append('clientEmail', clientInfo.clientEmail)
    }
    if (clientInfo.clientMessage) {
      formData.append('clientMessage', clientInfo.clientMessage)
    }
    if (this.token) {
      formData.append('token', this.token)
    }

    const response = await fetch(`${this.baseUrl}/api/upload`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to upload ${file.name}: ${error.error}`)
    }

    const result = await response.json()
    console.log(`✅ File uploaded: ${file.name} (ID: ${result.uploadId})`)
    
    return {
      fileName: file.name,
      uploadId: result.uploadId,
      success: result.success
    }
  }

  /**
   * Check batch upload status
   */
  async getBatchStatus() {
    if (!this.batchId) {
      throw new Error('No batch session active')
    }

    const response = await fetch(
      `${this.baseUrl}/api/upload/batch/status?batchId=${this.batchId}`
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to get batch status: ${error.error}`)
    }

    return response.json()
  }
}

// Usage Examples

// Example 1: Basic batch upload
async function basicBatchUpload() {
  const uploader = new BatchUploadClient('portal-123')
  
  const files = [
    new File(['content1'], 'file1.txt', { type: 'text/plain' }),
    new File(['content2'], 'file2.txt', { type: 'text/plain' }),
    new File(['content3'], 'file3.txt', { type: 'text/plain' })
  ]

  const clientInfo = {
    clientName: 'John Doe',
    clientEmail: 'john@example.com',
    clientMessage: 'Project files for review'
  }

  try {
    const result = await uploader.uploadBatch(files, clientInfo)
    console.log('Upload completed:', result)
  } catch (error) {
    console.error('Upload failed:', error)
  }
}

// Example 2: Password-protected portal
async function passwordProtectedUpload() {
  const uploader = new BatchUploadClient('portal-456', {
    token: 'your-password-token'
  })
  
  const files = [/* your files */]
  const clientInfo = {/* your client info */}

  const result = await uploader.uploadBatch(files, clientInfo)
  console.log('Protected upload completed:', result)
}

// Example 3: With progress monitoring
async function uploadWithProgress() {
  const uploader = new BatchUploadClient('portal-789')
  
  const files = [/* your files */]
  const clientInfo = {/* your client info */}

  // Start upload
  const uploadPromise = uploader.uploadBatch(files, clientInfo)

  // Monitor progress (optional)
  const progressInterval = setInterval(async () => {
    try {
      const status = await uploader.getBatchStatus()
      console.log(`Progress: ${status.progress}% (${status.uploadedFileCount}/${status.expectedFileCount})`)
      
      if (status.isComplete) {
        clearInterval(progressInterval)
        console.log('Batch upload completed!')
      }
    } catch (error) {
      // Batch might not be created yet or already completed
      clearInterval(progressInterval)
    }
  }, 1000)

  await uploadPromise
}

// Example 4: HTML form integration
function setupBatchUploadForm() {
  const form = document.getElementById('batch-upload-form')
  const fileInput = document.getElementById('files')
  const clientNameInput = document.getElementById('clientName')
  const clientEmailInput = document.getElementById('clientEmail')
  const clientMessageInput = document.getElementById('clientMessage')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    const files = Array.from(fileInput.files)
    if (files.length === 0) {
      alert('Please select files to upload')
      return
    }

    const uploader = new BatchUploadClient('your-portal-id')
    
    const clientInfo = {
      clientName: clientNameInput.value,
      clientEmail: clientEmailInput.value,
      clientMessage: clientMessageInput.value
    }

    try {
      const result = await uploader.uploadBatch(files, clientInfo)
      alert(`Successfully uploaded ${result.uploadCount} files! You will receive an email notification.`)
    } catch (error) {
      alert(`Upload failed: ${error.message}`)
    }
  })
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BatchUploadClient
}

// Make available globally in browser
if (typeof window !== 'undefined') {
  window.BatchUploadClient = BatchUploadClient
}