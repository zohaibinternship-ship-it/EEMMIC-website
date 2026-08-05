/* Page loader, filter chips, search, contact/newsletter forms, footer year */
(function () {
  /* Lazily creates a .form-error message node right before the submit button */
  function getOrCreateErrorBox(form) {
    let box = form.querySelector('.form-error');
    if (!box) {
      box = document.createElement('p');
      box.className = 'form-error';
      box.style.display = 'none';
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.insertAdjacentElement('beforebegin', box);
    }
    return box;
  }

  /* Page loader */
  window.addEventListener('load', function () {
    const loader = document.getElementById('pageLoader');
    if (loader) {
      setTimeout(function () { loader.classList.add('hidden'); }, 350);
    }
  });

  document.addEventListener('DOMContentLoaded', function () {

    /* Footer year */
    document.querySelectorAll('.current-year').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });

    /* Generic filter-chip behaviour: filters elements with [data-category] by chip [data-filter] */
    document.querySelectorAll('[data-filter-group]').forEach(function (group) {
      const chips = group.querySelectorAll('.filter-chip');
      const grid = document.querySelector(group.getAttribute('data-filter-group'));
      if (!grid) return;
      const items = grid.querySelectorAll('[data-category]');

      chips.forEach(function (chip) {
        chip.addEventListener('click', function () {
          chips.forEach(function (c) { c.classList.remove('active'); });
          chip.classList.add('active');
          const filter = chip.getAttribute('data-filter');
          items.forEach(function (item) {
            const cats = (item.getAttribute('data-category') || '').split(' ');
            item.style.display = (filter === 'all' || cats.indexOf(filter) !== -1) ? '' : 'none';
          });
        });
      });
    });

    /* Contact form — submits to the backend at /api/submissions */
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
      contactForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const errorBox = getOrCreateErrorBox(contactForm);
        errorBox.style.display = 'none';

        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalBtnHtml = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Sending…';

        const payload = {
          sector: 'EEMMIC',
          service: document.getElementById('service').value,
          name: document.getElementById('name').value.trim(),
          email: document.getElementById('email').value.trim(),
          phone: document.getElementById('phone').value.trim(),
          organisation: document.getElementById('organisation').value.trim(),
          message: document.getElementById('message').value.trim()
        };

        fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
          .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
          .then(function (result) {
            if (!result.ok) throw new Error(result.data.error || 'Submission failed.');
            const successBox = document.getElementById('formSuccess');
            if (successBox) {
              successBox.classList.add('show');
              successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            contactForm.reset();
          })
          .catch(function (err) {
            errorBox.textContent = err.message || 'Something went wrong sending your message. Please try again.';
            errorBox.style.display = 'block';
            console.error('Contact form submission failed:', err);
          })
          .finally(function () {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
          });
      });
    }

    /* Stage-specific requirement forms (evaluation.html, management.html,
       marketplace.html, investment.html) — same /api/submissions endpoint as
       the contact form, but the service is fixed per page via [data-service]
       on the <form> instead of a dropdown, and fields are matched by [name]
       so this works across pages without per-page IDs or JS. */
    document.querySelectorAll('form[data-service]').forEach(function (form) {
      const card = form.closest('.form-card');
      const sentPanel = card ? card.querySelector('.form-sent') : null;

      function field(name) {
        const el = form.querySelector('[name="' + name + '"]');
        return el ? el.value.trim() : '';
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();

        const errorBox = getOrCreateErrorBox(form);
        errorBox.style.display = 'none';

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnHtml = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Sending…';

        const payload = {
          sector: 'EEMMIC',
          service: form.getAttribute('data-service'),
          name: field('name'),
          email: field('email'),
          phone: field('phone'),
          organisation: field('organisation'),
          detail: field('detail'),
          message: field('message')
        };

        fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
          .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
          .then(function (result) {
            if (!result.ok) throw new Error(result.data.error || 'Submission failed.');
            if (sentPanel) {
              const refEl = sentPanel.querySelector('[data-ref]');
              if (refEl) refEl.textContent = result.data.id ? result.data.id.slice(0, 8).toUpperCase() : '—';
              form.hidden = true;
              sentPanel.classList.add('show');
              sentPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          })
          .catch(function (err) {
            errorBox.textContent = err.message || 'Something went wrong sending your message. Please try again.';
            errorBox.style.display = 'block';
            console.error('Stage form submission failed:', err);
          })
          .finally(function () {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
          });
      });
    });

    /* Newsletter form — submits to the backend at /api/newsletter */
    document.querySelectorAll('.newsletter-form').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const input = form.querySelector('input');
        const btn = form.querySelector('button');
        const email = input && input.value.trim();
        if (!email) return;

        btn.disabled = true;
        const original = btn.innerHTML;

        fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email })
        })
          .then(function (res) {
            if (!res.ok) throw new Error('Subscription failed.');
            btn.innerHTML = '&#10003;';
            input.value = '';
          })
          .catch(function (err) {
            btn.innerHTML = '&#10005;';
            console.error('Newsletter signup failed:', err);
          })
          .finally(function () {
            setTimeout(function () {
              btn.innerHTML = original;
              btn.disabled = false;
            }, 2200);
          });
      });
    });
  });
})();
