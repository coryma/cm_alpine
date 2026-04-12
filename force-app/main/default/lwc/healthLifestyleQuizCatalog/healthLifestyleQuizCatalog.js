const QUIZ_STEP_ORDER = Object.freeze(['goal', 'rhythm', 'preference', 'format', 'support']);
const QUIZ_STEP_COUNT = QUIZ_STEP_ORDER.length;

const QUESTIONS = Object.freeze({
    goal: {
        key: 'goal',
        index: 1,
        eyebrow: '健康目標',
        title: '你現在最想先改善哪個部分？',
        subtitle: '選你現在最有感的需求，推薦會更準確。',
        options: [
            createOption({
                value: 'energy',
                title: '白天更有精神',
                note: '想讓白天更有精神和體力',
                tags: ['energy', 'focus', 'daily', 'portable'],
                bundleWord: '活力',
                summaryLead: '先把白天的精神和體力補回來',
                iconKey: 'goal-energy',
                artwork: { motif: 'sunrise', primary: '#0f766e', secondary: '#99f6e4', accent: '#f97316' }
            }),
            createOption({
                value: 'balance',
                title: '作息更規律',
                note: '想讓飲食和日常習慣更規律',
                tags: ['balance', 'nutrition', 'ritual', 'daily'],
                bundleWord: '均衡',
                summaryLead: '先把日常飲食和習慣規律起來',
                iconKey: 'goal-balance',
                artwork: { motif: 'leaf', primary: '#14532d', secondary: '#86efac', accent: '#facc15' }
            }),
            createOption({
                value: 'recovery',
                title: '運動後恢復',
                note: '運動後或久坐後想好好放鬆一下',
                tags: ['recovery', 'performance', 'fitness'],
                bundleWord: '恢復',
                summaryLead: '以身體放鬆和循環恢復為主',
                iconKey: 'goal-recovery',
                artwork: { motif: 'pulse', primary: '#7c3aed', secondary: '#c4b5fd', accent: '#fb7185' }
            }),
            createOption({
                value: 'sleep',
                title: '晚上好入睡',
                note: '想讓夜晚更放鬆、更好入睡',
                tags: ['calm', 'rest', 'home'],
                bundleWord: '放鬆',
                summaryLead: '先讓夜晚的放鬆習慣建立起來',
                iconKey: 'goal-sleep',
                artwork: { motif: 'moon', primary: '#1e293b', secondary: '#93c5fd', accent: '#f8fafc' }
            }),
            createOption({
                value: 'light',
                title: '輕鬆不費力',
                note: '不想太複雜，容易持續最重要',
                tags: ['light', 'balance', 'portable'],
                bundleWord: '輕鬆',
                summaryLead: '用低負擔的方式，一步一步建立習慣',
                iconKey: 'goal-light',
                artwork: { motif: 'arc', primary: '#0f766e', secondary: '#a7f3d0', accent: '#fde68a' }
            }),
            createOption({
                value: 'care',
                title: '養成照顧自己的習慣',
                note: '想固定花一點時間好好關心自己',
                tags: ['daily', 'ritual', 'calm'],
                bundleWord: '保養',
                summaryLead: '讓照顧自己成為每天固定的一件事',
                iconKey: 'goal-care',
                artwork: { motif: 'glow', primary: '#9d174d', secondary: '#fbcfe8', accent: '#f59e0b' }
            })
        ]
    },
    rhythm: {
        key: 'rhythm',
        index: 2,
        eyebrow: '生活型態',
        title: '你的日常比較像哪一種狀態？',
        subtitle: '同樣想顧健康，生活型態不同，適合的方式也完全不一樣。',
        options: [
            createOption({
                value: 'office',
                title: '久坐工作族',
                note: '長時間盯螢幕、步調緊、容易忘記照顧自己',
                tags: ['focus', 'daily', 'ritual'],
                bundleWord: '上班族',
                summaryLead: '要能自然融入長時間的工作行程',
                iconKey: 'rhythm-office',
                artwork: { motif: 'grid', primary: '#1d4ed8', secondary: '#bfdbfe', accent: '#f97316' }
            }),
            createOption({
                value: 'commute',
                title: '通勤移動族',
                note: '時間很零碎，外出時也要能繼續',
                tags: ['portable', 'energy', 'hydration'],
                bundleWord: '通勤族',
                summaryLead: '要夠俐落，外出也不容易中斷',
                iconKey: 'rhythm-commute',
                artwork: { motif: 'stride', primary: '#0f766e', secondary: '#67e8f9', accent: '#facc15' }
            }),
            createOption({
                value: 'training',
                title: '規律運動族',
                note: '想讓訓練、休息和補充更完整',
                tags: ['fitness', 'performance', 'recovery'],
                bundleWord: '運動族',
                summaryLead: '要能支撐訓練前後和恢復狀態',
                iconKey: 'rhythm-training',
                artwork: { motif: 'pulse', primary: '#dc2626', secondary: '#fecaca', accent: '#fb7185' }
            }),
            createOption({
                value: 'lateNight',
                title: '晚睡趕工型',
                note: '白天忙、晚上還在趕，一直覺得很累',
                tags: ['rest', 'calm', 'recovery'],
                bundleWord: '夜貓族',
                summaryLead: '先從晚間狀態和睡前習慣下手',
                iconKey: 'rhythm-lateNight',
                artwork: { motif: 'moon', primary: '#312e81', secondary: '#c4b5fd', accent: '#f9fafb' }
            }),
            createOption({
                value: 'home',
                title: '居家生活型',
                note: '喜歡在家裡慢慢建立自己的習慣',
                tags: ['home', 'calm', 'nutrition'],
                bundleWord: '居家族',
                summaryLead: '適合從居家空間和固定習慣下手',
                iconKey: 'rhythm-home',
                artwork: { motif: 'home', primary: '#854d0e', secondary: '#fde68a', accent: '#fb7185' }
            }),
            createOption({
                value: 'family',
                title: '家庭照顧型',
                note: '不只照顧自己，也要兼顧家人的生活',
                tags: ['nutrition', 'daily', 'home'],
                bundleWord: '家庭',
                summaryLead: '要兼顧效率、實用和容易堅持',
                iconKey: 'rhythm-family',
                artwork: { motif: 'droplet', primary: '#0f766e', secondary: '#ccfbf1', accent: '#fb7185' }
            })
        ]
    },
    preference: {
        key: 'preference',
        index: 3,
        eyebrow: '使用偏好',
        title: '你習慣用哪種方式開始？',
        subtitle: '讓推薦更符合你的習慣，而不只是理想化的建議。',
        options: [
            createOption({
                value: 'grabAndGo',
                title: '越快開始越好',
                note: '拿了就能用，不需要特別準備',
                tags: ['portable', 'daily', 'light'],
                bundleWord: '即開即用',
                summaryLead: '先從最容易上手的選項開始',
                iconKey: 'preference-grabAndGo',
                artwork: { motif: 'stride', primary: '#0f766e', secondary: '#99f6e4', accent: '#f97316' }
            }),
            createOption({
                value: 'visibleResults',
                title: '想要感受明顯一點',
                note: '效果要夠明顯，才會想一直用',
                tags: ['performance', 'energy', 'recovery'],
                bundleWord: '有感',
                summaryLead: '選感受明顯的，更容易維持動力',
                iconKey: 'preference-visibleResults',
                artwork: { motif: 'glow', primary: '#be123c', secondary: '#fecdd3', accent: '#facc15' }
            }),
            createOption({
                value: 'homeComfort',
                title: '想讓家更舒適',
                note: '想從家裡的環境和氛圍開始改變',
                tags: ['home', 'calm', 'rest'],
                bundleWord: '居家舒適',
                summaryLead: '先讓居家空間的氛圍變成你的助力',
                iconKey: 'preference-homeComfort',
                artwork: { motif: 'home', primary: '#7c2d12', secondary: '#fed7aa', accent: '#f472b6' }
            }),
            createOption({
                value: 'steadyRitual',
                title: '養成固定習慣',
                note: '想要每天都能自然重複的安排',
                tags: ['ritual', 'nutrition', 'daily'],
                bundleWord: '固定習慣',
                summaryLead: '讓照顧自己變成每天的固定節奏',
                iconKey: 'preference-steadyRitual',
                artwork: { motif: 'leaf', primary: '#166534', secondary: '#bbf7d0', accent: '#f59e0b' }
            }),
            createOption({
                value: 'lightRoutine',
                title: '輕鬆不勉強',
                note: '不想太複雜，能融入生活就好',
                tags: ['light', 'balance', 'portable'],
                bundleWord: '輕鬆入手',
                summaryLead: '保留彈性，先求做得到',
                iconKey: 'preference-lightRoutine',
                artwork: { motif: 'arc', primary: '#0f766e', secondary: '#bfdbfe', accent: '#fde68a' }
            }),
            createOption({
                value: 'outdoorMove',
                title: '出門也要繼續',
                note: '外出、運動或通勤時都要方便使用',
                tags: ['portable', 'hydration', 'fitness'],
                bundleWord: '外出攜帶',
                summaryLead: '以方便攜帶、不中斷為第一優先',
                iconKey: 'preference-outdoorMove',
                artwork: { motif: 'droplet', primary: '#0f766e', secondary: '#67e8f9', accent: '#f97316' }
            })
        ]
    },
    format: {
        key: 'format',
        index: 4,
        eyebrow: '偏好形式',
        title: '你比較願意從哪種形式開始？',
        subtitle: '先從最容易上手的開始，比一次想得太完整更有用。',
        options: [
            createOption({
                value: 'drink',
                title: '飲品 / 隨手喝水',
                note: '外出或工作時都能直接使用',
                tags: ['hydration', 'portable', 'energy'],
                bundleWord: '飲品',
                summaryLead: '先從最容易入口的日常補水開始',
                iconKey: 'format-drink',
                artwork: { motif: 'droplet', primary: '#0f766e', secondary: '#99f6e4', accent: '#f8fafc' }
            }),
            createOption({
                value: 'snack',
                title: '即食 / 隨手補充',
                note: '拿了就吃，不需要特別備料',
                tags: ['portable', 'light', 'energy'],
                bundleWord: '即食',
                summaryLead: '讓補充更俐落，不容易忘記',
                iconKey: 'format-snack',
                artwork: { motif: 'sunrise', primary: '#f97316', secondary: '#fde68a', accent: '#ffffff' }
            }),
            createOption({
                value: 'kitchen',
                title: '搭配日常餐食',
                note: '自然融入早餐或家裡的飲食習慣',
                tags: ['nutrition', 'home', 'ritual'],
                bundleWord: '餐食',
                summaryLead: '從每天都會發生的飲食習慣切入',
                iconKey: 'format-kitchen',
                artwork: { motif: 'leaf', primary: '#166534', secondary: '#dcfce7', accent: '#f59e0b' }
            }),
            createOption({
                value: 'device',
                title: '居家舒緩小物',
                note: '從環境和身體感受開始調整',
                tags: ['home', 'calm', 'recovery'],
                bundleWord: '舒緩',
                summaryLead: '先從身體舒適度和居家空間下手',
                iconKey: 'format-device',
                artwork: { motif: 'home', primary: '#7c3aed', secondary: '#ddd6fe', accent: '#fb7185' }
            }),
            createOption({
                value: 'tool',
                title: '隨時看得到的小工具',
                note: '放桌上或包包裡，自然形成提醒',
                tags: ['daily', 'ritual', 'hydration'],
                bundleWord: '小工具',
                summaryLead: '讓提醒自然出現在你眼前',
                iconKey: 'format-tool',
                artwork: { motif: 'grid', primary: '#1d4ed8', secondary: '#dbeafe', accent: '#facc15' }
            }),
            createOption({
                value: 'gear',
                title: '運動 / 恢復裝備',
                note: '讓運動前後的狀態都能照顧到',
                tags: ['fitness', 'recovery', 'performance'],
                bundleWord: '裝備',
                summaryLead: '用工具讓訓練和恢復更完整',
                iconKey: 'format-gear',
                artwork: { motif: 'pulse', primary: '#b91c1c', secondary: '#fecaca', accent: '#ffffff' }
            })
        ]
    },
    support: {
        key: 'support',
        index: 5,
        eyebrow: '期待感受',
        title: '你最希望它帶來什麼感受？',
        subtitle: '最後一題，決定這套推薦偏向提振、穩定還是放鬆。',
        options: [
            createOption({
                value: 'clear',
                title: '清爽一點',
                note: '希望整體感覺更清新、不那麼沉重',
                tags: ['light', 'hydration', 'focus'],
                bundleWord: '清爽',
                summaryLead: '偏向輕盈清爽的日常感',
                iconKey: 'support-clear',
                artwork: { motif: 'arc', primary: '#0ea5e9', secondary: '#dbeafe', accent: '#ffffff' }
            }),
            createOption({
                value: 'steady',
                title: '穩定一點',
                note: '重點是規律、能長期堅持',
                tags: ['balance', 'daily', 'ritual'],
                bundleWord: '穩定',
                summaryLead: '先把節奏穩下來，再慢慢進步',
                iconKey: 'support-steady',
                artwork: { motif: 'grid', primary: '#334155', secondary: '#cbd5e1', accent: '#f8fafc' }
            }),
            createOption({
                value: 'comfort',
                title: '舒服一點',
                note: '想讓身體和生活空間都更舒適',
                tags: ['home', 'calm', 'rest'],
                bundleWord: '舒適',
                summaryLead: '先把壓力降下來，整體更舒服',
                iconKey: 'support-comfort',
                artwork: { motif: 'home', primary: '#854d0e', secondary: '#fde68a', accent: '#ffffff' }
            }),
            createOption({
                value: 'motivate',
                title: '有動力一點',
                note: '想要感受夠明顯，更能激勵自己繼續',
                tags: ['performance', 'energy', 'fitness'],
                bundleWord: '有活力',
                summaryLead: '用感受明顯的方式把動力帶起來',
                iconKey: 'support-motivate',
                artwork: { motif: 'glow', primary: '#be123c', secondary: '#fecdd3', accent: '#facc15' }
            }),
            createOption({
                value: 'simple',
                title: '簡單一點',
                note: '步驟越少越好，做得到最重要',
                tags: ['light', 'portable', 'daily'],
                bundleWord: '簡單',
                summaryLead: '幾乎不增加額外的負擔',
                iconKey: 'support-simple',
                artwork: { motif: 'stride', primary: '#0f766e', secondary: '#ccfbf1', accent: '#ffffff' }
            }),
            createOption({
                value: 'restore',
                title: '修復一點',
                note: '比較需要放鬆、恢復和重新調整',
                tags: ['recovery', 'rest', 'calm'],
                bundleWord: '修復',
                summaryLead: '先把身體和狀態好好修整回來',
                iconKey: 'support-restore',
                artwork: { motif: 'moon', primary: '#312e81', secondary: '#ddd6fe', accent: '#ffffff' }
            })
        ]
    }
});

