/**
 * Big Test Site JavaScript - ES6 Module
 * A collection of nonsensical but valid JavaScript functions for testing
 */

// Global configuration object
export const SiteConfig = {
  version: "1.0.0",
  environment: "test",
  features: {
    animations: true,
    tracking: false,
    debugging: true,
  },
  timing: {
    fadeSpeed: 300,
    slideSpeed: 400,
    pulseInterval: 2000,
  },
};

// Utility functions
export const Utils = {
  /**
   * Generate a random number between min and max
   */
  randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Generate a random color in hex format
   */
  randomColor: function () {
    const colors = ["#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3", "#54a0ff", "#5f27cd"];
    return colors[this.randomBetween(0, colors.length - 1)];
  },

  /**
   * Debounce function to limit function calls
   */
  debounce: function (func, wait, immediate) {
    let timeout;
    return function executedFunction() {
      const context = this;
      const args = arguments;
      const later = function () {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  },

  /**
   * Throttle function to limit function calls
   */
  throttle: function (func, limit) {
    let inThrottle;
    return function () {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  /**
   * Check if element is in viewport
   */
  isInViewport: function (element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  /**
   * Animate element with CSS classes
   */
  animateElement: function (element, animationClass, duration = 1000) {
    element.classList.add(animationClass);
    setTimeout(() => {
      element.classList.remove(animationClass);
    }, duration);
  },
};

// Mobile menu functionality
const MobileMenu = {
  init: function () {
    const toggle = document.querySelector(".mobile-menu-toggle");
    const menu = document.querySelector(".nav-menu");

    if (toggle && menu) {
      toggle.addEventListener("click", this.toggleMenu.bind(this));
      document.addEventListener("click", this.closeMenuOnOutsideClick.bind(this));
    }
  },

  toggleMenu: function (event) {
    event.stopPropagation();
    const menu = document.querySelector(".nav-menu");
    const toggle = event.currentTarget;

    menu.classList.toggle("mobile-menu-open");
    toggle.classList.toggle("menu-open");

    // Animate toggle bars
    const bars = toggle.querySelectorAll("span");
    bars.forEach((bar, index) => {
      bar.style.transform = menu.classList.contains("mobile-menu-open")
        ? `rotate(${45 * (index % 2 === 0 ? 1 : -1)}deg)`
        : "rotate(0deg)";
    });
  },

  closeMenuOnOutsideClick: function (event) {
    const menu = document.querySelector(".nav-menu");
    const toggle = document.querySelector(".mobile-menu-toggle");

    if (menu && toggle && !menu.contains(event.target) && !toggle.contains(event.target)) {
      menu.classList.remove("mobile-menu-open");
      toggle.classList.remove("menu-open");
    }
  },
};

// Scroll effects and animations
const ScrollEffects = {
  init: function () {
    this.bindScrollEvents();
    this.initIntersectionObserver();
  },

  bindScrollEvents: function () {
    window.addEventListener("scroll", Utils.throttle(this.handleScroll.bind(this), 16));
  },

  handleScroll: function () {
    const scrollY = window.pageYOffset;
    const header = document.querySelector(".site-header");

    // Add/remove scrolled class to header
    if (header) {
      if (scrollY > 100) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
    }

    // Parallax effect for hero section
    const hero = document.querySelector(".hero-section");
    if (hero && Utils.isInViewport(hero)) {
      const speed = scrollY * 0.5;
      hero.style.transform = `translateY(${speed}px)`;
    }
  },

  initIntersectionObserver: function () {
    const options = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    };

    const observer = new IntersectionObserver(this.handleIntersection.bind(this), options);

    // Observe elements for animation
    const animatableElements = document.querySelectorAll(".feature-card, .post-card, .content-section");
    animatableElements.forEach((el) => observer.observe(el));
  },

  handleIntersection: function (entries) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("fade-in");
        const delay = Utils.randomBetween(0, 300);
        setTimeout(() => {
          Utils.animateElement(entry.target, "slide-in", 600);
        }, delay);
      }
    });
  },
};

// Random background generators
const BackgroundGenerator = {
  init: function () {
    this.createRandomShapes();
    this.initColorCycling();
  },

  createRandomShapes: function () {
    const container = document.body;
    const shapeCount = Utils.randomBetween(5, 10);

    for (let i = 0; i < shapeCount; i++) {
      const shape = document.createElement("div");
      shape.className = "random-shape";
      shape.style.cssText = `
          position: fixed;
          width: ${Utils.randomBetween(50, 200)}px;
          height: ${Utils.randomBetween(50, 200)}px;
          background: ${Utils.randomColor()};
          border-radius: ${Utils.randomBetween(0, 100)}%;
          opacity: 0.1;
          z-index: -1;
          top: ${Utils.randomBetween(0, 100)}%;
          left: ${Utils.randomBetween(0, 100)}%;
          animation: float ${Utils.randomBetween(10, 30)}s infinite linear;
        `;
      container.appendChild(shape);
    }
  },

  initColorCycling: function () {
    const cyclableElements = document.querySelectorAll(".btn-primary, .feature-card::before");

    setInterval(() => {
      cyclableElements.forEach((el) => {
        if (el.style) {
          el.style.background = Utils.randomColor();
        }
      });
    }, SiteConfig.timing.pulseInterval * 2);
  },
};

