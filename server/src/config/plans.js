export const PLANS = {
  FREE: {
    id: 'free',
    name: 'Free Starter',
    description: 'Essential AI study tools to organize notes and test basic recall.',
    priceINR: {
      monthly: 0,
      yearly: 0
    },
    limits: {
      maxDocumentsMonth: 5,
      maxQuizCountPerDoc: 5,
      aiCoachDailyRequests: 15,
      hasKnowledgeMap: true,
      hasMistakeBook: true,
      hasDailyReview: true,
      hasAdaptiveQuiz: true,
      hasFixWeakness: false // Premium 5-step deep learning remediation
    },
    features: [
      'Up to 5 document uploads / month',
      'AI summaries, notes & flashcards',
      'Practice quizzes (up to 5 questions)',
      'Knowledge Map visualization',
      'Basic Mistake Book tracking',
      'Daily Spaced Review queue'
    ]
  },
  PREMIUM: {
    id: 'premium',
    name: 'StudyDeck Pro',
    description: 'Complete AI Personal Learning Coach with unlimited documents and deep remediation.',
    priceINR: {
      monthly: 499,
      yearly: 4999, // ₹4999 / year (~17% discount)
      monthlyEquivalentYearly: 416
    },
    limits: {
      maxDocumentsMonth: 500,
      maxQuizCountPerDoc: 20,
      aiCoachDailyRequests: 500,
      hasKnowledgeMap: true,
      hasMistakeBook: true,
      hasDailyReview: true,
      hasAdaptiveQuiz: true,
      hasFixWeakness: true
    },
    features: [
      'Unlimited document uploads (up to 500/mo)',
      'Comprehensive quizzes (up to 20 questions)',
      '🔥 Fix My Weakness 5-step remediation',
      'Deep AI misconception diagnosis & root-cause analysis',
      'Continuous dynamic adaptive learning engine',
      'Interactive AI Tutor chat with high-throughput limits',
      'Priority AI processing & exportable PDF reports'
    ]
  }
};

export function getPlanLimits(plan = 'free') {
  if (plan === 'premium') return PLANS.PREMIUM.limits;
  return PLANS.FREE.limits;
}