const PRODUCT_TAG_RULES = Object.freeze([
    { keywords: ['按摩', '恢復', '熱敷', '放鬆', 'massage', 'recovery'], tags: ['recovery', 'performance', 'fitness', 'calm'] },
    { keywords: ['水瓶', '水壺', '保冰', '瓶', 'hydration', 'bottle'], tags: ['hydration', 'portable', 'daily', 'light'] },
    { keywords: ['香氛', '抱枕', '毯', 'blanket', 'aroma', 'sleep'], tags: ['calm', 'rest', 'home'] },
    { keywords: ['鍋', '餐廚', '燕麥', '穀物', '營養', 'nutrition', 'breakfast', 'protein'], tags: ['nutrition', 'ritual', 'home', 'balance'] },
    { keywords: ['循環扇', '靜音', '居家', 'home'], tags: ['home', 'calm', 'rest'] },
    { keywords: ['運動', '健身', '機能', 'fitness', 'energy'], tags: ['fitness', 'performance', 'energy'] },
    { keywords: ['耳機', '平板', '投影', 'focus'], tags: ['focus', 'daily', 'home'] }
]);

const CATEGORY_TAG_RULES = Object.freeze([
    { keywords: ['energy', '運動', '機能'], tags: ['energy', 'fitness', 'portable'] },
    { keywords: ['nutrition', '營養', '穀物', 'blends'], tags: ['nutrition', 'balance', 'ritual'] },
    { keywords: ['健康', '保健'], tags: ['recovery', 'daily', 'balance'] },
    { keywords: ['居家'], tags: ['home', 'calm', 'rest'] },
    { keywords: ['餐廚'], tags: ['nutrition', 'home', 'ritual'] },
    { keywords: ['運動戶外'], tags: ['portable', 'hydration', 'fitness'] }
]);

