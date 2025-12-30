import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface UploadNotificationEmailProps {
  portalName: string;
  fileName: string;
  fileSize: number;
  clientName?: string;
  clientEmail?: string;
  clientMessage?: string;
  uploadedAt: Date;
  dashboardUrl: string;
  portalUrl?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
}

export const UploadNotificationEmail = ({
  portalName,
  fileName,
  fileSize,
  clientName,
  clientEmail,
  clientMessage,
  uploadedAt = new Date(),
  dashboardUrl,
  portalUrl,
}: UploadNotificationEmailProps) => (
  <Html>
    <Head />
    <Preview>New file uploaded to {portalName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoContainer}>
          <Heading style={logo}>📁 SecureUploadHub</Heading>
        </Section>

        <Heading style={h1}>New File Upload</Heading>

        <Text style={text}>
          Someone just uploaded a file to your <strong>{portalName}</strong> portal.
        </Text>

        <Section style={detailsContainer}>
          <Text style={detailsTitle}>Upload Details:</Text>

          <Section style={detailRow}>
            <Text style={detailLabel}>File Name</Text>
            <Text style={detailValue}>{fileName}</Text>
          </Section>

          <Section style={detailRow}>
            <Text style={detailLabel}>File Size</Text>
            <Text style={detailValue}>{formatFileSize(fileSize)}</Text>
          </Section>

          <Section style={detailRow}>
            <Text style={detailLabel}>Uploaded At</Text>
            <Text style={detailValue}>
              {uploadedAt.toLocaleString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </Text>
          </Section>

          {clientName && (
            <Section style={detailRow}>
              <Text style={detailLabel}>From</Text>
              <Text style={detailValue}>
                {clientName}
                {clientEmail && ` (${clientEmail})`}
              </Text>
            </Section>
          )}

          {clientMessage && (
            <Section style={detailRow}>
              <Text style={detailLabel}>Message</Text>
              <Text style={detailValue}>{clientMessage}</Text>
            </Section>
          )}
        </Section>

        <Section style={btnContainer}>
          <Button style={button} href={dashboardUrl}>
            View in Dashboard
          </Button>
        </Section>

        {portalUrl && (
          <Section style={btnContainer}>
            <Link href={portalUrl} style={secondaryButton}>
              Visit Portal
            </Link>
          </Section>
        )}

        <Hr style={hr} />

        <Text style={footer}>
          You received this email because you own the portal "{portalName}".
          If you did not authorize this upload, please review your portal security settings.
        </Text>

        <Link href="https://secureuploadhub.com" style={footerLink}>
          SecureUploadHub
        </Link>
      </Container>
    </Body>
  </Html>
);

export default UploadNotificationEmail;

const main = {
  backgroundColor: "#0a0a0a",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "40px 20px",
  backgroundColor: "#111111",
  borderRadius: "12px",
  border: "1px solid #333",
  maxWidth: "580px",
};

const logoContainer = {
  marginBottom: "32px",
};

const logo = {
  color: "#fff",
  fontSize: "24px",
  fontWeight: "700",
  letterSpacing: "-0.5px",
  margin: "0",
};

const h1 = {
  color: "#fff",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "1.1",
  margin: "0 0 24px",
};

const text = {
  color: "#a1a1aa",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "16px 0",
};

const detailsContainer = {
  backgroundColor: "#1a1a1a",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
  border: "1px solid #333",
};

const detailsTitle = {
  color: "#fff",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0 0 16px",
};

const detailRow = {
  marginBottom: "12px",
};

const detailLabel = {
  color: "#71717a",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 4px",
};

const detailValue = {
  color: "#a1a1aa",
  fontSize: "14px",
  margin: "0",
  wordBreak: "break-word" as const,
};

const btnContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button = {
  backgroundColor: "#7c3aed",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 32px",
  lineHeight: "100%",
};

const secondaryButton = {
  backgroundColor: "#333",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "10px 24px",
  lineHeight: "100%",
  border: "1px solid #555",
};

const hr = {
  borderColor: "#333",
  margin: "40px 0 20px",
};

const footerLink = {
  color: "#a1a1aa",
  fontSize: "14px",
  textDecoration: "underline",
};

const footer = {
  color: "#71717a",
  fontSize: "12px",
  lineHeight: "16px",
  margin: "10px 0",
};
