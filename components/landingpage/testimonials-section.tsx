import React from 'react';
import { Counter } from './counter';
import { Star } from 'lucide-react';

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 bg-white border-t border-slate-100 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6 tracking-tight">Loved by professionals</h2>
          <p className="text-lg text-slate-500">Join thousands who trust us with their client files.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              quote: "We stopped chasing files and started focusing on real work. It is a game changer for our agency.",
              author: "Sarah J.",
              role: "Creative Director",
              initials: "SJ"
            },
            {
              quote: "My clients love how easy it is to use. No login required, just drag and drop.",
              author: "Michael T.",
              role: "Tax Consultant",
              initials: "MT"
            },
            {
              quote: "The auto-sync to Google Drive saves me at least 5 hours a week of manual sorting.",
              author: "Elena R.",
              role: "Legal Assistant",
              initials: "ER"
            }
          ].map((testimonial, i) => (
            <div key={i} className="bg-slate-50 border border-slate-100 p-8 rounded-3xl hover:shadow-md transition-shadow">
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-slate-600 mb-8 leading-relaxed">
                "{testimonial.quote}"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
                  {testimonial.initials}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{testimonial.author}</p>
                  <p className="text-slate-500 text-xs">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Row */}
        <div className="mt-20 py-12 border-y border-slate-100 flex flex-wrap justify-center md:justify-between items-center gap-8">
          <div className="text-center w-full md:w-auto">
            <p className="text-4xl font-bold text-slate-900 mb-1">
              <Counter end={10} suffix="K+" />
            </p>
            <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Active Users</p>
          </div>
          <div className="hidden md:block w-px h-12 bg-slate-200"></div>
          <div className="text-center w-full md:w-auto">
            <p className="text-4xl font-bold text-slate-900 mb-1">
              <Counter end={2} suffix="M+" />
            </p>
            <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Files Uploaded</p>
          </div>
          <div className="hidden md:block w-px h-12 bg-slate-200"></div>
          <div className="text-center w-full md:w-auto">
            <p className="text-4xl font-bold text-slate-900 mb-1">
              <Counter end={99.9} suffix="%" decimals={1} />
            </p>
            <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Uptime</p>
          </div>
          <div className="hidden md:block w-px h-12 bg-slate-200"></div>
          <div className="text-center w-full md:w-auto">
            <p className="text-4xl font-bold text-slate-900 mb-1">
              <Counter end={4.9} suffix="/5" decimals={1} />
            </p>
            <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Average Rating</p>
          </div>
        </div>
      </div>
    </section>
  );
}
