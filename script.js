/*
  =====================================================
  CARLO TEJEROS — PORTFOLIO JAVASCRIPT
  =====================================================

  LEARNING NOTES:
  ---------------
  This file handles ALL interactivity on the portfolio:

  1. THEME TOGGLE    → Switch between light and dark mode
  2. NAV SCROLL      → Make navbar solid when scrolling down
  3. MOBILE MENU     → Toggle hamburger menu on/off
  4. SCROLL REVEAL   → Animate elements when they scroll into view
  5. SMOOTH SCROLL   → Close mobile menu when clicking a nav link

  KEY CONCEPTS:
  - localStorage    → Save data in the browser (persists after refresh!)
  - Intersection Observer → Efficiently detect when elements are visible
  - Event listeners → React to user actions (click, scroll, etc.)
  - classList       → Add/remove CSS classes on elements
  =====================================================
*/


// =============================================
// HELPER: Quick element selector
// =============================================
/*
  LEARNING NOTE:
  Instead of typing document.getElementById('nav') every time,
  we create a short helper function called $(id).
  This is a common pattern in vanilla JS projects.
*/
const $ = id => document.getElementById(id);

// Always start at the top on page load / hard refresh
if (history.scrollRestoration) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);


// =============================================
// 1. THEME TOGGLE (Light / Dark Mode)
// =============================================
/*
  LEARNING NOTE: How theme switching works

  Step 1: Check localStorage for saved preference
  Step 2: Apply the saved theme (or default to dark)
  Step 3: When user clicks toggle, flip the theme
  Step 4: Save the new preference to localStorage

  localStorage is a browser storage that PERSISTS even after
  closing the browser. Perfect for remembering user preferences.

  We use data-theme attribute on <body> to control CSS variables.
  CSS reads it: [data-theme="dark"] { --bg: #0c0c10; }
*/

function toggleTheme() {
  // Get current theme from <body data-theme="...">
  const current = document.body.getAttribute('data-theme');

  // Flip it: if dark → light, if light → dark
  const next = current === 'dark' ? 'light' : 'dark';

  // Apply the new theme
  document.body.setAttribute('data-theme', next);

  // Save to localStorage so it persists across page reloads
  localStorage.setItem('portfolio_theme', next);

  // Update the button icon
  updateThemeIcon();
}

function updateThemeIcon() {
  const btn = $('themeBtn');
  if (!btn) return;

  const isDark = document.body.getAttribute('data-theme') === 'dark';

  // ☾ (moon) for dark mode, ☀ (sun) for light mode
  // Shows what the CURRENT theme is (not what it will switch to)
  btn.querySelector('.theme-icon').innerHTML = isDark ? '&#9790;' : '&#9728;';
}

// On page load: apply saved theme preference
(function initTheme() {
  /*
    LEARNING NOTE: IIFE (Immediately Invoked Function Expression)
    The (function() { ... })() pattern runs the function RIGHT AWAY
    when the script loads. We use it to apply the theme before
    the user sees anything — no flash of wrong theme.
  */
  const saved = localStorage.getItem('portfolio_theme');
  if (saved) {
    document.body.setAttribute('data-theme', saved);
  }
  // Small delay to ensure DOM is ready
  setTimeout(updateThemeIcon, 0);
})();


// =============================================
// 2. NAVBAR SCROLL EFFECT
// =============================================
/*
  LEARNING NOTE: Scroll listener

  We listen for the 'scroll' event on the window.
  When the user scrolls past 50px, we add the 'scrolled' class
  to the nav, which triggers CSS to make the background solid.

  window.scrollY = how many pixels the page has been scrolled down.
*/

window.addEventListener('scroll', () => {
  const nav = $('nav');
  if (!nav) return;

  // Solid/glass background after scrolling past 50px
  if (window.scrollY > 50) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }

  // ── Scroll progress bar ──
  // Calculates how far down the page you've scrolled (0–100%)
  // and sets the bar width to match.
  const scrollProgress = $('scrollProgress');
  if (scrollProgress) {
    const scrollTop = document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    scrollProgress.style.width = (scrollTop / scrollHeight) * 100 + '%';
  }

  // ── Active nav link tracking ──
  // Finds which section is currently in the viewport
  // and highlights the matching nav link with .active class.
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  const scrollY = window.scrollY + 120;

  sections.forEach(section => {
    const top = section.offsetTop;
    const height = section.offsetHeight;
    const id = section.getAttribute('id');

    if (scrollY >= top && scrollY < top + height) {
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + id) {
          link.classList.add('active');
        }
      });
    }
  });
});


// =============================================
// 3. MOBILE MENU TOGGLE
// =============================================
/*
  LEARNING NOTE: Mobile menu

  On mobile, the nav links are hidden (CSS: opacity:0, pointer-events:none).
  When the hamburger button is clicked:
  1. Toggle 'open' class on nav links (makes them visible)
  2. Toggle 'open' class on burger (animates the X shape)
*/

function toggleMenu() {
  $('navLinks').classList.toggle('open');
  const burger = $('burger');
  burger.classList.toggle('open');
  burger.setAttribute('aria-expanded', burger.classList.contains('open'));
}

// Close mobile menu when a nav link is clicked
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    /*
      LEARNING NOTE: Why close the menu on click?
      After clicking a nav link on mobile, the page scrolls
      to that section. But the menu overlay would still be
      covering the screen. So we close it automatically.
    */
    $('navLinks').classList.remove('open');
    $('burger').classList.remove('open');
  });
});


