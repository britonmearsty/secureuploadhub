import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQ_ITEMS = [
  {
    question: "Is SecureUploadHub secure for sensitive documents?",
    answer: "Yes, all files are encrypted with AES-256 encryption and stored securely in your connected cloud storage. We're GDPR compliant and follow SOC 2 Type II security standards."
  },
  {
    question: "Do clients need to create an account?",
    answer: "No, clients can upload files directly through your branded portal without creating any accounts. This removes friction and makes the process seamless for your clients."
  },
  {
    question: "How large can uploaded files be?",
    answer: "Unlike email attachments, there are no size limits. Clients can upload large files, presentations, videos, and entire project folders without restrictions."
  },
  {
    question: "Where are the uploaded files stored?",
    answer: "Files are stored in your connected cloud storage (Google Drive, Dropbox, OneDrive) or in our secure servers. You maintain full control and ownership of all uploaded files."
  },
  {
    question: "Can I customize the upload portal?",
    answer: "Yes, you can fully brand your upload portal with your logo, colors, custom messages, and specific file type requirements to match your professional brand."
  },
  {
    question: "How does SecureUploadHub compare to email attachments?",
    answer: "SecureUploadHub eliminates email attachment size limits, provides better security, organizes files automatically, and gives you a professional branded experience instead of messy email threads."
  }
];

export function FAQSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Structured data for FAQ
  const faqSchema = {
    "@type": "FAQPage",
    "mainEntity": FAQ_ITEMS.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <section id="faq" className="py-32 bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4 tracking-tight">Frequently asked questions</h2>
          <p className="text-lg text-muted-foreground">Everything you need to know about secure file collection</p>
        </div>

        <div className="space-y-4">
          {FAQ_ITEMS.map((faq, index) => (
            <div key={index} className="border border-border/50 rounded-2xl overflow-hidden bg-secondary/10">
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-semibold text-foreground pr-4 text-base md:text-lg">{faq.question}</span>
                <div className={`w-8 h-8 rounded-full bg-background flex items-center justify-center border border-border/50 transition-transform duration-300 ${openFaq === index ? 'rotate-180' : ''}`}>
                  <ChevronDown className="w-5 h-5" />
                </div>
              </button>
              <div
                className={`grid transition-all duration-300 ease-in-out ${openFaq === index ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
              >
                <div className="overflow-hidden">
                  <div className="px-6 pb-6 text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
