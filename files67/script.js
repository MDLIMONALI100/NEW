// ============================================
// LOADER
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'none';
  revealSections();
});

// ============================================
// SCROLL REVEAL (sections) + triggers stats/bars
// ============================================
function revealSections() {
  const sections = document.querySelectorAll('header, section, footer');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal');
        entry.target.addEventListener('transitionend', () => {
          entry.target.style.willChange = 'auto';
        }, { once: true });

        if (entry.target.id === 'about') animateStats();
        if (entry.target.id === 'skills') animateBars();

        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -12% 0px' });

  sections.forEach((section) => observer.observe(section));
}

// ============================================
// ANIMATED STAT COUNTERS
// ============================================
function animateStats() {
  const nums = document.querySelectorAll('.stat-number');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  nums.forEach((el) => {
    const target = parseInt(el.dataset.target, 10);
    const suffix = el.dataset.suffix || '';

    if (prefersReducedMotion) {
      el.textContent = target + suffix;
      return;
    }

    const duration = 1200;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const value = Math.round(target * eased);
      el.textContent = value + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

// ============================================
// SKILL BARS
// ============================================
function animateBars() {
  document.querySelectorAll('.skill-list .bar').forEach((bar, i) => {
    setTimeout(() => bar.classList.add('filled'), i * 60);
  });
}

// ============================================
// CONTACT FORM
// ============================================
const form = document.getElementById('contact-form');
const formMessage = document.getElementById('form-message');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        formMessage.textContent = 'Message sent — thanks! I\'ll get back to you soon.';
        formMessage.className = 'success';
        form.reset();
        setTimeout(() => { formMessage.className = ''; }, 4000);
      } else {
        formMessage.textContent = 'Something went wrong. Please try again.';
        formMessage.className = 'error';
      }
    } catch (err) {
      formMessage.textContent = 'Network error. Please try again.';
      formMessage.className = 'error';
    }
  });
}
