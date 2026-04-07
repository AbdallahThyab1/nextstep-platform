/**
 * ============================================
 * NextStep | الخطوة القادمة
 * Professional JavaScript System
 * Version: 2.0.0
 * Features: Navigation, Roadmap Logic, Progress, Storage, Animations
 * ============================================
 */

(function () {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================

    const CONFIG = {
        storagePrefix: 'nextstep_',
        animationDuration: 300,
        debug: false, // Set to true for development logs
    };

    // ============================================
    // UTILITIES
    // ============================================

    const Utils = {
        log(...args) {
            if (CONFIG.debug) console.log('[NextStep]', ...args);
        },

        warn(...args) {
            if (CONFIG.debug) console.warn('[NextStep]', ...args);
        },

        debounce(func, delay) {
            let timeout;
            return function (...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), delay);
            };
        },

        generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        },

        smoothScroll(element, offset = 80) {
            if (!element) return;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    // ============================================
    // STORAGE MANAGER
    // ============================================

    const Storage = {
        getKey(key) {
            return CONFIG.storagePrefix + key;
        },

        set(key, value) {
            try {
                localStorage.setItem(this.getKey(key), JSON.stringify(value));
                return true;
            } catch (e) {
                Utils.warn('Storage save failed:', e);
                return false;
            }
        },

        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(this.getKey(key));
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                Utils.warn('Storage load failed:', e);
                return defaultValue;
            }
        },

        remove(key) {
            localStorage.removeItem(this.getKey(key));
        },

        clear() {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(CONFIG.storagePrefix)) {
                    localStorage.removeItem(key);
                }
            });
        }
    };

    // ============================================
    // PAGE DETECTION
    // ============================================

    const PageDetector = {
        currentPage: null,
        roadmapId: null,

        detect() {
            const body = document.body;
            const path = window.location.pathname;

            if (body.hasAttribute('data-page')) {
                this.currentPage = body.getAttribute('data-page');
            } else if (path.includes('roadmaps.html')) {
                this.currentPage = 'roadmaps';
            } else if (path.includes('roadmap-') || path.includes('/roadmap/')) {
                this.currentPage = 'roadmap';
            } else {
                this.currentPage = 'home';
            }

            // Extract roadmap ID if on roadmap page
            if (this.currentPage === 'roadmap') {
                if (body.hasAttribute('data-roadmap-id')) {
                    this.roadmapId = body.getAttribute('data-roadmap-id');
                } else {
                    const match = path.match(/roadmap-([^.]+)\.html/);
                    this.roadmapId = match ? match[1] : 'frontend';
                }
            }

            Utils.log('Page detected:', this.currentPage, 'Roadmap ID:', this.roadmapId);
            return this.currentPage;
        },

        isHome() { return this.currentPage === 'home'; },
        isRoadmaps() { return this.currentPage === 'roadmaps'; },
        isRoadmap() { return this.currentPage === 'roadmap'; }
    };

    // ============================================
    // TOAST NOTIFICATION SYSTEM
    // ============================================

    const Toast = {
        show(message, type = 'success', duration = 3000) {
            const existingToast = document.querySelector('.nextstep-toast');
            if (existingToast) existingToast.remove();

            const toast = document.createElement('div');
            toast.className = `nextstep-toast nextstep-toast--${type}`;
            toast.innerHTML = `
                <div class="toast-icon">${this.getIcon(type)}</div>
                <div class="toast-message">${message}</div>
                <button class="toast-close">✕</button>
            `;

            const styles = {
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: '10000',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#6366F1',
                color: 'white',
                padding: '12px 20px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                animation: 'slideInRight 0.3s ease',
                cursor: 'default',
                backdropFilter: 'blur(10px)'
            };

            Object.assign(toast.style, styles);

            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.style.cssText = `
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 16px;
                padding: 0 4px;
                opacity: 0.7;
            `;
            closeBtn.onclick = () => toast.remove();

            document.body.appendChild(toast);

            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, duration);
        },

        getIcon(type) {
            switch (type) {
                case 'success': return '✓';
                case 'error': return '✕';
                case 'info': return 'ℹ';
                default: return '✓';
            }
        }
    };

    // ============================================
    // NAVIGATION MANAGER (Mobile Menu)
    // ============================================

    const Navigation = {
        isOpen: false,
        menuToggle: null,
        navMenu: null,
        overlay: null,

        init() {
            this.menuToggle = document.querySelector('.mobile-menu-toggle');
            this.navMenu = document.querySelector('.navbar__nav');

            if (!this.menuToggle || !this.navMenu) return;

            this.createOverlay();
            this.setupEventListeners();
            this.setupResizeHandler();
            Utils.log('Navigation initialized');
        },

        createOverlay() {
            this.overlay = document.createElement('div');
            this.overlay.className = 'drawer-overlay';
            document.body.appendChild(this.overlay);
            this.overlay.addEventListener('click', () => this.close());
        },

        setupEventListeners() {
            this.menuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggle();
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) this.close();
            });

            const links = this.navMenu.querySelectorAll('a');
            links.forEach(link => {
                link.addEventListener('click', () => this.close());
            });
        },

        setupResizeHandler() {
            window.addEventListener('resize', Utils.debounce(() => {
                if (window.innerWidth > 768 && this.isOpen) {
                    this.close();
                }
            }, 150));
        },

        toggle() {
            this.isOpen ? this.close() : this.open();
        },

        open() {
            this.navMenu.classList.add('open');
            this.overlay.classList.add('drawer-overlay--visible');
            this.menuToggle.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
            this.isOpen = true;
        },

        close() {
            this.navMenu.classList.remove('open');
            this.overlay.classList.remove('drawer-overlay--visible');
            this.menuToggle.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
            this.isOpen = false;
        }
    };

    // ============================================
    // ROADMAP MANAGER (Core Logic)
    // ============================================

    const RoadmapManager = {
        roadmapId: null,
        steps: [],
        stepContents: [],
        completedSteps: [],
        activeStepId: null,
        totalSteps: 0,

        init(roadmapId) {
            this.roadmapId = roadmapId;
            this.cacheElements();
            this.loadSavedData();
            this.setupEventListeners();
            this.applyInitialState();
            this.updateProgress();
            Utils.log('RoadmapManager initialized for:', roadmapId);
        },

        cacheElements() {
            this.steps = Array.from(document.querySelectorAll('.step-item'));
            this.stepContents = Array.from(document.querySelectorAll('.step-content'));
            this.totalSteps = this.steps.length;

            // Extract step IDs
            this.steps.forEach((step, index) => {
                if (!step.hasAttribute('data-step-id')) {
                    step.setAttribute('data-step-id', `step-${index}`);
                }
            });
        },

        loadSavedData() {
            // Load completed steps
            const savedCompleted = Storage.get(`${this.roadmapId}_completed`, []);
            this.completedSteps = savedCompleted;

            // Load active step
            const savedActive = Storage.get(`${this.roadmapId}_active`);
            if (savedActive && this.steps.some(s => s.dataset.stepId === savedActive)) {
                this.activeStepId = savedActive;
            } else if (this.steps.length > 0) {
                this.activeStepId = this.steps[0].dataset.stepId;
            }
        },

        saveData() {
            Storage.set(`${this.roadmapId}_completed`, this.completedSteps);
            if (this.activeStepId) {
                Storage.set(`${this.roadmapId}_active`, this.activeStepId);
            }
        },

        setupEventListeners() {
            // Step click handlers
            this.steps.forEach(step => {
                step.removeEventListener('click', this.handleStepClick);
                step.addEventListener('click', (e) => {
                    e.preventDefault();
                    const stepId = step.dataset.stepId;
                    if (stepId) this.activateStep(stepId);
                });
            });

            // Mark as done buttons
            const markButtons = document.querySelectorAll('.btn--mark-done');
            markButtons.forEach(btn => {
                btn.removeEventListener('click', this.handleMarkDone);
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const stepId = btn.dataset.stepId || this.activeStepId;
                    if (stepId) this.toggleStepCompletion(stepId);
                });
            });

            // Next step buttons
            const nextButtons = document.querySelectorAll('.btn--next-step');
            nextButtons.forEach(btn => {
                btn.removeEventListener('click', this.handleNextStep);
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const stepId = btn.dataset.stepId || this.activeStepId;
                    if (stepId) this.nextStep(stepId);
                });
            });
        },

        handleStepClick(e) { /* Handled in setup */ },
        handleMarkDone(e) { /* Handled in setup */ },
        handleNextStep(e) { /* Handled in setup */ },

        activateStep(stepId) {
            if (!stepId) return;

            this.activeStepId = stepId;
            this.saveData();

            // Update UI: highlight active step
            this.steps.forEach(step => {
                const isActive = step.dataset.stepId === stepId;
                step.classList.toggle('step-item--active', isActive);
                step.setAttribute('aria-selected', isActive ? 'true' : 'false');

                const statusSpan = step.querySelector('.step-item__status');
                if (statusSpan) {
                    const isCompleted = this.completedSteps.includes(step.dataset.stepId);
                    if (isActive) statusSpan.textContent = '●';
                    else if (isCompleted) statusSpan.textContent = '✓';
                    else statusSpan.textContent = '○';
                }
            });

            // Show corresponding content
            this.stepContents.forEach(content => {
                const isActive = content.dataset.stepContent === stepId;
                content.classList.toggle('step-content--active', isActive);
                content.hidden = !isActive;
            });

            // Update mark button text
            const isCompleted = this.completedSteps.includes(stepId);
            const markBtn = document.querySelector('.btn--mark-done');
            if (markBtn) {
                markBtn.textContent = isCompleted ? '✓ Already Completed' : '✓ Mark as Completed';
            }

            // Smooth scroll on mobile
            if (window.innerWidth < 768) {
                const contentPanel = document.querySelector('.roadmap-content');
                if (contentPanel) Utils.smoothScroll(contentPanel, 80);
            }

            Utils.log('Step activated:', stepId);
        },

        toggleStepCompletion(stepId) {
            const isCompleted = this.completedSteps.includes(stepId);

            if (isCompleted) {
                this.completedSteps = this.completedSteps.filter(id => id !== stepId);
                Toast.show(`↩️ Step unmarked`, 'info');
            } else {
                this.completedSteps.push(stepId);
                Toast.show(`✅ "${this.getStepTitle(stepId)}" completed!`, 'success');
            }

            this.saveData();
            this.updateStepUI(stepId, !isCompleted);
            this.updateProgress();

            // Auto advance to next step when marking complete
            if (!isCompleted) {
                const nextStepId = this.getNextStepId(stepId);
                if (nextStepId) {
                    setTimeout(() => this.activateStep(nextStepId), 500);
                }
            }
        },

        updateStepUI(stepId, isCompleted) {
            const step = this.steps.find(s => s.dataset.stepId === stepId);
            if (!step) return;

            step.classList.toggle('step-item--completed', isCompleted);

            const statusSpan = step.querySelector('.step-item__status');
            if (statusSpan) {
                if (isCompleted) statusSpan.textContent = '✓';
                else if (step.classList.contains('step-item--active')) statusSpan.textContent = '●';
                else statusSpan.textContent = '○';
            }

            // Update mark button text if active
            if (this.activeStepId === stepId) {
                const markBtn = document.querySelector('.btn--mark-done');
                if (markBtn) {
                    markBtn.textContent = isCompleted ? '✓ Already Completed' : '✓ Mark as Completed';
                }
            }
        },

        nextStep(currentStepId) {
            const nextStepId = this.getNextStepId(currentStepId);

            if (nextStepId) {
                this.activateStep(nextStepId);
                Toast.show(`➡️ Moving to next step`, 'info');
            } else {
                this.showCompletionCelebration();
            }
        },

        getNextStepId(currentStepId) {
            const currentIndex = this.steps.findIndex(s => s.dataset.stepId === currentStepId);
            if (currentIndex !== -1 && currentIndex + 1 < this.steps.length) {
                return this.steps[currentIndex + 1].dataset.stepId;
            }
            return null;
        },

        getStepTitle(stepId) {
            const step = this.steps.find(s => s.dataset.stepId === stepId);
            if (!step) return 'Step';
            const titleSpan = step.querySelector('.step-item__title');
            return titleSpan ? titleSpan.textContent : 'Step';
        },

        updateProgress() {
            const completedCount = this.completedSteps.length;
            const percentage = this.totalSteps > 0 ? Math.round((completedCount / this.totalSteps) * 100) : 0;

            // Update progress bar
            const progressFill = document.querySelector('.progress-bar__fill');
            if (progressFill) {
                progressFill.style.width = `${percentage}%`;
                progressFill.setAttribute('aria-valuenow', percentage);
            }

            // Update percentage text
            const progressPercentage = document.querySelector('.progress-percentage');
            if (progressPercentage) {
                progressPercentage.textContent = `${percentage}%`;
            }

            // Update progress text
            const progressText = document.querySelector('.progress-text');
            if (progressText) {
                progressText.textContent = `${percentage}% complete`;
            }

            Utils.log('Progress updated:', `${percentage}% (${completedCount}/${this.totalSteps})`);

            // Celebration on 100%
            if (percentage === 100 && this.totalSteps > 0) {
                this.showCompletionCelebration();
            }
        },

        applyInitialState() {
            // Apply completed styles to steps
            this.completedSteps.forEach(stepId => {
                this.updateStepUI(stepId, true);
            });

            // Activate the saved or first step
            if (this.activeStepId) {
                this.activateStep(this.activeStepId);
            } else if (this.steps.length > 0) {
                this.activateStep(this.steps[0].dataset.stepId);
            }
        },

        showCompletionCelebration() {
            Toast.show('🎉🎉🎉 AMAZING! You completed everything! 🎉🎉🎉', 'success', 5000);

            // Simple confetti effect
            this.createConfetti();
        },

        createConfetti() {
            const colors = ['#6366F1', '#10B981', '#FFFFFF', '#818CF8', '#34D399'];

            for (let i = 0; i < 50; i++) {
                const confetti = document.createElement('div');
                confetti.style.cssText = `
                    position: fixed;
                    left: ${Math.random() * 100}%;
                    top: -20px;
                    width: ${8 + Math.random() * 8}px;
                    height: ${8 + Math.random() * 8}px;
                    background: ${colors[Math.floor(Math.random() * colors.length)]};
                    border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
                    pointer-events: none;
                    z-index: 10001;
                    animation: fall ${1.5 + Math.random() * 2}s linear forwards;
                    opacity: ${0.6 + Math.random() * 0.4};
                `;
                document.body.appendChild(confetti);
                setTimeout(() => confetti.remove(), 3000);
            }
        }
    };

    // ============================================
    // HOME PAGE INTERACTIONS
    // ============================================

    const HomePage = {
        init() {
            this.animateHero();
            this.setupCTAs();
            Utils.log('HomePage initialized');
        },

        animateHero() {
            const heroTitle = document.querySelector('.hero__title');
            const heroSubtitle = document.querySelector('.hero__subtitle');
            const heroButtons = document.querySelector('.hero__actions');

            if (heroTitle) {
                heroTitle.style.opacity = '0';
                heroTitle.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    heroTitle.style.transition = 'all 0.6s ease';
                    heroTitle.style.opacity = '1';
                    heroTitle.style.transform = 'translateY(0)';
                }, 100);
            }

            if (heroSubtitle) {
                heroSubtitle.style.opacity = '0';
                heroSubtitle.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    heroSubtitle.style.transition = 'all 0.6s ease';
                    heroSubtitle.style.opacity = '1';
                    heroSubtitle.style.transform = 'translateY(0)';
                }, 300);
            }

            if (heroButtons) {
                heroButtons.style.opacity = '0';
                setTimeout(() => {
                    heroButtons.style.transition = 'all 0.6s ease';
                    heroButtons.style.opacity = '1';
                }, 500);
            }
        },

        setupCTAs() {
            const ctas = document.querySelectorAll('.btn--primary, .btn--secondary, .btn--cta');
            ctas.forEach(cta => {
                cta.addEventListener('click', (e) => {
                    const href = cta.getAttribute('href');
                    if (href && href !== '#') {
                        // Allow navigation
                    }
                });
            });
        }
    };

    // ============================================
    // ROADMAPS PAGE INTERACTIONS
    // ============================================

    const RoadmapsPage = {
        init() {
            this.animateCards();
            this.setupCardHover();
            Utils.log('RoadmapsPage initialized');
        },

        animateCards() {
            const cards = document.querySelectorAll('.roadmap-card');
            cards.forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    card.style.transition = 'all 0.5s ease';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, index * 100);
            });
        },

        setupCardHover() {
            const cards = document.querySelectorAll('.roadmap-card');
            cards.forEach(card => {
                card.addEventListener('mouseenter', () => {
                    const icon = card.querySelector('.roadmap-card__icon');
                    if (icon) {
                        icon.style.transform = 'scale(1.1)';
                        icon.style.transition = 'transform 0.3s ease';
                    }
                });
                card.addEventListener('mouseleave', () => {
                    const icon = card.querySelector('.roadmap-card__icon');
                    if (icon) {
                        icon.style.transform = 'scale(1)';
                    }
                });
            });
        }
    };

    // ============================================
    // ADD GLOBAL ANIMATION STYLES
    // ============================================

    function addGlobalStyles() {
        if (document.querySelector('#nextstep-global-styles')) return;

        const style = document.createElement('style');
        style.id = 'nextstep-global-styles';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(50px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes fall {
                to {
                    transform: translateY(100vh) rotate(360deg);
                    opacity: 0;
                }
            }
            
            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .step-content {
                animation: fadeIn 0.3s ease;
            }
            
            .navbar__nav {
                transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .drawer-overlay {
                transition: opacity 0.3s ease, visibility 0.3s ease;
            }
            
            .nextstep-toast {
                animation: slideInRight 0.3s ease;
            }
            
            .step-item {
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .roadmap-card {
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
        `;
        document.head.appendChild(style);
    }

    // ============================================
    // MAIN INITIALIZATION
    // ============================================

    function init() {
        Utils.log('NextStep System Initializing...');

        // Add global styles
        addGlobalStyles();

        // Detect page type
        PageDetector.detect();

        // Initialize navigation (always)
        Navigation.init();

        // Initialize page-specific features
        if (PageDetector.isHome()) {
            HomePage.init();
        } else if (PageDetector.isRoadmaps()) {
            RoadmapsPage.init();
        } else if (PageDetector.isRoadmap() && PageDetector.roadmapId) {
            RoadmapManager.init(PageDetector.roadmapId);
        }

        // Add keyboard shortcuts (optional)
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for search (future feature)
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                Toast.show('🔍 Search feature coming soon!', 'info');
            }
        });

        Utils.log('NextStep System Ready!');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
// ============================================
// FIX: Mobile Touch & Scroll Improvements
// تحسينات اللمس والتمرير على الجوالات
// ============================================

const MobileFixes = {
    init() {
        this.fixTouchEvents();
        this.fixCardClicks();
        this.fixScrollBehavior();
        Utils.log('MobileFixes initialized');
    },

    fixTouchEvents() {
        // تحسين استجابة اللمس على البطاقات
        const cards = document.querySelectorAll('.roadmap-card');
        cards.forEach(card => {
            card.addEventListener('touchstart', () => {
                card.style.transform = 'scale(0.98)';
            }, { passive: true });

            card.addEventListener('touchend', () => {
                setTimeout(() => {
                    card.style.transform = '';
                }, 150);
            }, { passive: true });
        });
    },

    fixCardClicks() {
        // منع التأخير عند الضغط على البطاقات
        const cardBtns = document.querySelectorAll('.roadmap-card .btn');
        cardBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const href = btn.getAttribute('href');
                if (href && href !== '#') {
                    window.location.href = href;
                }
            });
        });

        // الضغط على البطاقة نفسها يذهب إلى الرابط
        const cards = document.querySelectorAll('.roadmap-card');
        cards.forEach(card => {
            const btn = card.querySelector('.btn');
            const href = btn ? btn.getAttribute('href') : null;

            if (href && href !== '#') {
                card.style.cursor = 'pointer';
                card.addEventListener('click', (e) => {
                    if (e.target.tagName !== 'BUTTON' && !e.target.closest('.btn')) {
                        window.location.href = href;
                    }
                });
            }
        });
    },

    fixScrollBehavior() {
        // تحسين سلوك التمرير على iOS
        if ('scrollBehavior' in document.documentElement.style) {
            // Already supported
        } else {
            // Fallback for older browsers
            const smoothScrollLinks = document.querySelectorAll('a[href^="#"]');
            smoothScrollLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    const targetId = link.getAttribute('href');
                    if (targetId === '#') return;
                    const target = document.querySelector(targetId);
                    if (target) {
                        e.preventDefault();
                        target.scrollIntoView({ behavior: 'auto' });
                    }
                });
            });
        }

        // Fix for 100vh on mobile browsers
        const setVH = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };

        setVH();
        window.addEventListener('resize', setVH);
        window.addEventListener('orientationchange', setVH);
    }
};