const ROLE_LABELS = Object.freeze({
    recovery: '放鬆恢復',
    performance: '提振狀態',
    hydration: '隨時補水',
    portable: '外出必備',
    nutrition: '日常飲食',
    ritual: '養成習慣',
    calm: '夜晚放鬆',
    rest: '舒緩身體',
    home: '居家首選',
    balance: '均衡調整',
    focus: '專注清晰',
    light: '輕鬆入門',
    energy: '補充活力',
    fitness: '運動輔助',
    daily: '每天使用'
});

const TAG_REASON_COPY = Object.freeze({
    recovery: '很適合你現在需要的身體放鬆和恢復。',
    performance: '符合你想要感受明顯、維持好狀態的需求。',
    hydration: '讓補水這件事更容易每天做到。',
    portable: '外出、通勤或移動時都不容易中斷。',
    nutrition: '先把日常飲食和健康基礎補起來。',
    ritual: '很適合放進每天固定的早晚習慣裡。',
    calm: '幫助放慢夜晚節奏，讓身體更容易放鬆。',
    rest: '對高度消耗或疲勞之後的恢復很有幫助。',
    home: '可以自然融入你的居家日常，不需要特別費心。',
    balance: '走穩定調整的路線，比較容易長期堅持。',
    focus: '有助於維持白天的專注力和清晰感。',
    light: '負擔低、容易上手，不容易半途而廢。',
    energy: '比較能對應你現在需要的精力和體力。',
    fitness: '讓運動前後的狀態都能照顧到。',
    daily: '不是偶爾用，而是真的能融入每一天。'
});

