# Upload Failure Investigation

## Issue Summary
Users are experiencing upload failures with HTTP 413 and HTTP 500 errors for files that appear to be within size limits.

## Error Analysis

### HTTP 413 Errors
- **Files affected**: `Adele_-_Someone_Like_You__Official_Music_Video_(128k).mp3`, `21_Savage_-_A_Lot__Lyrics_(128k).mp3`
- **Error**: Request Entity Too Large
- **Likely cause**: Server-side body size limit exceeded

### HTTP 500 Errors  
- **Files affected**: `50_Cent_-_In_Da_Club__Official_Music_Video_(128k).mp3`
- **Error**: Internal server error
- **Likely cause**: Backend processing failure

## Configuration Analysis

### Current Limits
1. **Next.js Config**: `bodySizeLimit: '500mb'` (for server actions)
2. **Portal Default**: 100MB (`maxFileSize: 104857600`)
3. **Schema Max**: 5GB (`max(5 * 1024 * 1024 * 1024)`)

### Potential Issues

#### 1. Vercel Deployment Limits
- **Vercel Function Payload Limit**: 4.5MB for Hobby plan, 50MB for Pro plan
- **Vercel Request Body Limit**: May be different from Next.js config
- **Function Timeout**: 10s for Hobby, 60s for Pro

#### 2. Missing Vercel Configuration
- No `vercel.json` file to configure function limits
- `bodySizeLimit` in `next.config.ts` may not apply to API routes on Vercel

#### 3. File Size Estimation
- 128kbps MP3 files can vary significantly in size
- A 4-minute song at 128kbps ≈ 3.8MB
- A 6-minute song at 128kbps ≈ 5.7MB

## Recommended Fixes

### 1. Add Vercel Configuration
Create `vercel.json` with proper function configuration:

```json
{
  "functions": {
    "app/api/upload/route.ts": {
      "maxDuration": 60
    },
    "app/api/upload/chunked/*/route.ts": {
      "maxDuration": 60
    }
  }
}
```

### 2. Implement Proper Chunked Upload Detection
- Force chunked uploads for files > 4MB on Vercel
- Add client-side file size detection
- Automatically route large files to chunked upload

### 3. Add Better Error Handling
- Detect HTTP 413 errors and suggest chunked upload
- Provide clear file size feedback to users
- Log actual file sizes in upload attempts

### 4. Environment-Specific Limits
- Different limits for local development vs production
- Detect deployment environment and adjust accordingly

## Next Steps

1. Create `vercel.json` configuration
2. Add file size detection in upload component
3. Implement automatic chunked upload routing
4. Add better error messages for size limits
5. Test with actual problematic files