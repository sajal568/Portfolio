// Mobile Menu Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
}));

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Active navigation link highlighting
window.addEventListener('scroll', () => {
    let current = '';
    const sections = document.querySelectorAll('section');
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (scrollY >= (sectionTop - 200)) {
            current = section.getAttribute('id');
        }
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// Header background on scroll - disabled to maintain transparency
// window.addEventListener('scroll', () => {
//     const header = document.querySelector('.header');
//     if (window.scrollY > 100) {
//         header.style.background = 'rgba(26, 26, 26, 0.98)';
//     } else {
//         header.style.background = 'rgba(26, 26, 26, 0.95)';
//     }
// });

// Add loading animation
window.addEventListener('load', () => {
    document.body.style.opacity = '1';
});

// Helper: POST with fallback API bases
const postWithFallback = async (path, payload) => {
    const isLocalEnv = (
        window.location.protocol === 'file:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
    );
    const isStaticLocal5500 = (
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
        window.location.port === '5500'
    );
    // In static local 5500 scenario (e.g., Live Server), prefer typical Node ports first
    const localCandidates = [
        'http://localhost:3000', 'http://127.0.0.1:3000',
        'http://localhost:8080', 'http://127.0.0.1:8080',
        'http://localhost:5500', 'http://127.0.0.1:5500',
        window.location.origin
    ];
    const baseList = isLocalEnv
        ? (isStaticLocal5500 ? localCandidates : [window.location.origin, ...localCandidates])
        : [window.location.origin];
    const candidates = baseList.filter((v, i, a) => a.indexOf(v) === i);

    let lastError;
    for (const base of candidates) {
        try {
            const resp = await fetch(`${base}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (resp.ok) return resp;
            lastError = new Error(`HTTP ${resp.status}`);
        } catch (e) {
            lastError = e;
        }
    }
    throw lastError || new Error('Request failed');
};

// Scroll/Load reveal animations
const initScrollReveal = () => {
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return; // don't animate

    const addReveal = (elements, options = {}) => {
        const { direction = 'up', stagger = 80, startIndex = 0 } = options;
        const dirClass = direction === 'left' ? 'reveal-left' : direction === 'right' ? 'reveal-right' : '';
        elements.forEach((el, i) => {
            el.classList.add('reveal-on-scroll');
            if (dirClass) el.classList.add(dirClass);
            const delay = (startIndex + i) * stagger;
            el.style.setProperty('--reveal-delay', `${delay}ms`);
            observer.observe(el);
        });
    };

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in');
                obs.unobserve(entry.target);
            }
        });
    }, { root: null, threshold: 0.1 });

    // Hero
    addReveal(Array.from(document.querySelectorAll('.hero-text > *')), { stagger: 80 });
    addReveal([document.querySelector('.profile-container')].filter(Boolean), { direction: 'right', stagger: 0 });

    // About
    addReveal([document.querySelector('.about-image')].filter(Boolean), { direction: 'left' });
    addReveal(Array.from(document.querySelectorAll('.about-content > *')), { stagger: 80 });
    addReveal(Array.from(document.querySelectorAll('.skills .skill-item')), { stagger: 60, startIndex: 2 });

    // Services
    addReveal(Array.from(document.querySelectorAll('.services-title, .services-description')), { stagger: 80 });
    addReveal(Array.from(document.querySelectorAll('.service-card')), { stagger: 120 });

    // Projects
    addReveal(Array.from(document.querySelectorAll('.projects-title, .projects-description')), { stagger: 80 });
    addReveal(Array.from(document.querySelectorAll('.filter-btn')), { stagger: 60 });
    addReveal(Array.from(document.querySelectorAll('.project-card')), { stagger: 120 });

    // Testimonials header only (slides animate separately)
    addReveal(Array.from(document.querySelectorAll('.testimonials-title, .testimonials-description')), { stagger: 80 });

    // Contact
    addReveal(Array.from(document.querySelectorAll('.contact-title, .contact-description')), { stagger: 80 });
    addReveal(Array.from(document.querySelectorAll('.contact .form-group, .contact .form-actions')), { stagger: 80 });

    // Footer
    addReveal(Array.from(document.querySelectorAll('.footer .footer-content > *')), { stagger: 80 });
};
// Theme toggle (dark/light)
const initThemeToggle = () => {
    const root = document.documentElement; // <html>
    const btn = document.getElementById('themeToggle');
    const icon = btn ? btn.querySelector('.icon') : null;
    const label = btn ? btn.querySelector('.label') : null;

    const getStored = () => {
        try { return localStorage.getItem('theme'); } catch(_) { return null; }
    };
    const store = (t) => { try { localStorage.setItem('theme', t); } catch(_) {} };

    const apply = (t) => {
        root.setAttribute('data-theme', t);
        if (icon) {
            icon.classList.toggle('fa-sun', t === 'light');
            icon.classList.toggle('fa-moon', t === 'dark');
        }
        if (label) label.textContent = t === 'light' ? 'Light' : 'Dark';
    };

    let theme = getStored() || 'dark';
    apply(theme);

    if (!btn) return;
    btn.addEventListener('click', () => {
        theme = theme === 'dark' ? 'light' : 'dark';
        apply(theme);
        store(theme);
        // Close mobile menu if open
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        hamburger && hamburger.classList.remove('active');
        navMenu && navMenu.classList.remove('active');
    });
};

// Logo image lightbox modal
const initLogoLightbox = () => {
    const logo = document.querySelector('.nav-logo .logo-img');
    const modal = document.getElementById('logoModal');
    const closeBtn = document.getElementById('closeLogoModal');
    if (!logo || !modal) return;

    const open = () => { modal.style.display = 'block'; document.body.style.overflow = 'hidden'; };
    const close = () => { modal.style.display = 'none'; document.body.style.overflow = 'auto'; };

    logo.addEventListener('click', (e) => { e.preventDefault(); open(); });
    closeBtn && closeBtn.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.style.display === 'block') close(); });
};

// Testimonials slider (prev/next buttons and dots)
const initTestimonialsSlider = () => {
    const slider = document.querySelector('.testimonials-slider');
    if (!slider) return; // section not present

    const slides = Array.from(slider.querySelectorAll('.testimonial-slide'));
    const prevBtn = slider.querySelector('.prev-btn');
    const nextBtn = slider.querySelector('.next-btn');
    const dots = Array.from(slider.querySelectorAll('.slider-dots .dot'));

    if (slides.length === 0) return;

    let current = slides.findIndex(s => s.classList.contains('active'));
    if (current === -1) current = 0;

    const show = (idx) => {
        const n = slides.length;
        const target = ((idx % n) + n) % n; // safe modulo
        slides.forEach((s, i) => s.classList.toggle('active', i === target));
        dots.forEach((d, i) => d.classList.toggle('active', i === target));
        current = target;
    };

    prevBtn && prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        show(current - 1);
    });
    nextBtn && nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        show(current + 1);
    });
    dots.forEach((dot, i) => {
        dot.addEventListener('click', (e) => {
            e.preventDefault();
            show(i);
        });
    });

    // Optional: keyboard navigation when slider in view
    const onKey = (e) => {
        if (e.key === 'ArrowLeft') show(current - 1);
        if (e.key === 'ArrowRight') show(current + 1);
    };
    document.addEventListener('keydown', onKey);
};

// Initial page load animation
document.addEventListener('DOMContentLoaded', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease-in-out';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

// Social media links hover effects (additional JavaScript interactions)
document.querySelectorAll('.social-link').forEach(link => {
    link.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-5px) scale(1.1)';
    });
    
    link.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

// CTA Button click effect
document.querySelector('.cta-button').addEventListener('click', function() {
    this.style.transform = 'scale(0.95)';
    setTimeout(() => {
        this.style.transform = 'scale(1)';
    }, 150);
});

// Parallax effect for hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroContent = document.querySelector('.hero-text');
    const heroImage = document.querySelector('.hero-image');
    
    if (heroContent && heroImage) {
        heroContent.style.transform = `translateY(${scrolled * 0.1}px)`;
        heroImage.style.transform = `translateY(${scrolled * -0.1}px)`;
    }
});

// Skill bars animation
const animateSkillBars = () => {
    const skillBars = document.querySelectorAll('.skill-progress');
    const aboutSection = document.querySelector('.about');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                skillBars.forEach(bar => {
                    const width = bar.getAttribute('data-width');
                    bar.style.width = width;
                });
            }
        });
    }, { threshold: 0.5 });
    
    if (aboutSection) {
        observer.observe(aboutSection);
    }
};

// Contact form functionality
const initContactForm = () => {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const emailInput = document.getElementById('emailInput');
    const submitBtn = form.querySelector('.contact-btn');

    // Local toast helper
    const ensureToastStyles = () => {
        if (document.getElementById('toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            .toast { position: fixed; right: 20px; top: 20px; z-index: 9999; padding: 12px 16px; border-radius: 8px; color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.15); opacity: 0; transform: translateY(-10px); transition: opacity 0.25s ease, transform 0.25s ease; font-size: 14px; letter-spacing: 0.2px; }
            .toast.show { opacity: 1; transform: translateY(0); }
            .toast.success { background: linear-gradient(135deg, #28a745, #20c997); }
            .toast.error { background: linear-gradient(135deg, #dc3545, #c82333); }
        `;
        document.head.appendChild(style);
    };
    const showToast = (type, text) => {
        ensureToastStyles();
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.textContent = text;
        document.body.appendChild(t);
        requestAnimationFrame(() => t.classList.add('show'));
        setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput?.value.trim() || '';
        const isValid = /.+@.+\..+/.test(email);
        if (!isValid) {
            showToast('error', 'Please enter a valid email address.');
            return;
        }

        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending...'; }
        try {
            // Derive required fields expected by backend Contact model
            const name = email.split('@')[0];
            const subject = 'New contact request from portfolio';
            const message = `Please reach out to me at ${email}.`;
            const payload = { name, email, subject, message };
            const resp = await postWithFallback('/api/contact', payload);
            const data = await resp.json().catch(() => ({}));
            if (!resp.ok || data?.success === false) {
                const msg = (Array.isArray(data?.errors) && data.errors.join(', ')) || data?.message || 'Failed to send message.';
                throw new Error(msg);
            }
            showToast('success', 'Thanks! I\'ll get back to you soon.');
            form.reset();
        } catch (err) {
            console.error('Contact form error:', err);
            showToast('error', err.message || 'Failed to send message.');
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Contact Me'; }
        }
    });
};

// Initialize skill bars animation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    animateSkillBars();
});

// Project filtering functionality
const initProjectFilters = () => {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');

    // Map old filter values to new ones for backward compatibility
    const filterMap = {
        'ui-ux': 'snack-apps',
        'web-design': 'nap-platforms',
        'app-design': 'meme-tools',
        'graphic-design': 'life-hacks'
    };

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            let filterValue = button.getAttribute('data-filter');
            
            // Add a small delay for smooth transition
            projectCards.forEach((card, index) => {
                setTimeout(() => {
                    const cardCategory = card.getAttribute('data-category');
                    
                    if (filterValue === 'all' || cardCategory === filterValue) {
                        card.classList.remove('hidden');
                        card.style.display = 'block';
                    } else {
                        card.classList.add('hidden');
                        card.style.display = 'none';
                    }
                }, index * 50); // Stagger the animation
            });
        });
    });
};

