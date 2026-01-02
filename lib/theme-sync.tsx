"use client"

import { useEffect } from "react"
import { useTheme } from "./theme-provider"

interface ThemeSyncProps {
  userTheme: string
}

export function ThemeSync({ userTheme }: ThemeSyncProps) {
  const { setTheme } = useTheme()

  useEffect(() => {
    // Sync the theme from the database with the client-side theme
    if (userTheme === "light" || userTheme === "dark" || userTheme === "system") {
      setTheme(userTheme)
    }
  }, [userTheme, setTheme])

  return null
}