const INTRO_ARTWORK = createIllustration({
    motif: 'hero',
    primary: '#0f766e',
    secondary: '#99f6e4',
    accent: '#f97316'
});

const OPTION_LOOKUP = buildOptionLookup();
const ICON_URLS = buildIconUrlLookup();

export { INTRO_ARTWORK, QUIZ_STEP_COUNT, QUIZ_STEP_ORDER, QUESTIONS as QUIZ_QUESTIONS };

export function getQuestion(questionKey) {
    return QUESTIONS[questionKey];
}

export function getOption(questionKey, optionValue) {
    return OPTION_LOOKUP[`${normalizeString(questionKey)}:${normalizeString(optionValue)}`] || null;
}

export function getAnswerHighlights(answers) {
    return QUIZ_STEP_ORDER.map((stepKey) => {
        const option = getOption(stepKey, answers?.[stepKey]);
        if (!option) {
            return null;
        }

        return {
            stepKey,
            stepNumber: QUESTIONS[stepKey].index,
            eyebrow: QUESTIONS[stepKey].eyebrow,
            title: option.title,
            note: option.note,
            iconKey: option.iconKey,
            artwork: option.artwork
        };
    }).filter((item) => item);
}

export function getQuizIconUrl(iconKey, fallbackLabel = '健康') {
    return ICON_URLS[normalizeString(iconKey)] || createIllustration({
        motif: 'hero',
        primary: '#0f766e',
        secondary: '#ccfbf1',
        accent: '#f97316',
        label: fallbackLabel
    });
}