// Animate project cards on scroll
const observeProjectCards = () => {
    const projectCards = document.querySelectorAll('.project-card');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('animate-in');
                }, index * 100);
            }
        });
    }, { 
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    projectCards.forEach(card => {
        observer.observe(card);
    });
};

// Add smooth hover effects for project links
const initProjectHoverEffects = () => {
    const projectCards = document.querySelectorAll('.project-card');
    
    projectCards.forEach(card => {
        const links = card.querySelectorAll('.project-link');
        
        card.addEventListener('mouseenter', () => {
            links.forEach((link, index) => {
                setTimeout(() => {
                    link.style.transitionDelay = `${index * 0.1}s`;
                }, 0);
            });
        });
        
        card.addEventListener('mouseleave', () => {
            links.forEach(link => {
                link.style.transitionDelay = '0s';
            });
        });
    });
};

// Add click effects to filter buttons
const initFilterButtonEffects = () => {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Create ripple effect
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
};

// Add CSS for ripple effect
const addRippleStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
        .filter-btn {
            position: relative;
            overflow: hidden;
        }
        
        .ripple {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transform: scale(0);
            animation: ripple-animation 0.6s linear;
            pointer-events: none;
        }
        
        @keyframes ripple-animation {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
};

// Hire Me Modal Functionality
const initHireForm = () => {
    const modal = document.getElementById('hireMeModal');
    const hireBtn = document.getElementById('hireMeBtn');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const form = document.getElementById('hireMeForm');
    const submitBtn = form ? form.querySelector('.btn-primary') : null;

    if (!modal || !form) return;

    const openModal = () => { modal.style.display = 'block'; document.body.style.overflow = 'hidden'; };
    const closeModal = () => { modal.style.display = 'none'; document.body.style.overflow = 'auto'; };
    if (hireBtn) hireBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.style.display === 'block') closeModal(); });

    // Local toast helper
    const ensureToastStyles = () => {
        if (document.getElementById('toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            .toast { position: fixed; right: 20px; top: 20px; z-index: 9999; padding: 12px 16px; border-radius: 8px; color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.15); opacity: 0; transform: translateY(-10px); transition: opacity 0.25s ease, transform 0.25s ease; font-size: 14px; letter-spacing: 0.2px; }
            .toast.show { opacity: 1; transform: translateY(0); }
            .toast.success { background: linear-gradient(135deg, #28a745, #20c997); }
            .toast.error { background: linear-gradient(135deg, #dc3545, #c82333); }
        `;
        document.head.appendChild(style);
    };
    const showToast = (type, text) => {
        ensureToastStyles();
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.textContent = text;
        document.body.appendChild(t);
        requestAnimationFrame(() => t.classList.add('show'));
        setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
    };

    // Value mappers to backend enums
    const mapProjectType = (v) => {
        switch (v) {
            case 'snack-consulting':
            case 'life-coaching':
            case 'nap-optimization':
                return 'consulting';
            case 'meme-analysis':
            case 'random-facts':
            case 'other':
            default:
                return 'other';
        }
    };
    const mapBudget = (v) => {
        switch (v) {
            case 'under-1000': return 'under-5k';
            case '1000-5000': return '5k-15k';
            case '5000-10000': return '15k-50k';
            case '10000-plus': return 'above-100k';
            case 'negotiable': return 'discuss';
            default: return undefined;
        }
    };
    const mapTimeline = (v) => {
        switch (v) {
            case 'asap':
            case '1-week': return 'asap';
            case '1-month': return '1-month';
            case '3-months': return '2-3-months';
            case 'flexible': return 'flexible';
            default: return undefined;
        }
    };

    // Submit handler on form
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const firstName = document.getElementById('firstName')?.value.trim() || '';
        const lastName = document.getElementById('lastName')?.value.trim() || '';
        const email = document.getElementById('email')?.value.trim() || '';
        const phone = document.getElementById('phone')?.value.trim() || '';
        const company = document.getElementById('company')?.value.trim() || '';
        const projectTypeRaw = document.getElementById('projectType')?.value || '';
        const budgetRaw = document.getElementById('budget')?.value || '';
        const timelineRaw = document.getElementById('timeline')?.value || '';
        const projectDescription = document.getElementById('projectDescription')?.value.trim() || '';
        const additionalInfo = document.getElementById('additionalInfo')?.value.trim() || '';
        const newsletter = !!document.getElementById('newsletter')?.checked;

        const fullName = `${firstName} ${lastName}`.trim();
        if (!fullName || !email || !projectTypeRaw || !projectDescription) {
            showToast('error', 'Please fill in all required fields.');
            return;
        }

        const payload = {
            name: fullName,
            email,
            phone,
            company,
            projectType: mapProjectType(projectTypeRaw),
            projectDescription,
            additionalInfo,
            newsletter,
        };
        const mb = mapBudget(budgetRaw);
        const mt = mapTimeline(timelineRaw);
        if (mb) payload.budget = mb;
        if (mt) payload.timeline = mt;

        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending...'; }

        try {
            console.log('Submitting hire payload:', payload);
            const resp = await postWithFallback('/api/hire', payload);
            const data = await resp.json().catch(() => ({}));
            console.log('Hire response:', resp.status, data);
            if (!resp.ok || data?.success === false) {
                const msg = data?.message || (Array.isArray(data?.errors) && data.errors[0]) || 'Submission failed.';
                throw new Error(msg);
            }

            showToast('success', 'Proposal sent! I\'ll contact you soon.');
            form.reset();
            try { localStorage.setItem('hireRequestCreated', Date.now().toString()); } catch(_) {}
            setTimeout(() => closeModal(), 800);
        } catch (err) {
            console.error('Hire form error:', err);
            showToast('error', err.message || 'Failed to submit request.');
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send Proposal Request'; }
        }
    });
};

// Add ripple animation styles
const addContactAnimationStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        
        .contact-form-wrapper {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.6s ease;
        }
        
        .contact.animate-in .contact-form-wrapper {
            opacity: 1;
            transform: translateY(0);
        }
    `;
    document.head.appendChild(style);
};

// Animate contact section on scroll
const observeContact = () => {
    const contactSection = document.querySelector('.contact');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                // Add staggered animation to contact elements
                const elements = entry.target.querySelectorAll('.contact-title, .contact-description, .contact-form-wrapper');
                elements.forEach((el, index) => {
                    setTimeout(() => {
                        el.style.opacity = '1';
                        el.style.transform = 'translateY(0)';
                    }, index * 200);
                });
            }
        });
    }, { threshold: 0.2 });
    
    if (contactSection) {
        observer.observe(contactSection);
    }
};

// Footer smooth scroll functionality
const initFooterNavigation = () => {
    const footerNavLinks = document.querySelectorAll('.footer-nav-link');
    
    footerNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
};

// Typewriter Animation
const initTypewriter = () => {
    const typewriterElement = document.getElementById('typewriter');
    const cursorElement = document.getElementById('cursor');
    
    if (!typewriterElement || !cursorElement) return;
    
    const texts = [
        'Overthinker',
        'Enthusiast', 
        'Napper'
    ];
    
    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let isPaused = false;
    
    const typeSpeed = 100;        // Speed of typing
    const deleteSpeed = 50;       // Speed of deleting
    const pauseTime = 2000;       // Pause time after completing a word
    const deletePauseTime = 1000; // Pause time before starting to delete
    
    const type = () => {
        const currentText = texts[textIndex];
        
        if (isPaused) {
            setTimeout(() => {
                isPaused = false;
                isDeleting = true;
                type();
            }, isDeleting ? deletePauseTime : pauseTime);
            return;
        }
        
        if (isDeleting) {
            // Deleting characters
            typewriterElement.textContent = currentText.substring(0, charIndex - 1);
            charIndex--;
            
            if (charIndex === 0) {
                isDeleting = false;
                textIndex = (textIndex + 1) % texts.length;
                setTimeout(type, 500); // Brief pause before starting next word
                return;
            }
        } else {
            // Typing characters
            typewriterElement.textContent = currentText.substring(0, charIndex + 1);
            charIndex++;
            
            if (charIndex === currentText.length) {
                isPaused = true;
            }
        }
        
        const speed = isDeleting ? deleteSpeed : typeSpeed;
        setTimeout(type, speed);
    };
    
    // Start the animation after a brief delay
    setTimeout(() => {
        type();
    }, 1000);
    
    // Add subtle cursor animation sync
    const syncCursor = () => {
        if (typewriterElement.textContent.length > 0) {
            cursorElement.style.animationDuration = '1s';
        } else {
            cursorElement.style.animationDuration = '0.5s';
        }
    };
    
    // Monitor text changes for cursor sync
    const observer = new MutationObserver(syncCursor);
    observer.observe(typewriterElement, { childList: true, characterData: true, subtree: true });
};

// Initialize page scripts
document.addEventListener('DOMContentLoaded', () => {
    try { if (typeof initContactForm === 'function') initContactForm(); } catch (e) { console.warn('initContactForm skipped:', e); }
    try { observeContact(); } catch (e) { console.warn('observeContact error:', e); }
    try { addContactAnimationStyles(); } catch (e) { console.warn('addContactAnimationStyles error:', e); }
    try { initFooterNavigation(); } catch (e) { console.warn('initFooterNavigation error:', e); }
    try { initTypewriter(); } catch (e) { console.warn('initTypewriter error:', e); }
    try { initHireForm(); } catch (e) { console.warn('initHireForm error:', e); }
    try { initTestimonialsSlider(); } catch (e) { console.warn('initTestimonialsSlider error:', e); }
    try { initLogoLightbox(); } catch (e) { console.warn('initLogoLightbox error:', e); }
    try { initThemeToggle(); } catch (e) { console.warn('initThemeToggle error:', e); }
    try { initScrollReveal(); } catch (e) { console.warn('initScrollReveal error:', e); }
});