// Form interactions (even though we don't have forms)
const FormHandler = {
  init: function () {
    this.createVirtualForms();
    this.bindFormEvents();
  },

  createVirtualForms: function () {
    // Create invisible forms for testing purposes
    const forms = ["contact", "newsletter", "search"];
    forms.forEach((formType) => {
      const form = document.createElement("form");
      form.id = `virtual-${formType}-form`;
      form.style.display = "none";
      form.innerHTML = `
          <input type="text" name="name" placeholder="Name">
          <input type="email" name="email" placeholder="Email">
          <textarea name="message" placeholder="Message"></textarea>
          <button type="submit">Submit</button>
        `;
      document.body.appendChild(form);
    });
  },

  bindFormEvents: function () {
    const virtualForms = document.querySelectorAll('[id^="virtual-"]');
    virtualForms.forEach((form) => {
      form.addEventListener("submit", this.handleFormSubmit.bind(this));
    });
  },

  handleFormSubmit: function (event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    // Simulate form processing
    console.log("Virtual form submitted:", data);
    this.showVirtualNotification("Form submitted successfully!");
  },

  showVirtualNotification: function (message) {
    const notification = document.createElement("div");
    notification.className = "virtual-notification";
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${Utils.randomColor()};
        color: white;
        padding: 1rem;
        border-radius: 8px;
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.3s ease;
      `;

    document.body.appendChild(notification);

    setTimeout(() => (notification.style.opacity = "1"), 100);
    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  },
};

// Performance monitoring
const PerformanceMonitor = {
  init: function () {
    this.startTime = performance.now();
    this.bindPerformanceEvents();
    this.monitorResources();
  },

  bindPerformanceEvents: function () {
    window.addEventListener("load", this.onPageLoad.bind(this));
    document.addEventListener("DOMContentLoaded", this.onDOMReady.bind(this));
  },

  onPageLoad: function () {
    const loadTime = performance.now() - this.startTime;
    console.log(`Page loaded in ${loadTime.toFixed(2)}ms`);
    this.reportMetrics();
  },

  onDOMReady: function () {
    const domTime = performance.now() - this.startTime;
    console.log(`DOM ready in ${domTime.toFixed(2)}ms`);
  },

  monitorResources: function () {
    if ("PerformanceObserver" in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === "resource") {
            console.log(`Resource ${entry.name} loaded in ${entry.duration.toFixed(2)}ms`);
          }
        });
      });
      observer.observe({ entryTypes: ["resource"] });
    }
  },

  reportMetrics: function () {
    const metrics = {
      memory: performance.memory
        ? {
            used: Math.round(performance.memory.usedJSHeapSize / 1048576),
            total: Math.round(performance.memory.totalJSHeapSize / 1048576),
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576),
          }
        : null,
      navigation: performance.getEntriesByType("navigation")[0],
      resources: performance.getEntriesByType("resource").length,
    };

    console.log("Performance metrics:", metrics);
  },
};

// Random content generator
const ContentGenerator = {
  init: function () {
    this.words = [
      "lorem",
      "ipsum",
      "dolor",
      "sit",
      "amet",
      "consectetur",
      "adipiscing",
      "elit",
      "sed",
      "do",
      "eiusmod",
      "tempor",
      "incididunt",
      "ut",
      "labore",
      "et",
      "dolore",
      "magna",
      "aliqua",
    ];
    this.generateDynamicContent();
  },

  generateDynamicContent: function () {
    // Add random tooltips to elements
    const elements = document.querySelectorAll("h1, h2, h3, .btn");
    elements.forEach((el) => {
      el.title = this.generateSentence(Utils.randomBetween(3, 8));
    });
  },

  generateSentence: function (wordCount) {
    const sentence = [];
    for (let i = 0; i < wordCount; i++) {
      sentence.push(this.words[Utils.randomBetween(0, this.words.length - 1)]);
    }
    return sentence.join(" ").charAt(0).toUpperCase() + sentence.join(" ").slice(1) + ".";
  },

  generateParagraph: function (sentenceCount = 3) {
    const paragraph = [];
    for (let i = 0; i < sentenceCount; i++) {
      paragraph.push(this.generateSentence(Utils.randomBetween(5, 15)));
    }
    return paragraph.join(" ");
  },
};

// Main initialization function
function init() {
  console.log("Initializing Big Test Site JavaScript...");

  try {
    MobileMenu.init();
    ScrollEffects.init();
    BackgroundGenerator.init();
    FormHandler.init();
    PerformanceMonitor.init();
    ContentGenerator.init();

    console.log("All modules initialized successfully");
  } catch (error) {
    console.error("Error initializing modules:", error);
  }

  // Expose utilities globally for testing
  window.SiteUtils = Utils;
  window.SiteConfig = SiteConfig;

  // Add some CSS animation keyframes dynamically
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes float {
      0% { transform: translateY(0px) rotate(0deg); }
      33% { transform: translateY(-30px) rotate(120deg); }
      66% { transform: translateY(15px) rotate(240deg); }
      100% { transform: translateY(0px) rotate(360deg); }
    }
    
    .virtual-notification {
      animation: slideInRight 0.3s ease;
    }
    
    @keyframes slideInRight {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    
    .random-shape {
      transition: all 2s ease;
    }
    
    .mobile-menu-open {
      display: flex !important;
      flex-direction: column;
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: rgba(102, 126, 234, 0.95);
      backdrop-filter: blur(10px);
      padding: 1rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    
    .scrolled {
      background: rgba(102, 126, 234, 0.9) !important;
      backdrop-filter: blur(10px);
    }
  `;
  document.head.appendChild(styleSheet);
}

// Initialize the application when DOM is ready
export function initializeApp() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}

// Auto-initialize when module is imported
initializeApp();