export function inferProductTags(product) {
    const searchableText = [
        product?.name,
        product?.category,
        product?.shortDescription,
        ...(product?.featureHighlights || []),
        ...(product?.badges || [])
    ]
        .filter((value) => value)
        .join(' ')
        .toLowerCase();

    const tags = new Set();

    PRODUCT_TAG_RULES.forEach((rule) => {
        if (rule.keywords.some((keyword) => searchableText.includes(keyword.toLowerCase()))) {
            rule.tags.forEach((tag) => tags.add(tag));
        }
    });

    const categoryText = normalizeString(product?.category).toLowerCase();
    CATEGORY_TAG_RULES.forEach((rule) => {
        if (rule.keywords.some((keyword) => categoryText.includes(keyword.toLowerCase()))) {
            rule.tags.forEach((tag) => tags.add(tag));
        }
    });

    if (!tags.size) {
        tags.add('daily');
    }

    return Array.from(tags);
}

export function buildHealthQuizRecommendation(answers, products) {
    const selectedOptions = QUIZ_STEP_ORDER.map((stepKey) => getOption(stepKey, answers?.[stepKey])).filter((item) => item);
    const safeSelections = selectedOptions.length ? selectedOptions : [QUESTIONS.goal.options[0]];
    const [goal, rhythm, preference, format, support] = [
        getOption('goal', answers?.goal) || QUESTIONS.goal.options[0],
        getOption('rhythm', answers?.rhythm) || QUESTIONS.rhythm.options[0],
        getOption('preference', answers?.preference) || QUESTIONS.preference.options[0],
        getOption('format', answers?.format) || QUESTIONS.format.options[0],
        getOption('support', answers?.support) || QUESTIONS.support.options[0]
    ];

    const tagWeights = buildTagWeights(safeSelections);
    const rankedProducts = (products || [])
        .map((product) => scoreProductForProfile(product, tagWeights))
        .sort((left, right) => right.score - left.score)
        .slice(0, 4)
        .map((product) => ({
            ...product,
            roleLabel: resolveRoleLabel(product, tagWeights),
            reason: buildProductReason(product, tagWeights)
        }));

    return {
        bundleName: `${goal.bundleWord} × ${support.bundleWord} 推薦組合`,
        summary:
            `${goal.summaryLead}，搭配你選擇的「${preference.title}」方式和「${format.title}」形式，整體更適合 ${rhythm.title} 的生活，朝著「${support.title}」的方向前進。`,
        artwork: support.artwork || preference.artwork || goal.artwork,
        tags: uniqueValues([goal.title, rhythm.title, preference.title, format.title, support.title]),
        products: rankedProducts
    };
}

