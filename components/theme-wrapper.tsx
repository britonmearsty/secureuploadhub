"use client";

import { ThemeProvider } from "@/lib/theme-provider";

interface ThemeWrapperProps {
  children: React.ReactNode;
  defaultTheme?: "light" | "dark" | "system";
}

export function ThemeWrapper({ children, defaultTheme = "system" }: ThemeWrapperProps) {
  return (
    <ThemeProvider defaultTheme={defaultTheme}>
      {children}
    </ThemeProvider>
  );
}