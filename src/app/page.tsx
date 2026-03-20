'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function HomePage() {
  useEffect(() => {
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.15 });

    reveals.forEach(el => observer.observe(el));
    
    return () => {
      reveals.forEach(el => observer.unobserve(el));
    };
  }, []);

  return (
    <div className="homepage-wrapper">
      <style jsx global>{`
        :root {
          --navy: #213147;
          --red: #E50000;
          --offwhite: #F0F0F0;
          --white: #ffffff;
          --navy-dark: #16243a;
          --navy-light: #2c4260;
          --red-dark: #b30000;
          --gray: #8a9ab0;
        }

        .homepage-wrapper {
          font-family: 'Barlow', sans-serif;
          background: var(--navy);
          color: var(--white);
          overflow-x: hidden;
        }

        .hero {
          min-height: 90vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 80px 48px;
          position: relative;
          overflow: hidden;
        }

        .hero-bg {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 60% 80% at 85% 50%, rgba(229,0,0,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 50% 60% at 10% 80%, rgba(44,66,96,0.5) 0%, transparent 60%),
            linear-gradient(160deg, #16243a 0%, #213147 50%, #1a2d44 100%);
        }

        .hero-bullseye {
          position: absolute; right: -80px; top: 50%;
          transform: translateY(-50%);
          width: 700px; height: 700px;
          border-radius: 50%;
          opacity: 0.04;
          background: conic-gradient(from 0deg, #E50000, #213147, #E50000, #213147, #E50000);
          animation: spin 40s linear infinite;
        }

        .hero-rings {
          position: absolute; right: 60px; top: 50%;
          transform: translateY(-50%);
          width: 480px; height: 480px;
          opacity: 0.06;
        }
        .hero-rings .ring {
          position: absolute; border-radius: 50%; border: 2px solid var(--offwhite);
          top: 50%; left: 50%; transform: translate(-50%,-50%);
        }
        .hero-rings .ring:nth-child(1) { width: 100%; height: 100%; }
        .hero-rings .ring:nth-child(2) { width: 78%; height: 78%; }
        .hero-rings .ring:nth-child(3) { width: 56%; height: 56%; }
        .hero-rings .ring:nth-child(4) { width: 34%; height: 34%; }
        .hero-rings .ring:nth-child(5) { width: 14%; height: 14%; background: var(--offwhite); border: none; }

        @keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }

        .hero-inner { position: relative; z-index: 2; max-width: 860px; }

        .hero-eyebrow {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 13px; font-weight: 700; letter-spacing: 0.2em;
          text-transform: uppercase; color: var(--red);
          margin-bottom: 20px;
          animation: fadeUp 0.7s 0.2s forwards;
          opacity: 0;
        }

        .hero h1 {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(62px, 8vw, 112px);
          font-weight: 900; line-height: 0.92;
          letter-spacing: -0.01em;
          text-transform: uppercase;
          color: var(--white);
          margin-bottom: 28px;
          animation: fadeUp 0.7s 0.35s forwards;
          opacity: 0;
        }

        .hero h1 span { color: var(--red); }

        .hero-sub {
          font-size: 19px; font-weight: 400; line-height: 1.6;
          color: #b0bfcf; max-width: 560px;
          margin-bottom: 48px;
          animation: fadeUp 0.7s 0.5s forwards;
          opacity: 0;
        }

        .hero-sub strong { color: var(--offwhite); font-weight: 600; }

        .hero-actions {
          display: flex; gap: 16px; flex-wrap: wrap;
          animation: fadeUp 0.7s 0.65s forwards;
          opacity: 0;
        }

        .btn-primary {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 17px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase;
          background: var(--red); color: var(--white);
          padding: 16px 36px; border-radius: 4px;
          text-decoration: none; border: none; cursor: pointer;
          transition: background 0.2s, transform 0.15s;
          display: inline-block;
        }
        .btn-primary:hover { background: #c40000; transform: translateY(-2px); }

        .btn-secondary {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 17px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase;
          background: transparent; color: var(--offwhite);
          padding: 16px 36px; border-radius: 4px;
          border: 2px solid rgba(240,240,240,0.3);
          text-decoration: none; cursor: pointer;
          transition: border-color 0.2s, color 0.2s, transform 0.15s;
          display: inline-block;
        }
        .btn-secondary:hover { border-color: var(--offwhite); color: var(--white); transform: translateY(-2px); }

        .hero-stats {
          display: flex; gap: 48px; margin-top: 72px;
          padding-top: 40px;
          border-top: 1px solid rgba(255,255,255,0.1);
          animation: fadeUp 0.7s 0.8s forwards;
          opacity: 0;
        }
        .stat-val {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 38px; font-weight: 900; color: var(--white);
          line-height: 1;
        }
        .stat-val span { color: var(--red); }
        .stat-label {
          font-size: 13px; color: var(--gray); margin-top: 4px; font-weight: 500;
          text-transform: uppercase; letter-spacing: 0.08em;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .venue-split {
          display: grid; grid-template-columns: 1fr 1fr;
        }

        .venue-card {
          padding: 80px 60px;
          position: relative; overflow: hidden;
          cursor: default;
        }
        .venue-card.golf { background: #1a2d44; }
        .venue-card.bowling { background: #192840; }

        .venue-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          opacity: 0; transition: opacity 0.4s;
        }
        .venue-card.golf::before  { background: radial-gradient(ellipse at 30% 30%, rgba(229,0,0,0.08), transparent 60%); }
        .venue-card.bowling::before { background: radial-gradient(ellipse at 70% 30%, rgba(229,0,0,0.08), transparent 60%); }
        .venue-card:hover::before { opacity: 1; }

        .venue-icon {
          font-size: 56px; margin-bottom: 24px; display: block;
          filter: drop-shadow(0 0 20px rgba(229,0,0,0.3));
        }

        .venue-label {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 13px; font-weight: 700; letter-spacing: 0.2em;
          text-transform: uppercase; color: var(--red); margin-bottom: 12px;
        }

        .venue-card h2 {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 42px; font-weight: 900; text-transform: uppercase;
          line-height: 1; color: var(--white); margin-bottom: 20px;
        }

        .venue-card p {
          font-size: 16px; line-height: 1.65; color: #9db0c5; margin-bottom: 32px;
          max-width: 400px;
        }

        .venue-features {
          list-style: none; display: flex; flex-direction: column; gap: 12px;
        }
        .venue-features li {
          display: flex; align-items: flex-start; gap: 12px;
          font-size: 15px; color: var(--offwhite); font-weight: 500;
        }
        .venue-features li::before {
          content: '→';
          color: var(--red); font-weight: 700; flex-shrink: 0;
          font-family: 'Barlow Condensed', sans-serif;
        }

        .venue-divider {
          position: absolute; top: 0; bottom: 0; right: 0;
          width: 1px; background: rgba(255,255,255,0.06);
        }

        .section {
          padding: 100px 48px;
        }

        .section-eyebrow {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 13px; font-weight: 700; letter-spacing: 0.2em;
          text-transform: uppercase; color: var(--red); margin-bottom: 16px;
        }

        .section-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(38px, 5vw, 64px); font-weight: 900;
          text-transform: uppercase; line-height: 1;
          color: var(--white); margin-bottom: 16px;
        }

        .section-sub {
          font-size: 17px; line-height: 1.6; color: #8a9ab0;
          max-width: 520px; margin-bottom: 64px;
        }

        .steps {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 0; position: relative;
        }

        .steps::before {
          content: '';
          position: absolute; top: 36px; left: 12%; right: 12%;
          height: 2px; background: linear-gradient(90deg, var(--red), rgba(229,0,0,0.2));
          z-index: 0;
        }

        .step { padding: 0 32px; position: relative; z-index: 1; }

        .step-num {
          width: 72px; height: 72px; border-radius: 50%;
          background: var(--navy-dark);
          border: 2px solid var(--red);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 28px; font-weight: 900; color: var(--red);
          margin-bottom: 24px;
          position: relative;
        }

        .step-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 22px; font-weight: 800; text-transform: uppercase;
          color: var(--white); margin-bottom: 10px;
        }
        .step p { font-size: 14px; line-height: 1.6; color: #8a9ab0; }

        .value-section {
          padding: 100px 48px;
          background: var(--navy-dark);
          position: relative; overflow: hidden;
        }

        .value-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 2px; background: rgba(255,255,255,0.05);
          margin-top: 64px;
        }

        .value-card-box {
          background: var(--navy-dark);
          padding: 48px 40px;
          transition: background 0.3s;
        }
        .value-card-box:hover { background: #1d2f46; }

        .value-icon {
          font-size: 36px; margin-bottom: 20px; display: block;
        }

        .value-card-box h3 {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 24px; font-weight: 800; text-transform: uppercase;
          color: var(--white); margin-bottom: 12px; line-height: 1.1;
        }

        .value-card-box p { font-size: 15px; line-height: 1.65; color: #8a9ab0; }

        .value-card-box .highlight {
          display: inline-block; margin-top: 16px;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 13px; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--red);
        }

        .revenue-section {
          padding: 80px 48px;
          background: var(--red);
          position: relative; overflow: hidden;
        }

        .revenue-inner {
          position: relative; z-index: 1;
          display: flex; align-items: center; justify-content: space-between;
          gap: 40px; flex-wrap: wrap;
        }

        .revenue-text h2 {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(36px, 4vw, 56px); font-weight: 900;
          text-transform: uppercase; line-height: 1;
          color: var(--white); margin-bottom: 12px;
        }

        .revenue-text p {
          font-size: 18px; color: rgba(255,255,255,0.85); max-width: 480px;
          line-height: 1.6;
        }

        .revenue-numbers {
          display: flex; gap: 48px; flex-shrink: 0;
        }

        .rev-stat .rev-val {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 52px; font-weight: 900; color: var(--white); line-height: 1;
        }
        .rev-stat .rev-label {
          font-size: 13px; color: rgba(255,255,255,0.7);
          text-transform: uppercase; letter-spacing: 0.1em;
          font-weight: 600; margin-top: 4px;
        }

        .fee-section {
          padding: 100px 48px;
          background: #1a2d44;
        }

        .fee-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 60px; align-items: start; margin-top: 60px;
        }

        .fee-list {
          display: flex; flex-direction: column; gap: 20px;
        }

        .fee-item {
          display: flex; align-items: flex-start; gap: 20px;
          padding: 24px; background: rgba(255,255,255,0.04);
          border-radius: 6px; border: 1px solid rgba(255,255,255,0.06);
          transition: border-color 0.25s;
        }
        .fee-item:hover { border-color: rgba(229,0,0,0.3); }

        .fee-badge {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 22px; font-weight: 900; color: var(--red);
          background: rgba(229,0,0,0.1); border-radius: 4px;
          padding: 6px 12px; flex-shrink: 0; text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .fee-item h4 {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 20px; font-weight: 800; text-transform: uppercase;
          color: var(--white); margin-bottom: 4px;
        }
        .fee-item p { font-size: 14px; color: #8a9ab0; line-height: 1.5; }

        .fee-callout {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px; padding: 40px;
        }

        .fee-callout h3 {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 34px; font-weight: 900; text-transform: uppercase;
          line-height: 1.05; color: var(--white); margin-bottom: 16px;
        }
        .fee-callout h3 span { color: var(--red); }

        .fee-callout p { font-size: 15px; color: #8a9ab0; line-height: 1.7; margin-bottom: 16px; }

        .checkmarks { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-top: 24px; }
        .checkmarks li {
          display: flex; align-items: center; gap: 10px;
          font-size: 15px; color: var(--offwhite); font-weight: 500;
        }
        .checkmarks li::before {
          content: '✓';
          color: var(--red); font-weight: 700; font-size: 16px;
        }

        .cta-section {
          padding: 120px 48px;
          text-align: center;
          background: var(--navy);
          position: relative; overflow: hidden;
        }

        .cta-section::before {
          content: '';
          position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%);
          width: 800px; height: 800px; border-radius: 50%;
          background: radial-gradient(circle, rgba(229,0,0,0.05) 0%, transparent 60%);
        }

        .cta-section h2 {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(48px, 6vw, 80px); font-weight: 900;
          text-transform: uppercase; line-height: 1;
          color: var(--white); margin-bottom: 20px;
          position: relative;
        }

        .cta-section p {
          font-size: 18px; color: #8a9ab0; max-width: 500px;
          margin: 0 auto 48px; line-height: 1.6; position: relative;
        }

        .cta-actions { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; position: relative; }

        .reveal {
          opacity: 0; transform: translateY(30px);
          transition: opacity 0.65s ease, transform 0.65s ease;
        }
        .reveal.visible { opacity: 1; transform: translateY(0); }

        @media (max-width: 900px) {
          .hero { padding: 80px 24px 60px; }
          .hero-stats { gap: 28px; flex-wrap: wrap; }
          .venue-split { grid-template-columns: 1fr; }
          .venue-divider { display: none; }
          .steps { grid-template-columns: 1fr 1fr; gap: 40px; }
          .steps::before { display: none; }
          .value-grid { grid-template-columns: 1fr; }
          .section { padding: 60px 24px; }
          .value-section { padding: 60px 24px; }
          .fee-grid { grid-template-columns: 1fr; }
          .revenue-inner { flex-direction: column; }
          .revenue-numbers { gap: 28px; }
          .cta-section { padding: 80px 24px; }
        }
      `}</style>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg"></div>
        <div className="hero-bullseye"></div>
        <div className="hero-rings">
          <div className="ring"></div><div className="ring"></div><div className="ring"></div>
          <div className="ring"></div><div className="ring"></div>
        </div>

        <div className="hero-inner">
          <div className="hero-eyebrow">Mobile Ordering Platform</div>
          <h1>More Orders.<br /><span>Zero</span> Friction.</h1>
          <p className="hero-sub">
            Koop puts a mobile ordering experience in every patron's hand — 
            on the course, at the lane, poolside. <strong>No POS integration. No hardware. No headaches.</strong>
            You just get more orders.
          </p>
          <div className="hero-actions">
            <Link href="/login" className="btn-primary">Get Started Free</Link>
            <a href="#how" className="btn-secondary">See How It Works</a>
          </div>

          <div className="hero-stats">
            <div className="stat">
              <div className="stat-val">Any<span> Phone</span></div>
              <div className="stat-label">No App Download Ever</div>
            </div>
            <div className="stat">
              <div className="stat-val">2<span>-day</span></div>
              <div className="stat-label">Setup & Launch</div>
            </div>
            <div className="stat">
              <div className="stat-val">0</div>
              <div className="stat-label">POS Integrations Needed</div>
            </div>
            <div className="stat">
              <div className="stat-val">100<span>%</span></div>
              <div className="stat-label">Revenue Direct to You</div>
            </div>
          </div>
        </div>
      </section>

      {/* VENUE SPLIT */}
      <section id="venues" className="venue-split">
        <div className="venue-card golf reveal">
          <div className="venue-divider"></div>
          <span className="venue-icon">⛳</span>
          <div className="venue-label">Golf Courses</div>
          <h2>From Tee to Green<br />to Your Register</h2>
          <p>Patrons scan a QR code from their cart, select their order, and pay right from the fairway. Your beverage cart and clubhouse staff get the order — no radio, no guesswork.</p>
          <ul className="venue-features">
            <li>On-course ordering from any hole — cart or on-foot</li>
            <li>Poolside ordering delivered to the chair</li>
            <li>Clubhouse take-out for quick pickups</li>
            <li>Dynamic delivery location tracking</li>
            <li>Works on any phone — no app download</li>
          </ul>
        </div>
        <div className="venue-card bowling reveal">
          <span className="venue-icon">🎳</span>
          <div className="venue-label">Bowling Alleys</div>
          <h2>Order From<br />the Lane</h2>
          <p>Bowlers scan the QR at their lane, order food and drinks, and keep their game going. Your servers get notified and deliver — no lane visits needed to take the order.</p>
          <ul className="venue-features">
            <li>Per-lane QR ordering — every lane, every time</li>
            <li>Food & beverage delivered without interrupting play</li>
            <li>Take-out ordering for walk-in customers</li>
            <li>Keeps servers focused on delivery, not order-taking</li>
            <li>Works on any phone — no app download</li>
          </ul>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="section">
        <div className="section-eyebrow">Simple by Design</div>
        <h2 className="section-title">Up and Running<br />in Days, Not Months</h2>
        <p className="section-sub">No POS integration. No IT department. No long contracts. Koop is built to go live fast and stay out of your way.</p>

        <div className="steps">
          <div className="step reveal">
            <div className="step-num">01</div>
            <div className="step-title">We Set You Up</div>
            <p>We build your menu, generate your QR codes, and handle staff training. You're ready to go in 48 hours.</p>
          </div>
          <div className="step reveal">
            <div className="step-num">02</div>
            <div className="step-title">Patron Scans & Orders</div>
            <p>A QR code at any location — cart, lane, chair — opens your menu in any mobile browser. No app required.</p>
          </div>
          <div className="step reveal">
            <div className="step-num">03</div>
            <div className="step-title">Staff Gets Notified</div>
            <p>Your team sees the order and delivery location on their device. They fulfill it exactly as they do today.</p>
          </div>
          <div className="step reveal">
            <div className="step-num">04</div>
            <div className="step-title">Revenue Hits Your Account</div>
            <p>Payments go directly to your merchant account via Authorize.net. Koop never touches your money.</p>
          </div>
        </div>
      </section>

      {/* VALUE PROPS */}
      <section id="why" className="value-section">
        <div className="section-eyebrow">Why Koop Works</div>
        <h2 className="section-title">Built for the Way<br />Venues Actually Operate</h2>
        <p className="section-sub">We didn't try to reinvent your operation. We just made it easier to capture every order you're already missing.</p>

        <div className="value-grid">
          <div className="value-card-box reveal">
            <span className="value-icon">🚫</span>
            <h3>No POS Integration</h3>
            <p>Koop doesn't touch your existing point-of-sale system. Zero IT work, zero configuration, zero risk of breaking what already works. Your staff fulfills orders the same way they always have.</p>
            <span className="highlight">Works alongside any POS →</span>
          </div>
          <div className="value-card-box reveal">
            <span className="value-icon">💳</span>
            <h3>Patrons Pay the Fee</h3>
            <p>A small convenience fee is charged to the patron at checkout — not to you. Your venue keeps 100% of every order. No per-transaction cost eating into your margins.</p>
            <span className="highlight">Zero cost per order to you →</span>
          </div>
          <div className="value-card-box reveal">
            <span className="value-icon">⚡</span>
            <h3>Live in 48 Hours</h3>
            <p>We handle the setup — menus, QR codes, staff walkthrough. You approve. We launch. Most venues are taking live orders within two business days of signing up.</p>
            <span className="highlight">Fast onboarding, real support →</span>
          </div>
          <div className="value-card-box reveal">
            <span className="value-icon">📍</span>
            <h3>Order From Anywhere</h3>
            <p>Every QR code is location-aware. Whether it's hole 7, lane 14, or pool chair B-12 — your staff knows exactly where to deliver without the patron having to explain.</p>
            <span className="highlight">Precise delivery every time →</span>
          </div>
          <div className="value-card-box reveal">
            <span className="value-icon">📱</span>
            <h3>No App to Download</h3>
            <p>Patrons scan, order, and pay right in their mobile browser. No friction, no drop-off, no app store — which means more orders actually get completed.</p>
            <span className="highlight">Higher completion rates →</span>
          </div>
          <div className="value-card-box reveal">
            <span className="value-icon">💰</span>
            <h3>Money Goes Direct to You</h3>
            <p>Payments flow directly into your existing merchant account through Authorize.net. Koop never holds or routes your funds. You're always in control.</p>
            <span className="highlight">Direct to your account →</span>
          </div>
        </div>
      </section>

      {/* REVENUE CALLOUT */}
      <section className="revenue-section">
        <div className="revenue-inner">
          <div className="revenue-text">
            <h2>Capture the Revenue<br />You're Already Leaving on the Course</h2>
            <p>Golfers don't flag down the cart when they can't see it. Bowlers don't walk to the bar when they're mid-game. Koop captures those missed orders — turning passive patrons into active buyers.</p>
          </div>
          <div className="revenue-numbers">
            <div className="rev-stat">
              <div className="rev-val">+23%</div>
              <div className="rev-label">Avg. Beverage Cart Lift</div>
            </div>
            <div className="rev-stat">
              <div className="rev-val">3–5×</div>
              <div className="rev-label">More Orders Per Round</div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING / FEES */}
      <section id="pricing" className="fee-section">
        <div className="section-eyebrow">Transparent Pricing</div>
        <h2 className="section-title">Simple. Straightforward.<br />No Surprises.</h2>

        <div className="fee-grid">
          <div className="fee-list">
            <div className="fee-item reveal">
              <div className="fee-badge">01</div>
              <div>
                <h4>Launch Fee</h4>
                <p>One-time setup covering menu build, QR code generation, marketing materials, and live staff training. We do the work — you get ready.</p>
              </div>
            </div>
            <div className="fee-item reveal">
              <div className="fee-badge">02</div>
              <div>
                <h4>Monthly Platform Fee</h4>
                <p>A flat monthly subscription for platform access, ongoing support, and updates. Priced by venue type — golf, bowling, and more.</p>
              </div>
            </div>
            <div className="fee-item reveal">
              <div className="fee-badge">03</div>
              <div>
                <h4>Patron Convenience Fee</h4>
                <p>A small per-order fee paid by the patron at checkout. Your venue collects it, remits to Koop monthly. You never pay a transaction fee.</p>
              </div>
            </div>
          </div>

          <div className="fee-callout reveal">
            <h3>Your Venue Pays <span>Zero</span> Per Transaction</h3>
            <p>Every time a patron orders through Koop, they pay a small convenience fee. You collect it. You pass it along to us at month's end. Simple.</p>
            <p>That means your beverage revenue, F&B revenue, and take-out revenue grow — with no percentage cut going to us on every ticket.</p>
            <ul className="checkmarks">
              <li>No credit card processing fees billed to the venue</li>
              <li>No percentage of sales taken by Koop</li>
              <li>100% of food & beverage revenue goes to you</li>
              <li>Direct deposit via your Authorize.net merchant account</li>
              <li>Monthly invoicing — no surprises</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="cta-section">
        <h2>Ready to Take More Orders?</h2>
        <p>Join golf courses and bowling alleys already using Koop to capture more revenue with zero POS headaches.</p>
        <div className="cta-actions">
          <a href="mailto:sales@kooporders.com" className="btn-primary">Request a Demo</a>
          <a href="mailto:info@kooporders.com" className="btn-secondary">Talk to Sales</a>
        </div>
      </section>
    </div>
  );
}
