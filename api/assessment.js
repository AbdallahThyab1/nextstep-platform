/**
 * ============================================================
 * NextStep | AI Assessment API
 * Version: 10.0.0 - Professional Production Ready
 * Author: NextStep Team
 * Description: Advanced API with Google Gemini AI + Local Fallback
 * ============================================================
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// ============================================================
// INITIALIZE GOOGLE GEMINI AI
// ============================================================

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ============================================================
// MAIN HANDLER
// ============================================================

export default async function handler(req, res) {
    const startTime = Date.now();
    
    // Log request
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

    // ============================================================
    // 1. METHOD VALIDATION
    // ============================================================

    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed',
            message: 'هذا المسار يقبل فقط طلبات POST'
        });
    }

    // ============================================================
    // 2. REQUEST BODY VALIDATION
    // ============================================================

    try {
        const { answers, timestamp, userAgent } = req.body;

        // Answers validation
        if (!answers || typeof answers !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Answers are required',
                message: 'الرجاء الإجابة على جميع الأسئلة'
            });
        }

        const answerCount = Object.keys(answers).filter(key => key !== 'email').length;
        
        if (answerCount === 0) {
            return res.status(400).json({
                success: false,
                error: 'No answers provided',
                message: 'الرجاء الإجابة على سؤال واحد على الأقل'
            });
        }

        // ============================================================
        // 3. LOG SUBMISSION
        // ============================================================

        console.log('');
        console.log('='.repeat(70));
        console.log('📝 NEW ASSESSMENT SUBMISSION');
        console.log('='.repeat(70));
        console.log(`🕐 Timestamp    : ${timestamp || new Date().toISOString()}`);
        console.log(`📊 Answers      : ${answerCount} questions answered`);
        console.log(`🌐 User Agent   : ${userAgent || 'Unknown'}`);
        console.log('='.repeat(70));
        console.log('');

        // ============================================================
        // 4. GENERATE AI RECOMMENDATION (Google Gemini)
        // ============================================================

        console.log('🤖 AI Analyzing answers with Google Gemini...');
        
        let recommendation;
        let aiError = false;
        let aiResponseTime = 0;
        
        const aiStartTime = Date.now();
        
        try {
            recommendation = await generateAIRecommendation(answers);
            aiResponseTime = Date.now() - aiStartTime;
            console.log(`✅ AI Analysis completed in ${aiResponseTime}ms`);
            console.log(`📊 Path        : ${recommendation.path}`);
            console.log(`📈 Level       : ${recommendation.level}`);
            console.log(`⏱️ Time        : ${recommendation.time}`);
        } catch (error) {
            aiResponseTime = Date.now() - aiStartTime;
            console.error(`❌ AI Error (${aiResponseTime}ms):`, error.message);
            aiError = true;
            recommendation = getFallbackRecommendation(answers);
            console.log(`🔄 Using fallback recommendation: ${recommendation.path}`);
        }
        
        console.log('');

        // ============================================================
        // 5. SUCCESS RESPONSE
        // ============================================================

        const totalTime = Date.now() - startTime;
        const submissionId = generateSubmissionId();

        return res.status(200).json({
            success: true,
            message: 'تم تحليل إجاباتك بنجاح!',
            data: {
                submissionId,
                answersCount: answerCount,
                receivedAt: new Date().toISOString(),
                processingTime: totalTime,
                aiUsed: !aiError,
                aiResponseTime: aiResponseTime,
                recommendation: {
                    path: recommendation.path,
                    level: recommendation.level,
                    estimatedTime: recommendation.time,
                    roadmap: recommendation.roadmap,
                    resources: recommendation.resources
                }
            }
        });

    } catch (error) {
        console.error('❌ Fatal error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'حدث خطأ ما. الرجاء المحاولة مرة أخرى لاحقاً'
        });
    }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function generateSubmissionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `sub_${timestamp}_${random}`;
}

// ============================================================
// AI RECOMMENDATION ENGINE (Google Gemini)
// ============================================================

async function generateAIRecommendation(answers) {
    // Prepare answers as text
    const answersText = Object.entries(answers)
        .filter(([key]) => key !== 'email')
        .map(([key, value]) => `السؤال ${key.replace('q', '')}: ${value}`)
        .join('\n\n');

    const prompt = `أنت مستشار مهني متخصص في مجال البرمجة والتقنية مع خبرة 10 سنوات.

بناءً على إجابات المستخدم التالية، قم بتقديم خطة تعلم شخصية ومخصصة.

إجابات المستخدم:
${answersText}

قم بإرجاع JSON فقط بالهيكل التالي (بدون أي نص إضافي):
{
    "path": "اسم المسار بالعربية (مثلاً: تطوير الواجهات الأمامية)",
    "level": "المستوى (مبتدئ / متوسط / متقدم)",
    "time": "الوقت المتوقع (مثلاً: 4-6 أشهر)",
    "roadmap": ["خطوة 1", "خطوة 2", "خطوة 3", "خطوة 4", "خطوة 5", "خطوة 6"],
    "resources": ["مورد 1", "مورد 2", "مورد 3", "مورد 4"]
}

كن دقيقاً ومفيداً. استخدم لغة عربية فصيحة وواضحة.`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        const aiRecommendation = JSON.parse(jsonMatch[0]);
        return {
            path: aiRecommendation.path || "أساسيات البرمجة",
            level: aiRecommendation.level || "مبتدئ",
            time: aiRecommendation.time || "3-4 أشهر",
            roadmap: aiRecommendation.roadmap || [
                "مقدمة في البرمجة والتفكير المنطقي",
                "المتغيرات وأنواع البيانات",
                "الجمل الشرطية والحلقات",
                "الدوال والمصفوفات",
                "مشاريع عملية",
                "اختيار مسار متخصص"
            ],
            resources: aiRecommendation.resources || [
                "freeCodeCamp",
                "MDN Web Docs",
                "JavaScript.info",
                "Coursera"
            ]
        };
    }
    
    throw new Error("Failed to parse AI response");
}

// ============================================================
// FALLBACK RECOMMENDATION (when AI fails)
// ============================================================

function getFallbackRecommendation(answers) {
    const allAnswers = Object.values(answers).join(' ').toLowerCase();
    
    // Frontend Development
    if (containsKeywords(allAnswers, ['frontend', 'website', 'design', 'html', 'css', 'ui', 'ux', 'react', 'vue', 'واجهات', 'تصميم'])) {
        return {
            path: "تطوير الواجهات الأمامية (Frontend Development)",
            level: "مبتدئ إلى متوسط",
            time: "4-6 أشهر",
            roadmap: [
                "HTML5 - تعلم أساسيات بناء صفحات الويب والدلالية",
                "CSS3 - تنسيق متقدم (Flexbox, Grid, Animations)",
                "JavaScript (ES6+) - أساسيات ومتقدم",
                "React.js أو Vue.js - إطار عمل حديث",
                "بناء 3-5 مشاريع عملية في محفظتك",
                "التقديم على وظائف مبتدئ"
            ],
            resources: [
                "freeCodeCamp - Responsive Web Design",
                "MDN Web Docs - الدليل الكامل",
                "Frontend Mentor - تمارين عملية",
                "JavaScript.info - تعلم JavaScript"
            ]
        };
    }
    
    // Backend Development
    if (containsKeywords(allAnswers, ['backend', 'server', 'database', 'api', 'node', 'express', 'sql', 'خادم', 'قاعدة بيانات'])) {
        return {
            path: "تطوير الواجهات الخلفية (Backend Development)",
            level: "متوسط",
            time: "5-8 أشهر",
            roadmap: [
                "Node.js أو Python - لغة برمجة خلفية",
                "Express.js أو Django - إطار عمل للـ API",
                "قواعد البيانات (SQL و MongoDB)",
                "بناء RESTful APIs احترافية",
                "JWT - المصادقة والأمان",
                "نشر أول تطبيق خلفي على الإنترنت",
                "مشروع متكامل للواجهات الخلفية"
            ],
            resources: [
                "Node.js Official Guide",
                "PostgreSQL Tutorial",
                "MongoDB University",
                "REST API Design Best Practices"
            ]
        };
    }
    
    // Full Stack Development
    if (containsKeywords(allAnswers, ['full stack', 'fullstack', 'frontend and backend', 'both', 'متكامل'])) {
        return {
            path: "تطوير متكامل (Full-Stack Development)",
            level: "متوسط إلى متقدم",
            time: "8-12 أشهر",
            roadmap: [
                "أساسيات الواجهات الأمامية (HTML, CSS, JS)",
                "أساسيات الواجهات الخلفية (Node.js, Express)",
                "إطار عمل للواجهات الأمامية (React)",
                "قواعد البيانات (PostgreSQL أو MongoDB)",
                "مشاريع متكاملة (MERN/MEAN stack)",
                "أساسيات النشر و DevOps",
                "بناء محفظة متكاملة"
            ],
            resources: [
                "The Odin Project - Full Stack JavaScript",
                "Full Stack Open - جامعة هلسنكي",
                "Traversy Media - MERN Stack"
            ]
        };
    }
    
    // Mobile Development
    if (containsKeywords(allAnswers, ['mobile', 'flutter', 'android', 'ios', 'react native', 'موبايل', 'جوال'])) {
        return {
            path: "تطوير تطبيقات الموبايل (Mobile Development)",
            level: "متوسط",
            time: "6-9 أشهر",
            roadmap: [
                "Dart (لـ Flutter) أو Kotlin/Swift",
                "أساسيات Flutter Framework",
                "بناء واجهات مستخدم باستخدام Widgets",
                "إدارة الحالة (Provider, Bloc, GetX)",
                "دمج APIs وقواعد البيانات",
                "نشر التطبيقات على المتاجر",
                "تطبيق متكامل للتخرج"
            ],
            resources: [
                "Flutter Official Documentation",
                "Udemy - Flutter Course",
                "YouTube - Flutter tutorials"
            ]
        };
    }
    
    // Data Science
    if (containsKeywords(allAnswers, ['data', 'analysis', 'python', 'machine learning', 'ml', 'ai', 'بيانات', 'تحليل'])) {
        return {
            path: "علوم البيانات والذكاء الاصطناعي (Data Science)",
            level: "متوسط",
            time: "9-12 أشهر",
            roadmap: [
                "Python - لغة البرمجة الأساسية",
                "Pandas و NumPy - معالجة البيانات",
                "Matplotlib - تصور البيانات",
                "SQL المتقدم لاستعلامات البيانات",
                "تعلم الآلة (Scikit-learn)",
                "مشاريع تحليل بيانات حقيقية",
                "بناء محفظة علوم بيانات"
            ],
            resources: [
                "Kaggle - Learn",
                "DataCamp - Data Science Track",
                "Python for Data Analysis Book"
            ]
        };
    }
    
    // DevOps
    if (containsKeywords(allAnswers, ['devops', 'cloud', 'docker', 'kubernetes', 'aws', 'azure', 'ci/cd', 'سحابة'])) {
        return {
            path: "DevOps والبنية التحتية (DevOps & Cloud)",
            level: "متقدم",
            time: "8-10 أشهر",
            roadmap: [
                "أساسيات Linux",
                "Git متقدم و GitHub Actions",
                "CI/CD Pipelines (Jenkins, GitLab CI)",
                "Docker و Kubernetes",
                "منصات سحابية (AWS/GCP/Azure)",
                "Infrastructure as Code (Terraform)",
                "مراقبة الأنظمة (Prometheus, Grafana)"
            ],
            resources: [
                "Linux Journey",
                "Docker Documentation",
                "Kubernetes Tutorial",
                "AWS Training - Cloud Practitioner"
            ]
        };
    }
    
    // Game Development
    if (containsKeywords(allAnswers, ['game', 'unity', 'unreal', 'gaming', '3d', '2d', 'لعبة', 'ألعاب'])) {
        return {
            path: "تطوير الألعاب (Game Development)",
            level: "متوسط",
            time: "8-12 أشهر",
            roadmap: [
                "لغة C# أو C++",
                "محرك Unity أو Unreal Engine",
                "أساسيات تصميم الألعاب",
                "بناء ألعاب 2D و 3D",
                "تحسين أداء الألعاب",
                "نشر الألعاب على المتاجر",
                "إنشاء محفظة ألعاب"
            ],
            resources: [
                "Unity Learn - Official Courses",
                "Unreal Engine Documentation",
                "GameDev.tv - Complete Courses",
                "YouTube - Brackeys (Unity tutorials)"
            ]
        };
    }
    
    // Cybersecurity
    if (containsKeywords(allAnswers, ['security', 'cybersecurity', 'hacking', 'penetration', 'ethical', 'أمن', 'سيبراني'])) {
        return {
            path: "الأمن السيبراني (Cybersecurity)",
            level: "متوسط إلى متقدم",
            time: "8-12 أشهر",
            roadmap: [
                "أساسيات الشبكات و Linux",
                "أمن الويب والثغرات الشائعة (OWASP)",
                "أدوات الاختراق الأخلاقي (Kali Linux)",
                "التشفير وأمن البيانات",
                "تحليل الثغرات واختبار الاختراق",
                "شهادات مهنية (CEH, Security+)",
                "مشاريع عملية في الأمن السيبراني"
            ],
            resources: [
                "TryHackMe - تعلم عملي",
                "Hack The Box - تحديات",
                "OWASP Top 10",
                "Cybrary - دورات مجانية"
            ]
        };
    }
    
    // Desktop Development
    if (containsKeywords(allAnswers, ['desktop', 'winforms', 'wpf', 'c#', '.net', 'qt', 'سطح المكتب'])) {
        return {
            path: "تطوير تطبيقات سطح المكتب (Desktop Development)",
            level: "متوسط",
            time: "6-8 أشهر",
            roadmap: [
                "لغة C# أو Java أو Python",
                "إطارات عمل (WPF, WinForms, JavaFX, Qt)",
                "قواعد بيانات محلية (SQLite)",
                "واجهات مستخدم غنية",
                "أساسيات التزامن (Threading)",
                "نشر التطبيقات (Installer)",
                "مشروع نظام متكامل"
            ],
            resources: [
                "Microsoft Learn - C#",
                "WPF Documentation",
                "Qt Documentation",
                "JavaFX Tutorials"
            ]
        };
    }
    
    // Default - Programming Fundamentals
    return {
        path: "أساسيات البرمجة (Programming Fundamentals)",
        level: "مبتدئ",
        time: "2-3 أشهر",
        roadmap: [
            "مقدمة في البرمجة والتفكير المنطقي",
            "المتغيرات وأنواع البيانات",
            "الجمل الشرطية (if/else, switch)",
            "الحلقات التكرارية (for, while)",
            "الدوال (Functions)",
            "المصفوفات (Arrays)",
            "مشاريع عملية صغيرة",
            "اختيار مسار متخصص"
        ],
        resources: [
            "freeCodeCamp - البرمجة للمبتدئين",
            "MDN Web Docs - أساسيات JavaScript",
            "Coursera - مقدمة في البرمجة",
            "Codecademy - تعلم البرمجة"
        ]
    };
}

function containsKeywords(text, keywords) {
    return keywords.some(keyword => text.includes(keyword));
}