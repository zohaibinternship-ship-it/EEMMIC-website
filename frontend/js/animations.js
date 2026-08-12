/* Scroll reveal, animated counters, button ripple, 3D card tilt, floating energy particles */
(function () {
  document.addEventListener('DOMContentLoaded', function () {

    /* Auto-stagger direct children of [data-reveal-batch] containers —
       tags each child .reveal and assigns an index-based transition-delay,
       so grids of any size cascade in without hand-placed delay-N classes. */
    document.querySelectorAll('[data-reveal-batch]').forEach(function (batch) {
      const step = parseFloat(batch.getAttribute('data-reveal-step')) || 0.08;
      const maxDelay = 0.56;
      Array.prototype.forEach.call(batch.children, function (child, index) {
        child.classList.add('reveal');
        child.style.transitionDelay = Math.min(index * step, maxDelay) + 's';
      });
    });

    /* Scroll reveal via IntersectionObserver */
    const revealEls = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && revealEls.length) {
      const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
      revealEls.forEach(function (el) { observer.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add('in-view'); });
    }

    /* Animated number counters */
    function animateCounter(el) {
      const target = parseFloat(el.getAttribute('data-count'));
      const decimals = el.getAttribute('data-decimals') ? parseInt(el.getAttribute('data-decimals'), 10) : 0;
      const duration = 1600;
      const startTime = performance.now();

      function tick(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = target * eased;
        el.textContent = decimals ? value.toFixed(decimals) : Math.floor(value).toLocaleString();
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          el.textContent = decimals ? target.toFixed(decimals) : target.toLocaleString();
          el.classList.add('counted');
        }
      }
      requestAnimationFrame(tick);
    }

    const counters = document.querySelectorAll('[data-count]');
    if (counters.length) {
      if ('IntersectionObserver' in window) {
        const counterObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animateCounter(entry.target);
              counterObserver.unobserve(entry.target);
            }
          });
        }, { threshold: 0.5 });
        counters.forEach(function (el) { counterObserver.observe(el); });
      } else {
        counters.forEach(animateCounter);
      }
    }

    /* Ripple effect on buttons */
    document.querySelectorAll('.btn, .filter-chip').forEach(function (btn) {
      btn.style.position = btn.style.position || 'relative';
      btn.style.overflow = 'hidden';
      btn.addEventListener('click', function (e) {
        const rect = btn.getBoundingClientRect();
        const ripple = document.createElement('span');
        const size = Math.max(rect.width, rect.height);
        ripple.className = 'ripple';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        btn.appendChild(ripple);
        setTimeout(function () { ripple.remove(); }, 650);
      });
    });

    /* Subtle 3D tilt on solution / project cards */
    const tiltTargets = document.querySelectorAll('.solution-card, .project-card');
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      tiltTargets.forEach(function (card) {
        card.addEventListener('mousemove', function (e) {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const rotateX = ((y / rect.height) - 0.5) * -8;
          const rotateY = ((x / rect.width) - 0.5) * 8;
          card.style.transform = 'perspective(900px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-6px)';
        });
        card.addEventListener('mouseleave', function () { card.style.transform = ''; });
      });
    }

    /* Site-wide background video — plays normally and loops, like every
       other video on the site. (Previously this paused the video and set
       .currentTime on every scroll frame to "scrub" it — scripted seeking
       forces the browser to decode from the last keyframe on every single
       seek, which is both slow, hence the stutter, and often renders a
       soft/blocky intermediate frame instead of a fully-decoded one, hence
       the perceived quality drop. Normal playback avoids both.) */
    const siteVideo = document.querySelector('.site-video-bg video');
    if (siteVideo && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      siteVideo.loop = true;
      const playPromise = siteVideo.play();
      if (playPromise && playPromise.catch) playPromise.catch(function () {});
    }

    /* Floating energy particles inside the hero background */
    const particleField = document.querySelector('.energy-particles');
    if (particleField) {
      const count = window.innerWidth < 640 ? 14 : 28;
      for (let i = 0; i < count; i++) {
        const p = document.createElement('span');
        p.className = 'particle';
        const size = 3 + Math.random() * 5;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.left = Math.random() * 100 + '%';
        p.style.bottom = -20 - Math.random() * 40 + 'px';
        p.style.setProperty('--drift', (Math.random() * 80 - 40) + 'px');
        p.style.animationDuration = (8 + Math.random() * 10) + 's';
        p.style.animationDelay = (Math.random() * 10) + 's';
        particleField.appendChild(p);
      }
    }
  });
})();
