/**
 * ============================================================
 * NextStep | AI Assessment System
 * Version: 9.0.0 - Professional Edition
 * Features: 20 Questions | Direct Results | No Email
 * ============================================================
 */

(function () {
    'use strict';

    // ============================================================
    // CONFIGURATION
    // ============================================================

    let currentStep = 1;
    let totalSteps = 21; // 20 questions + 1 final
    let answers = {};
    let isSubmitting = false;

    // API URL
    const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000/api/assessment'
        : '/api/assessment';

    // ============================================================
    // DOM ELEMENTS
    // ============================================================

    const introScreen = document.getElementById('introScreen');
    const assessmentContainer = document.getElementById('assessmentContainer');
    const resultScreen = document.getElementById('resultScreen');
    const startBtn = document.getElementById('startBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');
    const currentStepNum = document.getElementById('currentStepNum');
    const totalStepsNum = document.getElementById('totalStepsNum');
    const questions = document.querySelectorAll('.question-card');
    const loadingMessage = document.getElementById('loadingMessage');
    const resultMessage = document.getElementById('resultMessage');
    const restartBtn = document.getElementById('restartBtn');

    // Set total steps
    if (totalStepsNum) totalStepsNum.textContent = totalSteps;

    // ============================================================
    // UI FUNCTIONS
    // ============================================================

    function updateProgress() {
        const percent = (currentStep / totalSteps) * 100;
        if (progressFill) progressFill.style.width = `${percent}%`;
        if (progressPercent) progressPercent.textContent = `${Math.round(percent)}%`;
        if (currentStepNum) currentStepNum.textContent = currentStep;
    }

    function showQuestion(step) {
        questions.forEach(question => {
            const questionStep = parseInt(question.dataset.step);
            if (questionStep === step) {
                question.classList.add('active');
                question.style.animation = 'fadeIn 0.4s ease';
            } else {
                question.classList.remove('active');
            }
        });
        updateProgress();
    }

    function updateButtons() {
        if (prevBtn) prevBtn.disabled = (currentStep === 1);

        if (nextBtn) {
            if (currentStep === totalSteps) {
                nextBtn.innerHTML = '<i class="fas fa-magic"></i> تحليل نتائجي';
                nextBtn.classList.add('btn-submit');
            } else {
                nextBtn.innerHTML = 'التالي <i class="fas fa-arrow-left"></i>';
                nextBtn.classList.remove('btn-submit');
            }
        }
    }

    function saveCurrentAnswer() {
        const currentQuestion = document.querySelector(`.question-card[data-step="${currentStep}"]`);
        if (currentQuestion) {
            const input = currentQuestion.querySelector('.question-input');
            if (input && input.value.trim()) {
                answers[`q${currentStep}`] = input.value.trim();
                saveToLocalStorage();
            }
        }
    }

    function loadAnswerForStep(step) {
        const question = document.querySelector(`.question-card[data-step="${step}"]`);
        if (question && answers[`q${step}`]) {
            const input = question.querySelector('.question-input');
            if (input) input.value = answers[`q${step}`];
        }
    }

    function saveToLocalStorage() {
        const data = { currentStep, answers, timestamp: new Date().toISOString() };
        localStorage.setItem('nextstep_assessment', JSON.stringify(data));
    }

    function loadFromLocalStorage() {
        const saved = localStorage.getItem('nextstep_assessment');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                const savedTime = new Date(data.timestamp);
                const now = new Date();
                const hoursDiff = (now - savedTime) / (1000 * 60 * 60);
                if (hoursDiff < 24) {
                    currentStep = data.currentStep;
                    answers = data.answers;
                    return true;
                }
            } catch (e) { }
        }
        return false;
    }

    function clearSavedProgress() {
        localStorage.removeItem('nextstep_assessment');
    }

    // ============================================================
    // VALIDATION
    // ============================================================

    function validateCurrentStep() {
        const currentQuestion = document.querySelector(`.question-card[data-step="${currentStep}"]`);
        if (!currentQuestion) return true;
        if (currentStep === totalSteps) return true;

        const input = currentQuestion.querySelector('.question-input');
        if (input && !input.value.trim()) {
            showToast('⚠️ الرجاء الإجابة على السؤال قبل المتابعة', 'error');
            input.focus();
            input.style.animation = 'shake 0.3s ease';
            setTimeout(() => { input.style.animation = ''; }, 300);
            return false;
        }
        return true;
    }

    function showToast(message, type = 'success') {
        const existingToast = document.querySelector('.assessment-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = `assessment-toast ${type === 'error' ? 'error' : ''}`;
        toast.innerHTML = `<i class="fas ${type === 'error' ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i><span>${message}</span>`;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ============================================================
    // NAVIGATION
    // ============================================================

    function nextStep() {
        if (!validateCurrentStep()) return;
        saveCurrentAnswer();

        if (currentStep < totalSteps) {
            currentStep++;
            showQuestion(currentStep);
            loadAnswerForStep(currentStep);
            updateButtons();

            setTimeout(() => {
                const activeQuestion = document.querySelector('.question-card.active');
                const input = activeQuestion?.querySelector('.question-input');
                if (input) input.focus();
            }, 100);
        }
        if (currentStep === totalSteps) updateButtons();
    }

    function prevStep() {
        if (currentStep > 1) {
            saveCurrentAnswer();
            currentStep--;
            showQuestion(currentStep);
            loadAnswerForStep(currentStep);
            updateButtons();
        }
    }

    // ============================================================
    // SUBMIT ASSESSMENT - DIRECT RESULTS
    // ============================================================

    async function submitAssessment() {
        if (isSubmitting) return;
        isSubmitting = true;

        saveCurrentAnswer();

        // Show result screen with loading
        if (assessmentContainer) assessmentContainer.style.display = 'none';
        if (resultScreen) {
            resultScreen.style.display = 'block';
            resultScreen.style.animation = 'fadeInUp 0.5s ease';
        }
        if (loadingMessage) loadingMessage.style.display = 'block';
        if (resultMessage) resultMessage.style.display = 'none';
        if (restartBtn) restartBtn.style.display = 'none';

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        const payload = {
            answers: answers,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };

        console.log('📤 Submitting assessment:', payload);

        let recommendation = null;
        let apiSuccess = false;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            console.log('📥 API Response:', result);

            if (result.success && result.data?.recommendation) {
                recommendation = result.data.recommendation;
                apiSuccess = true;
            } else {
                throw new Error('API returned no recommendation');
            }
        } catch (error) {
            console.warn('⚠️ API error, using fallback:', error);
            recommendation = generateLocalRecommendation();
        }

        // Clear saved progress
        clearSavedProgress();

        // Display results
        setTimeout(() => {
            if (loadingMessage) loadingMessage.style.display = 'none';
            if (resultMessage) {
                resultMessage.style.display = 'block';
                resultMessage.innerHTML = generateResultHTML(recommendation);
                resultMessage.style.animation = 'fadeIn 0.5s ease';
            }
            if (restartBtn) restartBtn.style.display = 'block';
            isSubmitting = false;
        }, 1500);
    }

    // ============================================================
    // GENERATE RESULT HTML
    // ============================================================

    function generateResultHTML(recommendation) {
        const roadmapSteps = (recommendation.roadmap || []).map((step, i) => `
            <li>
                <span class="roadmap-number">${i + 1}</span>
                <span>${step}</span>
            </li>
        `).join('');

        const resourcesItems = (recommendation.resources || []).map(resource => `
            <div class="resource-item">
                <i class="fas fa-book-open" style="color: var(--primary);"></i>
                <span>${resource}</span>
            </div>
        `).join('');

        return `
            <div class="result-path-card">
                <h3>🎯 ${recommendation.path || 'أساسيات البرمجة'}</h3>
                <p>📊 المستوى: ${recommendation.level || 'مبتدئ'}</p>
                <p>⏱️ الوقت المتوقع: ${recommendation.time || '2-3 أشهر'}</p>
            </div>
            
            <div class="result-section">
                <div class="result-section-title">
                    <i class="fas fa-map"></i>
                    <span>🗺️ خطة التعلم</span>
                </div>
                <ul class="roadmap-list">
                    ${roadmapSteps || '<li>لا توجد خطوات متاحة</li>'}
                </ul>
            </div>
            
            <div class="result-section">
                <div class="result-section-title">
                    <i class="fas fa-clock"></i>
                    <span>⏱️ الوقت المتوقع</span>
                </div>
                <p style="padding: var(--space-3); background: var(--bg-surface); border-radius: var(--radius-lg);">
                    <strong>${recommendation.time || '2-3 أشهر'}</strong> من التعلم المنتظم (10-15 ساعة أسبوعياً)
                </p>
            </div>
            
            <div class="result-section">
                <div class="result-section-title">
                    <i class="fas fa-graduation-cap"></i>
                    <span>📚 المصادر الموصى بها</span>
                </div>
                <div class="resources-grid">
                    ${resourcesItems || '<div class="resource-item">لا توجد مصادر متاحة</div>'}
                </div>
            </div>
            
            <div class="result-section">
                <div class="result-section-title">
                    <i class="fas fa-lightbulb"></i>
                    <span>💡 نصائح للنجاح</span>
                </div>
                <ul class="tips-list">
                    <li><i class="fas fa-check-circle" style="color: #10B981;"></i> مارس البرمجة يومياً، حتى لو 30 دقيقة</li>
                    <li><i class="fas fa-check-circle" style="color: #10B981;"></i> ابنِ مشاريع، لا تكتفِ بمشاهدة الدروس</li>
                    <li><i class="fas fa-check-circle" style="color: #10B981;"></i> انضم لمجتمعات المطورين</li>
                    <li><i class="fas fa-check-circle" style="color: #10B981;"></i> وثق رحلة تعلمك</li>
                    <li><i class="fas fa-check-circle" style="color: #10B981;"></i> لا تقارن تقدمك بالآخرين</li>
                </ul>
            </div>
        `;
    }

    // ============================================================
    // LOCAL RECOMMENDATION (FALLBACK)
    // ============================================================

    function generateLocalRecommendation() {
        const allAnswers = Object.values(answers).join(' ').toLowerCase();

        if (allAnswers.includes('frontend') || allAnswers.includes('website') || allAnswers.includes('html') || allAnswers.includes('css')) {
            return {
                path: "تطوير الواجهات الأمامية (Frontend Development)",
                level: "مبتدئ إلى متوسط",
                time: "4-6 أشهر",
                roadmap: [
                    "تعلم HTML5 - أساسيات بناء صفحات الويب",
                    "تعلم CSS3 - التنسيق والتخطيط (Flexbox, Grid)",
                    "تعلم JavaScript (ES6+) - أساسيات ومتقدم",
                    "تعلم React.js أو Vue.js - إطار عمل حديث",
                    "بناء 3-5 مشاريع عملية في محفظتك",
                    "التقديم على وظائف مبتدئ"
                ],
                resources: ["freeCodeCamp", "MDN Web Docs", "Frontend Mentor", "JavaScript.info"]
            };
        }

        if (allAnswers.includes('backend') || allAnswers.includes('server') || allAnswers.includes('database')) {
            return {
                path: "تطوير الواجهات الخلفية (Backend Development)",
                level: "متوسط",
                time: "5-8 أشهر",
                roadmap: [
                    "تعلم Node.js أو Python",
                    "تعلم Express.js أو Django",
                    "تعلم قواعد البيانات (SQL و MongoDB)",
                    "بناء RESTful APIs",
                    "تعلم JWT - المصادقة والأمان",
                    "نشر أول تطبيق خلفي"
                ],
                resources: ["Node.js Official Guide", "PostgreSQL Tutorial", "MongoDB University"]
            };
        }

        if (allAnswers.includes('mobile') || allAnswers.includes('flutter') || allAnswers.includes('android')) {
            return {
                path: "تطوير تطبيقات الموبايل (Mobile Development)",
                level: "متوسط",
                time: "6-9 أشهر",
                roadmap: [
                    "تعلم Dart - لغة البرمجة الأساسية",
                    "تعلم Flutter - إطار التطوير",
                    "بناء واجهات مستخدم باستخدام Widgets",
                    "إدارة الحالة (Provider, Bloc, GetX)",
                    "دمج APIs وقواعد البيانات",
                    "نشر التطبيقات على المتاجر"
                ],
                resources: ["Flutter Documentation", "Udemy Courses", "YouTube Tutorials"]
            };
        }

        return {
            path: "أساسيات البرمجة (Programming Fundamentals)",
            level: "مبتدئ",
            time: "2-3 أشهر",
            roadmap: [
                "مقدمة في البرمجة والتفكير المنطقي",
                "المتغيرات وأنواع البيانات",
                "الجمل الشرطية والحلقات",
                "الدوال والمصفوفات",
                "مشاريع عملية صغيرة",
                "اختيار مسار متخصص"
            ],
            resources: ["freeCodeCamp", "MDN Web Docs", "Codecademy", "W3Schools"]
        };
    }

    // ============================================================
    // START ASSESSMENT
    // ============================================================

    function startAssessment() {
        const hasProgress = loadFromLocalStorage();

        if (introScreen) introScreen.style.display = 'none';
        if (assessmentContainer) assessmentContainer.style.display = 'block';

        if (!hasProgress) {
            currentStep = 1;
            answers = {};
        }

        showQuestion(currentStep);
        loadAnswerForStep(currentStep);
        updateButtons();

        setTimeout(() => {
            const firstInput = document.querySelector('.question-card.active .question-input');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    // ============================================================
    // AUTO-SAVE ON INPUT
    // ============================================================

    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('question-input')) {
            const questionCard = e.target.closest('.question-card');
            if (questionCard) {
                const step = parseInt(questionCard.dataset.step);
                if (step && !isNaN(step)) {
                    answers[`q${step}`] = e.target.value.trim();
                    saveToLocalStorage();
                }
            }
        }
    });

    // ============================================================
    // EVENT LISTENERS
    // ============================================================

    if (startBtn) startBtn.addEventListener('click', startAssessment);
    if (prevBtn) prevBtn.addEventListener('click', prevStep);
    if (nextBtn) {
        nextBtn.addEventListener('click', function () {
            if (currentStep === totalSteps) {
                submitAssessment();
            } else {
                nextStep();
            }
        });
    }
    if (restartBtn) restartBtn.addEventListener('click', () => location.reload());

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (assessmentContainer && assessmentContainer.style.display === 'block') {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                if (currentStep === totalSteps) {
                    submitAssessment();
                } else {
                    nextStep();
                }
            } else if (e.key === 'ArrowRight' && currentStep > 1) {
                prevStep();
            } else if (e.key === 'ArrowLeft' && currentStep < totalSteps) {
                nextStep();
            }
        }
    });

    // ============================================================
    // SHAKE ANIMATION STYLE
    // ============================================================

    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
    `;
    document.head.appendChild(style);

    console.log('✅ Assessment System Ready - Total Steps:', totalSteps);

})();