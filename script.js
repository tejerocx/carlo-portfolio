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

  if (window.scrollY > 50) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
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
