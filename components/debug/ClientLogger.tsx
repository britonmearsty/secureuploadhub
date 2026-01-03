'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function ClientLogger({ 
  component, 
  data 
}: { 
  component: string
  data: any 
}) {
  const pathname = usePathname()
  
  useEffect(() => {
    console.log(`🔍 CLIENT LOG [${component}]:`, {
      pathname,
      timestamp: new Date().toISOString(),
      data
    })
  }, [component, data, pathname])

  return null
}