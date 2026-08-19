'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function HomePage() {
  useEffect(() => {
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100', 'translate-y-0');
          entry.target.classList.remove('opacity-0', 'translate-y-8');
        }
      });
    }, { threshold: 0.15 });

    reveals.forEach(el => observer.observe(el));
    
    return () => {
      reveals.forEach(el => observer.unobserve(el));
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#213147] text-white font-body selection:bg-red-600 selection:text-white overflow-x-hidden">
      {/* HERO SECTION - Visible Immediately */}
      <section className="relative min-h-[90vh] flex flex-col justify-center px-6 md:px-12 py-20 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#213147] via-[#213147] to-[#1a2d44]" />
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[85%] h-[80%] bg-[radial-gradient(ellipse_at_center,rgba(229,0,0,0.07)_0%,transparent_60%)]" />
          <div className="absolute bottom-0 left-0 w-[50%] h-[60%] bg-[radial-gradient(ellipse_at_center,rgba(44,66,96,0.5)_0%,transparent_60%)]" />
          
          {/* Spinning Bullseye */}
          <div className="absolute top-1/2 -right-20 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-[0.04] bg-[conic-gradient(from_0deg,#E50000,#213147,#E50000,#213147,#E50000)] animate-[spin_40s_linear_infinite]" />
          
          {/* Static Rings */}
          <div className="absolute top-1/2 right-[60px] -translate-y-1/2 w-[480px] h-[480px] opacity-[0.06] flex items-center justify-center">
            <div className="absolute w-full h-full rounded-full border-2 border-[#F0F0F0]" />
            <div className="absolute w-[78%] h-[78%] rounded-full border-2 border-[#F0F0F0]" />
            <div className="absolute w-[56%] h-[56%] rounded-full border-2 border-[#F0F0F0]" />
            <div className="absolute w-[34%] h-[34%] rounded-full border-2 border-[#F0F0F0]" />
            <div className="absolute w-[14%] h-[14%] rounded-full bg-[#F0F0F0]" />
          </div>
        </div>

        <div className="relative z-10 max-w-[860px]">
          <div className="font-headline text-[13px] font-bold uppercase tracking-[0.2em] text-[#E50000] mb-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
            Mobile Ordering Solution
          </div>
          <h1 className="font-headline text-[clamp(52px,8vw,112px)] font-black leading-[0.92] tracking-tighter text-white mb-7 uppercase animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            More Orders.<br /><span className="text-[#E50000]">Zero</span> Friction.
          </h1>
          <p className="text-lg md:text-xl text-[#b0bfcf] max-w-[560px] leading-relaxed mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            Koop puts a mobile ordering experience in every patron's hand — 
            on the course and at the lane. <strong className="text-[#F0F0F0] font-semibold">No POS integration. No hardware. No headaches.</strong>
            You just get more orders.
          </p>
          
          <div className="flex flex-wrap gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            <Link href="/login" className="font-headline text-sm md:text-base font-bold uppercase tracking-widest bg-[#E50000] hover:bg-[#c40000] text-white px-9 py-4 rounded transition-all hover:-translate-y-0.5 shadow-xl">
              Get Started Free
            </Link>
            <a href="#how" className="font-headline text-sm md:text-base font-bold uppercase tracking-widest border-2 border-[#F0F0F0]/30 hover:border-[#F0F0F0] text-[#F0F0F0] hover:text-white px-9 py-4 rounded transition-all hover:-translate-y-0.5 backdrop-blur-sm">
              See How It Works
            </a>
          </div>

          <div className="mt-20 pt-10 border-t border-white/10 flex flex-wrap gap-x-12 gap-y-8 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-500">
            <div className="space-y-1">
              <div className="font-headline text-4xl font-black text-white leading-none">Any<span className="text-[#E50000]"> Phone</span></div>
              <div className="text-[13px] text-[#8a9ab0] uppercase tracking-widest font-medium">No App Download Ever</div>
            </div>
            <div className="space-y-1">
              <div className="font-headline text-4xl font-black text-white leading-none">3<span className="text-[#E50000]">-day</span></div>
              <div className="text-[13px] text-[#8a9ab0] uppercase tracking-widest font-medium">Setup & Launch</div>
            </div>
            <div className="space-y-1">
              <div className="font-headline text-4xl font-black text-white leading-none">0</div>
              <div className="text-[13px] text-[#8a9ab0] uppercase tracking-widest font-medium">POS Integrations Needed</div>
            </div>
            <div className="space-y-1">
              <div className="font-headline text-4xl font-black text-white leading-none">100<span className="text-[#E50000]">%</span></div>
              <div className="text-[13px] text-[#8a9ab0] uppercase tracking-widest font-medium">Revenue Direct to You</div>
            </div>
          </div>
        </div>
      </section>

      {/* VENUE SPLIT SECTION */}
      <section id="venues" className="grid grid-cols-1 lg:grid-cols-2">
        {/* Golf Card */}
        <div className="reveal opacity-0 translate-y-8 transition-all duration-700 ease-out bg-[#213147] px-8 md:px-16 py-24 relative overflow-hidden group border-r border-white/5">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_30%,rgba(229,0,0,0.08),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative z-10">
            <span className="text-6xl mb-6 block drop-shadow-[0_0_20px_rgba(229,0,0,0.3)]">⛳</span>
            <div className="font-headline text-[13px] font-bold uppercase tracking-[0.2em] text-[#E50000] mb-3">Golf Courses</div>
            <h2 className="font-headline text-4xl md:text-5xl font-black uppercase leading-none mb-5 text-white">
              From Tee to Green<br />to Your Register
            </h2>
            <p className="text-[#9db0c5] text-lg leading-relaxed mb-8 max-w-[400px]">
              Patrons scan a QR code from their cart, select their order, and pay right from the fairway. Your beverage cart and clubhouse staff get the order — no radio, no guesswork.
            </p>
            <ul className="space-y-3 mb-10">
              {['On-course ordering from any hole', 'Digital menu with live inventory', 'Dynamic delivery tracking', 'No app download required'].map(item => (
                <li key={item} className="flex items-start gap-3 text-sm font-bold text-[#F0F0F0]">
                  <span className="text-[#E50000] font-headline">→</span> {item}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3">
              <Link href="/sellers/demo-course/order?menuType=Beverage Cart" className="font-headline text-sm font-bold uppercase tracking-widest bg-[#E50000] hover:bg-[#c40000] text-white py-4 rounded text-center transition-colors">
                Public Golf Menu Demo
              </Link>
              <Link href="/sellers/demo-private-course/order?menuType=Clubhouse" className="font-headline text-sm font-bold uppercase tracking-widest border-2 border-white/30 hover:border-white text-[#F0F0F0] py-4 rounded text-center transition-colors">
                Private Golf Menu Demo
              </Link>
            </div>
          </div>
        </div>

        {/* Bowling Center Card */}
        <div className="reveal opacity-0 translate-y-8 transition-all duration-700 delay-100 ease-out bg-[#213147] px-8 md:px-16 py-24 relative overflow-hidden group">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,rgba(229,0,0,0.08),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative z-10">
            <span className="text-6xl mb-6 block drop-shadow-[0_0_20px_rgba(229,0,0,0.3)]">🎳</span>
            <div className="font-headline text-[13px] font-bold uppercase tracking-[0.2em] text-[#E50000] mb-3">Bowling Centers</div>
            <h2 className="font-headline text-4xl md:text-5xl font-black uppercase leading-none mb-5 text-white">
              Order From<br />the Lane
            </h2>
            <p className="text-[#9db0c5] text-lg leading-relaxed mb-8 max-w-[400px]">
              Bowlers scan the QR at their lane, order food and drinks, and keep their game going. Your servers get notified and deliver — no lane visits needed to take the order.
            </p>
            <ul className="space-y-3 mb-10">
              {['Per-lane QR ordering — every lane', 'Food & beverage without play interruption', 'Real-time order fulfillment', 'Reduced server administrative time', 'Works on any mobile browser'].map(item => (
                <li key={item} className="flex items-start gap-3 text-sm font-bold text-[#F0F0F0]">
                  <span className="text-[#E50000] font-headline">→</span> {item}
                </li>
              ))}
            </ul>
            <Link href="/sellers/demo-bowling-alley/order?menuType=Lane Delivery" className="font-headline text-sm font-bold uppercase tracking-widest bg-[#E50000] hover:bg-[#c40000] text-white py-4 rounded text-center transition-colors block">
              Bowling Center Demo
            </Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="px-6 md:px-12 py-24 md:py-32 bg-[#213147]">
        <div className="font-headline text-[13px] font-bold uppercase tracking-[0.2em] text-[#E50000] mb-4">Simple by Design</div>
        <h2 className="font-headline text-4xl md:text-6xl font-black uppercase leading-tight mb-6">Up and Running<br />in Days, Not Months</h2>
        <p className="text-lg text-[#8a9ab0] max-w-[520px] mb-16 leading-relaxed">No POS integration. No IT department. No long contracts. Koop is built to go live fast and stay out of your way.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 relative">
          {/* Connecting Line (Desktop) */}
          <div className="absolute top-9 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-[#E50000] to-transparent hidden lg:block" />
          
          {[
            { n: '01', t: 'We Set You Up', d: 'We build your menu, generate your QR codes, and handle staff training. You\'re ready to go in 72 hours.' },
            { n: '02', nClass: 'delay-100', t: 'Patron Scans & Orders', d: 'A QR code at any location — cart, lane, or station — opens your menu in any mobile browser. No app required.' },
            { n: '03', nClass: 'delay-200', t: 'Staff Gets Notified', d: 'Your team sees the order and delivery location on their device. They fulfill it exactly as they do today.' },
            { n: '04', nClass: 'delay-300', t: 'Revenue Hits Account', d: 'Payments flow directly into your merchant account via Stripe Express. Koop never touches your money.' }
          ].map((step, i) => (
            <div key={step.n} className={cn("reveal opacity-0 translate-y-8 transition-all duration-700 relative z-10", step.nClass)}>
              <div className="w-16 h-16 rounded-full border-2 border-[#E50000] bg-[#213147] flex items-center justify-center font-headline text-2xl font-black text-[#E50000] mb-6">
                {step.n}
              </div>
              <h3 className="font-headline text-xl font-extrabold uppercase text-white mb-3 tracking-tight">{step.t}</h3>
              <p className="text-sm text-[#8a9ab0] leading-relaxed">{step.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHY KOOP */}
      <section id="why" className="px-6 md:px-12 py-24 md:py-32 bg-[#213147]/95">
        <div className="font-headline text-[13px] font-bold uppercase tracking-[0.2em] text-[#E50000] mb-4 text-center md:text-left">Why Koop Works</div>
        <h2 className="font-headline text-4xl md:text-6xl font-black uppercase leading-tight mb-6 text-center md:text-left">Built for the Way<br />Venues Actually Operate</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-16 border border-white/5">
          {[
            { i: '🚫', t: 'No POS Integration', d: 'Koop doesn\'t touch your existing point-of-sale system. Zero IT work, zero configuration risk.' },
            { i: '💳', t: 'Patrons Pay the Fee', d: 'A small convenience fee is charged to the patron at checkout — not to you. Your venue keeps 100%.' },
            { i: '⚡', t: 'Live in 72 Hours', d: 'We handle setup — menus, QR codes, staff walkthrough. Approved and launched in 3 business days.' },
            { i: '📍', t: 'Order From Anywhere', d: 'Every QR code is location-aware. Staff knows exactly where to deliver without explanation.' },
            { i: '📱', t: 'No App to Download', d: 'Patrons scan, order, and pay right in their mobile browser. No friction, higher completion.' },
            { i: '💰', t: 'Money Goes Direct', d: 'Payments flow directly into your existing merchant account via Stripe Express. Koop never holds or routes your funds.' }
          ].map(feature => (
            <div key={feature.t} className="reveal opacity-0 translate-y-8 transition-all duration-700 bg-[#213147] hover:bg-white/5 p-10 border border-white/5 transition-colors group">
              <span className="text-4xl mb-6 block">{feature.i}</span>
              <h3 className="font-headline text-2xl font-extrabold uppercase text-white mb-3 tracking-tight">{feature.t}</h3>
              <p className="text-[15px] text-[#8a9ab0] leading-relaxed mb-4">{feature.d}</p>
              <span className="font-headline text-[13px] font-bold uppercase tracking-widest text-[#E50000] opacity-0 group-hover:opacity-100 transition-opacity">Learn More →</span>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-6 md:px-12 py-24 md:py-32 bg-[#213147]">
        <div className="font-headline text-[13px] font-bold uppercase tracking-[0.2em] text-[#E50000] mb-4">Transparent Pricing</div>
        <h2 className="font-headline text-4xl md:text-6xl font-black uppercase leading-tight mb-16">Simple. Straightforward.</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-6">
            {[
              { n: '01', t: 'Launch Fee', d: 'One-time setup covering menu build, QR code generation, marketing materials, and live staff training.' },
              { n: '02', t: 'Monthly Solution Fee', d: 'A flat monthly subscription for solution access, ongoing support, and updates.' },
              { n: '03', t: 'Patron Convenience Fee', d: 'A small per-order fee paid by the patron at checkout. You never pay a transaction fee.' }
            ].map(item => (
              <div key={item.n} className="reveal opacity-0 translate-y-8 transition-all duration-700 flex items-start gap-6 p-6 bg-white/5 border border-white/10 rounded-lg hover:border-[#E50000]/30 transition-all">
                <div className="font-headline text-2xl font-black text-[#E50000] bg-[#E50000]/10 rounded px-3 py-1 uppercase">{item.n}</div>
                <div>
                  <h4 className="font-headline text-xl font-extrabold uppercase text-white mb-1">{item.t}</h4>
                  <p className="text-sm text-[#8a9ab0] leading-relaxed">{item.d}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="reveal opacity-0 translate-y-8 transition-all duration-700 bg-white/5 border border-white/10 rounded-2xl p-10 lg:p-12 shadow-2xl">
            <h3 className="font-headline text-3xl md:text-4xl font-black uppercase text-white mb-6 leading-tight">
              Your Venue Pays <span className="text-[#E50000]">Zero</span> Per Transaction
            </h3>
            <p className="text-lg text-[#8a9ab0] mb-8 leading-relaxed">Every time a patron orders through Koop, they pay a small convenience fee. You keep 100% of your menu price.</p>
            <ul className="space-y-4">
              {['No additional CC processing fees billed to you', 'No percentage of sales taken by Koop', '100% of F&B revenue goes to you', 'Direct deposit via Stripe Express', 'Simple monthly invoicing'].map(item => (
                <li key={item} className="flex items-center gap-3 text-base font-bold text-[#F0F0F0]">
                  <span className="text-[#E50000] font-black text-xl leading-none">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="px-6 md:px-12 py-32 text-center relative overflow-hidden bg-[#213147]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle,rgba(229,0,0,0.05)_0%,transparent_60%)]" />
        <div className="relative z-10">
          <h2 className="font-headline text-5xl md:text-8xl font-black uppercase mb-6 tracking-tighter leading-none">Ready to Take<br />More Orders?</h2>
          <p className="text-lg md:text-xl text-[#8a9ab0] max-w-[500px] mx-auto mb-12 leading-relaxed">Join golf courses and bowling centers already using Koop to capture more revenue with zero POS headaches.</p>
          <div className="flex wrap justify-center gap-4">
            <a href="mailto:sales@kooporders.com" className="font-headline text-sm md:text-base font-bold uppercase tracking-widest bg-[#E50000] hover:bg-[#c40000] text-white px-12 py-5 rounded transition-all shadow-2xl">
              Request a Demo
            </a>
            <a href="mailto:info@kooporders.com" className="font-headline text-sm md:text-base font-bold uppercase tracking-widest border-2 border-[#F0F0F0]/20 hover:border-[#F0F0F0] text-[#F0F0F0] px-12 py-5 rounded transition-all">
              Talk to Sales
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