// =============================================
// 4. SCROLL REVEAL ANIMATION
// =============================================
/*
  LEARNING NOTE: Intersection Observer

  This is the MODERN way to detect when elements are visible on screen.
  It's much better than scroll event listeners because:
  - It's performant (browser optimizes it internally)
  - It doesn't fire constantly while scrolling
  - It only triggers when elements actually enter/exit the viewport

  HOW IT WORKS:
  1. We find all elements with class="reveal"
  2. We create an observer that watches them
  3. When an element enters the viewport, the callback fires
  4. We add class="visible" which triggers the CSS animation
  5. We stop observing that element (it only animates once)

  The CSS for this is in style.css:
  .reveal         { opacity: 0; transform: translateY(30px); }
  .reveal.visible { opacity: 1; transform: translateY(0); }
*/

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Element is now visible → add the animation class
        entry.target.classList.add('visible');

        // Stop watching this element (animate only once)
        observer.unobserve(entry.target);
      }
    });
  },
  {
    /*
      LEARNING NOTE: Observer options

      threshold: 0.1 means "trigger when 10% of the element is visible"
      (0.0 = any pixel, 1.0 = fully visible)

      rootMargin: '0px 0px -50px 0px' means "treat the viewport as
      50px shorter at the bottom". This makes elements animate
      a bit BEFORE they're fully in view, which feels more natural.
    */
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  }
);

// Find ALL elements with class="reveal" and start observing them
document.querySelectorAll('.reveal').forEach(el => {
  observer.observe(el);
});


// =============================================
// 5. CURRENT YEAR IN FOOTER
// =============================================
/*
  LEARNING NOTE: Dynamic year
  We set the year dynamically so it never needs manual updates.
  document.getElementById('year') finds the <span id="year"> in the footer.
*/
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();


// =============================================
// 6. TYPING ANIMATION (Hero Subtitle)
// =============================================
/*
  LEARNING NOTE: Typing effect

  This creates a "typewriter" animation that cycles through
  different role titles in the hero section.

  HOW IT WORKS:
  1. We have an array of role strings to cycle through
  2. Characters are added one-by-one (typing phase)
  3. After a pause, characters are removed one-by-one (deleting phase)
  4. Then the next role starts typing

  The speed variables control how fast each phase runs:
  - typeSpeed: how fast characters appear
  - deleteSpeed: how fast characters are removed (faster feels natural)
  - pauseEnd: how long to show the completed text
  - pauseStart: brief pause before typing the next role
*/

const typingTarget = $('typingTarget');
if (typingTarget) {
  const roles = [
    'Full-Stack Web Developer',
    'SaaS Builder',
    'Booking System Specialist',
    'AI Automation Specialist'
  ];
  let roleIndex = 0;
  let charIndex = roles[0].length; // Start with first role already shown
  let isDeleting = false;
  let speed = 80;

  function type() {
    const currentRole = roles[roleIndex];

    if (isDeleting) {
      // Remove one character at a time
      typingTarget.textContent = currentRole.substring(0, charIndex - 1);
      charIndex--;
      speed = 40;
    } else {
      // Add one character at a time
      typingTarget.textContent = currentRole.substring(0, charIndex + 1);
      charIndex++;
      speed = 80;
    }

    // Finished typing → pause, then start deleting
    if (!isDeleting && charIndex === currentRole.length) {
      speed = 2000;
      isDeleting = true;
    }
    // Finished deleting → move to next role, pause briefly
    else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
      speed = 400;
    }

    setTimeout(type, speed);
  }

  // Start the animation after a 2-second delay
  // (let the page load and user see the first role first)
  setTimeout(type, 2000);
}


// =============================================
// 7. ANIMATED STAT COUNTERS
// =============================================
/*
  LEARNING NOTE: Counter animation with Intersection Observer

  Instead of showing static numbers, the stats count UP from 0
  when they scroll into view. This draws the eye and feels dynamic.

  HOW IT WORKS:
  1. Each .stat-num has data-target="4" (the final number)
     and data-suffix="+" (text after the number, like "4+")
  2. An IntersectionObserver watches for when they become visible
  3. When visible, we run a timer that increments from 0 to target
  4. We unobserve after animating (only animate once)

  The math: if target=4 and duration=1500ms with 50ms intervals,
  that's 30 steps, so increment = 4/30 ≈ 0.13 per step.
*/

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-target'));
        const suffix = el.getAttribute('data-suffix') || '';
        let current = 0;
        const duration = 1500;
        const steps = duration / 50;
        const increment = target / steps;

        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            current = target;
            clearInterval(timer);
          }
          el.textContent = Math.floor(current) + suffix;
        }, 50);

        counterObserver.unobserve(el);
      }
    });
  },
  { threshold: 0.5 }
);

document.querySelectorAll('.stat-num[data-target]').forEach(el => {
  counterObserver.observe(el);
});


/*
  =====================================================
  THAT'S IT! 🎉

  This entire portfolio is ~150 lines of JavaScript.
  No frameworks, no build tools, no npm install.
  Just clean, readable vanilla JS.

  KEY TAKEAWAYS:
  1. localStorage for persisting user preferences
  2. Intersection Observer for scroll-triggered animations
  3. classList.toggle() for showing/hiding elements
  4. Event listeners for reacting to user actions
  5. CSS does most of the heavy lifting (transitions, layout)

  NEXT STEPS TO LEARN:
  - Try adding a contact form (use Formspree or EmailJS)
  - Add project screenshots/images
  - Try adding a typing animation to the hero title
  - Deploy to Vercel and get a custom domain!
  =====================================================
*/