function buildTagWeights(selectedOptions) {
    const weights = {};

    selectedOptions.forEach((option, index) => {
        const weight = index === 0 ? 3.2 : index === selectedOptions.length - 1 ? 2.8 : 2.35;
        addWeightedTags(weights, option.tags, weight);
    });

    addWeightedTags(weights, ['daily'], 0.8);
    return weights;
}

function scoreProductForProfile(product, tagWeights) {
    const productTags = Array.isArray(product?.inferredTags) ? product.inferredTags : [];
    let score = 0;

    productTags.forEach((tag) => {
        score += tagWeights[tag] || 0;
    });

    score += Number(product?.sortRank || 0) / 10000;
    score += Number(product?.images?.length || 0) * 0.05;

    return {
        ...product,
        score
    };
}

function resolveRoleLabel(product, tagWeights) {
    const strongestTag = (product.inferredTags || [])
        .map((tag) => ({
            tag,
            score: tagWeights[tag] || 0
        }))
        .sort((left, right) => right.score - left.score)[0]?.tag;

    return ROLE_LABELS[strongestTag] || '為你推薦';
}

function buildProductReason(product, tagWeights) {
    const strongestTag = (product.inferredTags || [])
        .map((tag) => ({
            tag,
            score: tagWeights[tag] || 0
        }))
        .sort((left, right) => right.score - left.score)[0]?.tag;

    return TAG_REASON_COPY[strongestTag] || '這個商品和你的需求比較接近。';
}

