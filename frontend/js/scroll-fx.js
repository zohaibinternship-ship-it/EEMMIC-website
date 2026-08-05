/* GSAP-driven scroll choreography — hero parallax, section depth drift,
   and magnetic buttons. Additive layer on top of the existing CSS/IO
   animation system; no-ops silently if GSAP hasn't loaded. */
(function () {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  document.addEventListener('DOMContentLoaded', function () {

    /* Hero / page-hero background layers drift at different speeds on scroll.
       The background video itself is handled separately in animations.js —
       it's a single fixed layer shared by the whole site, not scoped to the hero. */
    const heroSection = document.querySelector('.hero, .page-hero');
    if (heroSection) {
      const orbs = heroSection.querySelectorAll('.hero-orb');
      if (orbs.length) {
        orbs.forEach(function (orb, i) {
          gsap.to(orb, {
            yPercent: 18 + i * 14,
            ease: 'none',
            scrollTrigger: { trigger: heroSection, start: 'top top', end: 'bottom top', scrub: 0.6 }
          });
        });
      }
      const gridLines = heroSection.querySelector('.hero-grid-lines');
      if (gridLines) {
        gsap.to(gridLines, {
          yPercent: 28,
          ease: 'none',
          scrollTrigger: { trigger: heroSection, start: 'top top', end: 'bottom top', scrub: 0.6 }
        });
      }
    }

    /* Subtle depth drift on decorative mesh backgrounds throughout the page */
    document.querySelectorAll('.mesh-bg').forEach(function (mesh) {
      gsap.fromTo(mesh, { yPercent: -6 }, {
        yPercent: 6,
        ease: 'none',
        scrollTrigger: { trigger: mesh.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.8 }
      });
    });

    /* Magnetic pull on primary buttons — nudges toward the cursor, springs back on leave */
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      document.querySelectorAll('.btn-primary, .btn-glow').forEach(function (btn) {
        const xTo = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3' });
        const yTo = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3' });
        btn.addEventListener('mousemove', function (e) {
          const rect = btn.getBoundingClientRect();
          xTo((e.clientX - rect.left - rect.width / 2) * 0.3);
          yTo((e.clientY - rect.top - rect.height / 2) * 0.3);
        });
        btn.addEventListener('mouseleave', function () { xTo(0); yTo(0); });
      });
    }
  });
})();
