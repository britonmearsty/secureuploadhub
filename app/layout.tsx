import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SecureUploadHub | The Professional Way to Collect Client Files",
  description: "Stop chasing email attachments. Give your clients a secure, branded upload portal that pipes files directly into your Google Drive or Dropbox.",
  openGraph: {
    title: "SecureUploadHub | The Professional Way to Collect Client Files",
    description: "Stop chasing email attachments. Give your clients a secure, branded upload portal that pipes files directly into your Google Drive or Dropbox.",
    type: "website",
    url: "https://secureuploadhub.com",
    images: [
      {
        url: "https://8qlc5jjyt0.ufs.sh/f/0kCONu1c57kgA4GOd2yySTBbnfrYeasU8tq4QAowVDXME5Ic",
        width: 1200,
        height: 630,
        alt: "SecureUploadHub",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SecureUploadHub | The Professional Way to Collect Client Files",
    description: "Stop chasing email attachments. Give your clients a secure, branded upload portal that pipes files directly into your Google Drive or Dropbox.",
    images: ["https://8qlc5jjyt0.ufs.sh/f/0kCONu1c57kgA4GOd2yySTBbnfrYeasU8tq4QAowVDXME5Ic"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