function addWeightedTags(target, tags, weight) {
    tags.forEach((tag) => {
        target[tag] = (target[tag] || 0) + weight;
    });
}

function createOption({ artwork, iconKey, ...rest }) {
    return {
        ...rest,
        iconKey,
        artwork: createIllustration({
            ...artwork,
            label: rest.title
        })
    };
}

function buildOptionLookup() {
    const lookup = {};

    Object.values(QUESTIONS).forEach((question) => {
        question.options.forEach((option) => {
            lookup[`${question.key}:${option.value}`] = option;
        });
    });

    return lookup;
}

function buildIconUrlLookup() {
    const icons = {};

    Object.values(QUESTIONS).forEach((question) => {
        question.options.forEach((option) => {
            icons[option.iconKey] = option.artwork;
        });
    });

    return icons;
}

function uniqueValues(values) {
    return Array.from(new Set((values || []).filter((value) => normalizeString(value))));
}

function normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function createIllustration({ motif, primary, secondary, accent, label = '健康' }) {
    const safePrimary = primary || '#0f766e';
    const safeSecondary = secondary || '#ccfbf1';
    const safeAccent = accent || '#f97316';
    const safeLabel = escapeXml(label);

    const motifMarkup = buildMotifMarkup(motif, safeAccent);
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 280" role="img" aria-label="${safeLabel}">
            <defs>
                <linearGradient id="bg" x1="0%" x2="100%" y1="0%" y2="100%">
                    <stop offset="0%" stop-color="${safePrimary}" />
                    <stop offset="100%" stop-color="${safeSecondary}" />
                </linearGradient>
            </defs>
            <rect width="400" height="280" rx="36" fill="url(#bg)" />
            <circle cx="330" cy="56" r="58" fill="${safeAccent}" opacity="0.18" />
            <circle cx="58" cy="234" r="72" fill="#ffffff" opacity="0.14" />
            <path d="M0 210C46 184 88 176 132 180C178 184 230 210 274 204C318 198 356 166 400 142V280H0Z" fill="#ffffff" opacity="0.18" />
            <path d="M0 232C52 218 98 206 144 212C190 218 238 246 284 242C330 238 362 214 400 194V280H0Z" fill="#ffffff" opacity="0.12" />
            ${motifMarkup}
            <rect x="22" y="24" width="128" height="30" rx="15" fill="#ffffff" opacity="0.14" />
            <text x="86" y="44" text-anchor="middle" font-size="13" font-family="'Avenir Next','PingFang TC','Noto Sans TC',sans-serif" fill="#ffffff" opacity="0.88">${safeLabel}</text>
        </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildMotifMarkup(motif, accent) {
    const safeAccent = accent || '#f97316';

    switch (motif) {
        case 'sunrise':
            return `
                <circle cx="114" cy="138" r="38" fill="${safeAccent}" opacity="0.72" />
                <path d="M48 176C76 152 96 142 116 142C136 142 156 152 184 176" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" opacity="0.9" />
                <path d="M216 96H330" stroke="#ffffff" stroke-width="12" stroke-linecap="round" opacity="0.8" />
                <path d="M240 128H356" stroke="#ffffff" stroke-width="12" stroke-linecap="round" opacity="0.48" />
            `;
        case 'leaf':
            return `
                <path d="M206 196C206 132 242 92 314 78C310 148 274 196 206 196Z" fill="#ffffff" opacity="0.86" />
                <path d="M170 182C170 124 142 92 84 76C88 138 116 182 170 182Z" fill="${safeAccent}" opacity="0.78" />
                <path d="M202 204C198 166 216 130 244 96" stroke="#0b3b35" stroke-width="8" stroke-linecap="round" opacity="0.28" />
            `;
        case 'pulse':
            return `
                <path d="M44 168H114L148 114L188 194L224 144H356" fill="none" stroke="#ffffff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" opacity="0.9" />
                <circle cx="284" cy="98" r="34" fill="${safeAccent}" opacity="0.76" />
            `;
        case 'moon':
            return `
                <circle cx="112" cy="112" r="50" fill="#ffffff" opacity="0.9" />
                <circle cx="136" cy="96" r="44" fill="#1e293b" opacity="0.92" />
                <circle cx="286" cy="90" r="7" fill="#ffffff" opacity="0.85" />
                <circle cx="318" cy="126" r="5" fill="#ffffff" opacity="0.72" />
                <circle cx="252" cy="142" r="5" fill="#ffffff" opacity="0.62" />
                <path d="M42 204C98 178 136 168 176 172C216 176 260 196 316 188" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" opacity="0.34" />
            `;
        case 'home':
            return `
                <path d="M102 198V128L192 66L284 128V198Z" fill="#ffffff" opacity="0.84" />
                <path d="M148 198V150H238V198" fill="${safeAccent}" opacity="0.72" />
                <path d="M94 134L192 54L292 134" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity="0.78" />
            `;
        case 'stride':
            return `
                <path d="M102 198L174 126L220 160L306 84" fill="none" stroke="#ffffff" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" opacity="0.88" />
                <circle cx="104" cy="200" r="18" fill="${safeAccent}" opacity="0.82" />
                <circle cx="306" cy="84" r="18" fill="#ffffff" opacity="0.9" />
            `;
        case 'droplet':
            return `
                <path d="M204 68C240 114 262 144 262 176C262 212 236 236 204 236C172 236 146 212 146 176C146 144 168 114 204 68Z" fill="#ffffff" opacity="0.88" />
                <circle cx="270" cy="112" r="24" fill="${safeAccent}" opacity="0.72" />
            `;
        case 'arc':
            return `
                <path d="M72 178C94 130 136 98 186 98C236 98 280 130 304 178" fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="round" opacity="0.9" />
                <path d="M110 194C130 156 158 138 186 138C214 138 244 156 264 194" fill="none" stroke="${safeAccent}" stroke-width="14" stroke-linecap="round" opacity="0.82" />
            `;
        case 'glow':
            return `
                <circle cx="188" cy="138" r="54" fill="#ffffff" opacity="0.92" />
                <circle cx="188" cy="138" r="28" fill="${safeAccent}" opacity="0.88" />
                <path d="M188 44V80M188 196V232M94 138H130M246 138H282M122 72L148 98M228 178L254 204M122 204L148 178M228 98L254 72" stroke="#ffffff" stroke-width="10" stroke-linecap="round" opacity="0.72" />
            `;
        case 'grid':
            return `
                <rect x="88" y="78" width="220" height="126" rx="20" fill="#ffffff" opacity="0.86" />
                <path d="M146 78V204M202 78V204M258 78V204M88 120H308M88 162H308" stroke="${safeAccent}" stroke-width="10" opacity="0.28" />
                <circle cx="118" cy="106" r="10" fill="${safeAccent}" opacity="0.72" />
            `;
        case 'hero':
        default:
            return `
                <circle cx="126" cy="106" r="44" fill="#ffffff" opacity="0.86" />
                <path d="M206 182C206 132 242 92 314 78C310 148 274 196 206 196Z" fill="${safeAccent}" opacity="0.8" />
                <path d="M74 196C108 168 138 156 172 156C206 156 242 168 280 196" fill="none" stroke="#ffffff" stroke-width="14" stroke-linecap="round" opacity="0.72" />
            `;
    }
}

function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
