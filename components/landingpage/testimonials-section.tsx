import React from 'react';
import { Counter } from './counter';

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-32 bg-background relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight">Loved by professionals</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white border border-border p-8 rounded-[2rem]">
            <p className="text-muted-foreground mb-6 leading-relaxed text-lg">
              "We stopped chasing files and started focusing on real work."
            </p>
            <p className="font-bold text-foreground">— Agency Owner</p>
          </div>
          <div className="bg-white border border-border p-8 rounded-[2rem]">
            <p className="text-muted-foreground mb-6 leading-relaxed text-lg">
              "Clients upload files without confusion. It just works."
            </p>
            <p className="font-bold text-foreground">— Consultant</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="p-4">
            <p className="text-4xl lg:text-5xl font-bold text-primary mb-2">
              <Counter end={10} suffix="K+" />
            </p>
            <p className="text-muted-foreground font-medium">professionals</p>
          </div>
          <div className="p-4">
            <p className="text-4xl lg:text-5xl font-bold text-primary mb-2">
              <Counter end={2} suffix="M+" />
            </p>
            <p className="text-muted-foreground font-medium">files uploaded</p>
          </div>
          <div className="p-4">
            <p className="text-4xl lg:text-5xl font-bold text-primary mb-2">
              <Counter end={99.9} suffix="%" decimals={1} />
            </p>
            <p className="text-muted-foreground font-medium">uptime</p>
          </div>
          <div className="p-4">
            <p className="text-4xl lg:text-5xl font-bold text-primary mb-2">
              <Counter end={4.9} suffix="/5" decimals={1} />
            </p>
            <p className="text-muted-foreground font-medium">average rating</p>
          </div>
        </div>
      </div>
    </section>
  );
}
