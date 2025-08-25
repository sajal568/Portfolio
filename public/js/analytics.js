// Analytics Tracking System
class PortfolioAnalytics {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
        this.currentPage = window.location.pathname || '/';
        this.pageStartTime = Date.now();
        this.apiUrl = `${window.location.origin}/api/analytics`;
        this.enabled = true; // will be verified via health check
        this.apiBase = null; // resolved API base after health check
        
        this.init();
    }
    
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    async init() {
        // If running on a typical static local server (Live Server 5500), disable analytics to avoid 404 spam
        const isStaticLocal = (
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
            window.location.port === '5500'
        );
        if (isStaticLocal) {
            this.enabled = false;
            return;
        }

        // Resolve API base by probing health endpoints (production or other hosts)
        await this.resolveApiBase();
        if (this.apiBase) {
            this.apiUrl = `${this.apiBase}/api/analytics`;
        }
        if (!this.enabled) {
            // Do not attempt analytics if API is unavailable (e.g., served by static server)
            return;
        }

        // Track initial visit
        await this.trackVisit();
        
        // Track page view
        await this.trackPageView(this.currentPage);
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Track page unload
        window.addEventListener('beforeunload', () => {
            this.trackPageTimeSpent();
        });
        
        // Track visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.trackPageTimeSpent();
            } else {
                this.pageStartTime = Date.now();
            }
        });
    }

    async resolveApiBase() {
        // Prefer same-origin first. Only use localhost fallbacks in local dev/file protocol.
        const isLocalEnv = (
            window.location.protocol === 'file:' ||
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1'
        );

        const baseList = isLocalEnv
            ? [window.location.origin, 'http://localhost:5500', 'http://127.0.0.1:5500']
            : [window.location.origin];

        const candidates = baseList.filter((v, i, a) => a.indexOf(v) === i); // unique

        for (const base of candidates) {
            try {
                const resp = await fetch(`${base}/api/health`, { method: 'GET' });
                if (resp.ok) {
                    this.apiBase = base;
                    this.enabled = true;
                    if (base !== window.location.origin) {
                        console.log(`Analytics: using API at ${base}`);
                    }
                    return;
                }
            } catch (_) {
                // try next
            }
        }
        this.enabled = false;
        console.log('Analytics disabled: API not available on known bases.');
    }
    
    async trackVisit() {
        if (!this.enabled) return;
        try {
            const data = {
                sessionId: this.sessionId,
                referrer: document.referrer,
                utmSource: this.getUrlParameter('utm_source'),
                utmMedium: this.getUrlParameter('utm_medium'),
                utmCampaign: this.getUrlParameter('utm_campaign')
            };
            
            await fetch(`${this.apiUrl}/visit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (error) {
            console.log('Analytics tracking error:', error);
        }
    }
    
    async trackPageView(page) {
        if (!this.enabled) return;
        try {
            const data = {
                sessionId: this.sessionId,
                page: page
            };
            
            await fetch(`${this.apiUrl}/page-view`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (error) {
            console.log('Analytics tracking error:', error);
        }
    }
    
    async trackAction(type, element, data = {}) {
        if (!this.enabled) return;
        try {
            const actionData = {
                sessionId: this.sessionId,
                type: type,
                element: element,
                data: data
            };
            
            await fetch(`${this.apiUrl}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(actionData)
            });
        } catch (error) {
            console.log('Analytics tracking error:', error);
        }
    }
    
    trackPageTimeSpent() {
        const timeSpent = Math.floor((Date.now() - this.pageStartTime) / 1000);
        if (timeSpent > 5) { // Only track if spent more than 5 seconds
            this.trackPageView(this.currentPage, timeSpent);
        }
    }
    
    setupEventListeners() {
        // Track hire me button clicks
        document.addEventListener('click', (e) => {
            if (e.target.id === 'hireMeBtn' || e.target.closest('#hireMeBtn')) {
                this.trackAction('click', 'hire-me-button');
            }
            
            // Track navigation clicks
            if (e.target.classList.contains('nav-link')) {
                this.trackAction('click', 'navigation', { 
                    link: e.target.getAttribute('href'),
                    text: e.target.textContent 
                });
            }
            
            // Track project links
            if (e.target.classList.contains('project-link')) {
                this.trackAction('click', 'project-link', {
                    project: e.target.closest('.project-card')?.querySelector('.project-title')?.textContent
                });
            }
            
            // Track social links
            if (e.target.closest('.social-link')) {
                const socialLink = e.target.closest('.social-link');
                this.trackAction('click', 'social-link', {
                    platform: socialLink.getAttribute('aria-label'),
                    url: socialLink.href
                });
            }
            
            // Track CV download
            if (e.target.classList.contains('download-cv')) {
                this.trackAction('download', 'cv-download');
            }
            
            // Track contact button
            if (e.target.classList.contains('contact-btn')) {
                this.trackAction('click', 'contact-button');
            }
        });
        
        // Track form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.classList.contains('hire-form')) {
                this.trackAction('form_submit', 'hire-form', {
                    projectType: e.target.querySelector('[name="projectType"]')?.value
                });
            }
            
            if (e.target.id === 'contactForm') {
                this.trackAction('form_submit', 'contact-form');
            }
        });
        
        // Track scroll depth
        let maxScroll = 0;
        window.addEventListener('scroll', () => {
            const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
            if (scrollPercent > maxScroll && scrollPercent % 25 === 0) {
                maxScroll = scrollPercent;
                this.trackAction('scroll', 'scroll-depth', { depth: scrollPercent });
            }
        });
        
        // Track newsletter subscription (if checkbox is checked on form submit)
        document.addEventListener('change', (e) => {
            if (e.target.name === 'newsletter' && e.target.checked) {
                this.trackAction('form_submit', 'newsletter-form');
            }
        });
    }
    
    getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }
}

// Initialize analytics when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if not in development mode
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        window.portfolioAnalytics = new PortfolioAnalytics();
    } else {
        // For development, you can still initialize for testing
        window.portfolioAnalytics = new PortfolioAnalytics();
    }
});
