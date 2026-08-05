/* Sticky navbar, mobile hamburger menu, active link highlighting, anchor scroll, back-to-top */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    const links = document.querySelectorAll('.nav-link');

    /* Sticky / blurred navbar on scroll */
    function handleScroll() {
      if (!navbar) return;
      navbar.classList.toggle('scrolled', window.scrollY > 24);
    }
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    /* Mobile menu toggle */
    if (hamburger && navLinks) {
      hamburger.addEventListener('click', function () {
        const isOpen = navLinks.classList.toggle('mobile-open');
        hamburger.classList.toggle('active', isOpen);
        document.body.classList.toggle('no-scroll', isOpen);
      });

      navLinks.querySelectorAll('.nav-link, .dropdown-link').forEach(function (link) {
        link.addEventListener('click', function () {
          navLinks.classList.remove('mobile-open');
          hamburger.classList.remove('active');
          document.body.classList.remove('no-scroll');
        });
      });
    }

    /* EMMIC dropdown: hover opens it on desktop (pure CSS); this click-toggle
       covers touch/mobile and keyboard use, where :hover doesn't apply. */
    document.querySelectorAll('.nav-item.has-dropdown').forEach(function (item) {
      const caretBtn = item.querySelector('.dropdown-caret-btn');
      if (!caretBtn) return;
      caretBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const isOpen = item.classList.toggle('open');
        caretBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    });
    document.addEventListener('click', function (e) {
      document.querySelectorAll('.nav-item.has-dropdown.open').forEach(function (item) {
        if (!item.contains(e.target)) {
          item.classList.remove('open');
          const caretBtn = item.querySelector('.dropdown-caret-btn');
          if (caretBtn) caretBtn.setAttribute('aria-expanded', 'false');
        }
      });
    });

    /* Active link based on current page */
    const currentPage = (location.pathname.split('/').pop() || 'index.html');
    const emmicPages = ['evaluation.html', 'management.html', 'marketplace.html', 'investment.html'];
    links.forEach(function (link) {
      const href = link.getAttribute('href');
      if (href === currentPage || (currentPage === '' && href === 'index.html')) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
    document.querySelectorAll('.dropdown-link').forEach(function (link) {
      if (link.getAttribute('href') === currentPage) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
    if (emmicPages.indexOf(currentPage) !== -1) {
      const emmicLink = document.querySelector('.nav-item.has-dropdown .nav-link');
      if (emmicLink) emmicLink.classList.add('active');
    }

    /* In-page anchor scroll with header offset — native smooth behavior */
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId.length < 2) return;
        const target = document.querySelector(targetId);
        if (!target) return;
        e.preventDefault();
        const headerOffset = 90;
        const top = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
        window.scrollTo({ top: top, behavior: 'smooth' });
      });
    });

    /* Back to top button */
    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
      window.addEventListener('scroll', function () {
        backToTop.classList.toggle('show', window.scrollY > 500);
      }, { passive: true });

      backToTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  });
})();
