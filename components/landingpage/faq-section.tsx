import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQ_ITEMS = [
  {
    question: "Do clients need an account?",
    answer: "No. Clients upload files without signing up."
  },
  {
    question: "How large can files be?",
    answer: "Large files are supported without email limits."
  },
  {
    question: "Is it secure?",
    answer: "Yes. All uploads are encrypted and access-controlled."
  },
  {
    question: "Where are files stored?",
    answer: "Files sync directly to your connected storage."
  },
  {
    question: "Can I brand the upload page?",
    answer: "Yes. Logos, colors, and instructions are customizable."
  }
];

export function FAQSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section id="faq" className="py-32 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4 tracking-tight">Frequently asked questions</h2>
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
