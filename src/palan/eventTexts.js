// Life events by house combination (the "signification" method used by
// KP / Tamil astrologers): an event is indicated when the running period
// planets signify all of its houses. Ages limit events to relevant life stages.
// care: true marks events that call for caution rather than opportunity.
export const EVENTS = [
  { key: 'marriage', all: [2, 7, 11], age: [21, 42], area: 'family', prio: 9 },
  { key: 'childbirth', all: [2, 5, 11], age: [22, 42], area: 'kids', prio: 9 },
  { key: 'promotion', all: [10, 11], age: [20, 65], area: 'career', prio: 8 },
  { key: 'property', all: [4, 11], age: [24, 120], area: 'finances', prio: 8 },
  { key: 'kidsNews', all: [5, 11], age: [40, 120], area: 'kids', prio: 7 },
  { key: 'jobChange', all: [10, 12], age: [20, 65], area: 'career', prio: 7 },
  { key: 'newRole', all: [6, 10], age: [20, 65], area: 'career', prio: 6 },
  { key: 'business', all: [7, 10], age: [25, 70], area: 'career', prio: 5 },
  { key: 'incomeRise', all: [2, 11], age: [18, 120], area: 'finances', prio: 6 },
  { key: 'loanClear', all: [6, 11], age: [22, 120], area: 'finances', prio: 5 },
  { key: 'inheritance', all: [8, 11], age: [25, 120], area: 'finances', prio: 5 },
  { key: 'studies', all: [4, 9, 11], age: [5, 32], area: 'education', prio: 8 },
  { key: 'partnerGood', all: [7, 11], age: [42, 120], area: 'family', prio: 5 },
  { key: 'travel', all: [9, 12], age: [18, 120], area: 'travel', prio: 2 },
  { key: 'homeMove', all: [4, 12], age: [22, 120], area: 'finances', prio: 4 },
  { key: 'healthGood', all: [1, 11], age: [0, 120], area: 'health', prio: 3 },
  { key: 'healthCare', all: [6, 8], age: [0, 120], area: 'health', prio: 7, care: true },
  { key: 'setback', all: [8, 12], age: [18, 120], area: 'finances', prio: 6, care: true },
  { key: 'expenses', all: [2, 12], age: [18, 120], area: 'finances', prio: 5, care: true },
  { key: 'disputes', all: [6, 7], age: [20, 120], area: 'family', prio: 5, care: true },
];

// [what to expect, what to do]
export const EVENT_TEXT = {
  marriage: { en: ['Marriage or engagement is traditionally indicated.', 'Good time for marriage talks and fixing dates.'], ta: ['திருமணம் அல்லது நிச்சயதார்த்தம் பாரம்பரியமாகக் குறிக்கப்படுகிறது.', 'திருமணப் பேச்சு, தேதி நிச்சயிக்க நல்ல காலம்.'] },
  childbirth: { en: ['An addition to the family (childbirth) is traditionally indicated.', 'Plan ahead and look after health; see your doctor for any plans.'], ta: ['குடும்பத்தில் புதிய வரவு (குழந்தைப் பேறு) பாரம்பரியமாகக் குறிக்கப்படுகிறது.', 'முன்கூட்டியே திட்டமிடுங்கள்; மருத்துவர் ஆலோசனை பெறுங்கள்.'] },
  promotion: { en: ['Career rise: a promotion, raise or recognition.', 'Ask for it; take on visible responsibility.'], ta: ['தொழில் உயர்வு: பதவி உயர்வு, சம்பள உயர்வு அல்லது அங்கீகாரம்.', 'கேளுங்கள்; வெளிப்படையான பொறுப்புகளை ஏற்றுக்கொள்ளுங்கள்.'] },
  property: { en: ['Buying property, a house, land or a vehicle is traditionally favoured.', 'A good time to buy or renovate; check documents carefully.'], ta: ['சொத்து, வீடு, நிலம் அல்லது வாகனம் வாங்க பாரம்பரியமாக சாதகம்.', 'வாங்க அல்லது புதுப்பிக்க நல்ல காலம்; ஆவணங்களைக் கவனமாகச் சரிபாருங்கள்.'] },
  kidsNews: { en: ['Good news through your children: their studies, job or marriage.', 'Support their plans; this is a good time for their big steps.'], ta: ['குழந்தைகள் மூலம் நல்ல செய்தி: அவர்களின் கல்வி, வேலை அல்லது திருமணம்.', 'அவர்களின் திட்டங்களுக்கு ஆதரவு; பெரிய முடிவுகளுக்கு நல்ல காலம்.'] },
  jobChange: { en: ['A change of job or workplace, possibly a transfer or work abroad.', 'If you want a change, prepare now; if not, don’t quit on impulse.'], ta: ['வேலை அல்லது பணியிட மாற்றம்; இடமாற்றம் அல்லது வெளிநாட்டு வேலையும் இருக்கலாம்.', 'மாற்றம் வேண்டுமெனில் இப்போதே தயாராகுங்கள்; இல்லையெனில் அவசரமாக விலகாதீர்கள்.'] },
  newRole: { en: ['A new role or job opportunity; you can win over competitors.', 'Apply, interview, and show your results.'], ta: ['புதிய பொறுப்பு அல்லது வேலை வாய்ப்பு; போட்டியாளர்களை வெல்லலாம்.', 'விண்ணப்பியுங்கள்; உங்கள் சாதனைகளை முன்வையுங்கள்.'] },
  business: { en: ['Business growth, new clients or a work partnership.', 'Good time to sign deals; read agreements carefully.'], ta: ['தொழில் வளர்ச்சி, புதிய வாடிக்கையாளர்கள் அல்லது கூட்டுப் பணி.', 'ஒப்பந்தங்களுக்கு நல்ல காலம்; கவனமாகப் படியுங்கள்.'] },
  incomeRise: { en: ['Income rises and savings grow.', 'Put the extra into savings or paying off debt.'], ta: ['வருமானம் உயரும்; சேமிப்பு வளரும்.', 'கூடுதல் பணத்தை சேமிப்பு அல்லது கடன் அடைப்பில் வையுங்கள்.'] },
  loanClear: { en: ['Loans get approved or debts get cleared.', 'Good time to restructure or close loans.'], ta: ['கடன் கிடைக்கும் அல்லது கடன்கள் அடையும்.', 'கடன்களை மறுசீரமைக்க அல்லது முடிக்க நல்ல காலம்.'] },
  inheritance: { en: ['Unexpected gains: inheritance, insurance, settlement or arrears.', 'Follow up on pending claims and paperwork.'], ta: ['எதிர்பாராத லாபம்: பரம்பரைச் சொத்து, காப்பீடு, தீர்வுத் தொகை அல்லது நிலுவை.', 'நிலுவையில் உள்ள கோரிக்கைகள், ஆவணங்களைப் பின்தொடருங்கள்.'] },
  studies: { en: ['Success in studies, exams or admissions.', 'Prepare well and apply; results traditionally favour you.'], ta: ['கல்வி, தேர்வு, சேர்க்கையில் வெற்றி.', 'நன்கு தயாராகி விண்ணப்பியுங்கள்; முடிவுகள் சாதகம்.'] },
  partnerGood: { en: ['Your spouse does well; a good time for joint plans.', 'Plan something together: a trip, an investment or a family event.'], ta: ['வாழ்க்கைத் துணை நன்றாக இருப்பார்; கூட்டுத் திட்டங்களுக்கு நல்ல காலம்.', 'ஒன்றாக ஏதாவது திட்டமிடுங்கள்: பயணம், முதலீடு, குடும்ப நிகழ்வு.'] },
  travel: { en: ['A long trip: visiting family far away, or a pilgrimage.', 'A good time for a family visit or temple trip.'], ta: ['நீண்ட பயணம்: தொலைவில் உள்ள குடும்பத்தைச் சந்தித்தல் அல்லது தீர்த்த யாத்திரை.', 'குடும்பத்தைச் சந்திக்க அல்லது கோயில் பயணத்துக்கு நல்ல காலம்.'] },
  homeMove: { en: ['Moving house or a big change at home.', 'Plan moves early; avoid rushed decisions on property.'], ta: ['வீடு மாற்றம் அல்லது வீட்டில் பெரிய மாற்றம்.', 'முன்கூட்டியே திட்டமிடுங்கள்; சொத்து முடிவுகளில் அவசரம் வேண்டாம்.'] },
  healthGood: { en: ['Good energy; health improves.', 'A good time to start a fitness habit.'], ta: ['நல்ல உற்சாகம்; உடல்நலம் மேம்படும்.', 'உடற்பயிற்சிப் பழக்கத்தைத் தொடங்க நல்ல காலம்.'] },
  healthCare: { en: ['Health needs more attention: stress, tiredness or minor problems.', 'Rest well, keep up check-ups, and see a doctor for any concern.'], ta: ['உடல்நலத்தில் அதிக கவனம் தேவை: மன அழுத்தம், சோர்வு அல்லது சிறு பிரச்சினைகள்.', 'நன்கு ஓய்வெடுங்கள்; பரிசோதனைகளைத் தொடருங்கள்; எந்தக் கவலைக்கும் மருத்துவரை அணுகுங்கள்.'] },
  setback: { en: ['Unexpected expenses or a setback are possible.', 'Keep an emergency fund; avoid risky ventures.'], ta: ['எதிர்பாராத செலவு அல்லது பின்னடைவு வரலாம்.', 'அவசர நிதி வையுங்கள்; அபாயமான முயற்சிகள் வேண்டாம்.'] },
  expenses: { en: ['Expenses rise faster than income.', 'Budget carefully; don’t lend money.'], ta: ['வருமானத்தை விடச் செலவுகள் வேகமாக உயரும்.', 'கவனமான பட்ஜெட்; கடன் கொடுக்காதீர்கள்.'] },
  disputes: { en: ['Disagreements with your spouse, partners or colleagues; legal matters possible.', 'Stay calm, put agreements in writing, and settle early.'], ta: ['துணை, கூட்டாளிகள் அல்லது சக ஊழியர்களுடன் கருத்து வேறுபாடு; சட்ட விஷயங்கள் வரலாம்.', 'அமைதியாக இருங்கள்; ஒப்பந்தங்களை எழுத்தில் வையுங்கள்; விரைவில் தீர்வு காணுங்கள்.'] },
  parents: { en: ['Your parents may need more of your time and care.', 'Plan visits and their health check-ups.'], ta: ['பெற்றோருக்கு உங்கள் நேரமும் கவனிப்பும் அதிகம் தேவைப்படலாம்.', 'அவர்களைச் சந்திக்கவும், அவர்களின் மருத்துவப் பரிசோதனைகளுக்கும் திட்டமிடுங்கள்.'] },
  safety: { en: ['Tradition advises extra care with physical safety: driving, heights, sharp tools, sports and falls.', 'Drive carefully, avoid risky activities, and don’t rush.'], ta: ['பாரம்பரியமாக உடல் பாதுகாப்பில் கூடுதல் கவனம்: வாகனம் ஓட்டுதல், உயரம், கூர்மையான கருவிகள், விளையாட்டு, தவறி விழுதல்.', 'கவனமாக வாகனம் ஓட்டுங்கள்; அபாயமான செயல்களைத் தவிருங்கள்; அவசரப்படாதீர்கள்.'] },
  quiet: { en: ['A quieter phase without strong indications either way.', 'Keep up steady routines; a good time to consolidate.'], ta: ['இரு பக்கமும் வலுவான குறிப்புகள் இல்லாத அமைதியான காலம்.', 'சீரான நடைமுறை; நிலைப்படுத்த நல்ல காலம்.'] },
};

export const FOCUS_EXTRA = {
  parents: {
    name: { en: 'Parents', ta: 'பெற்றோர்' },
    good: { en: 'Your chart traditionally shows support from and for your parents.', ta: 'உங்கள் ஜாதகம் பாரம்பரியமாக பெற்றோருடன் பரஸ்பர ஆதரவைக் காட்டுகிறது.' },
    mixed: { en: 'Your parents’ wellbeing needs ordinary care and regular contact.', ta: 'பெற்றோரின் நலனுக்கு வழக்கமான கவனமும் தொடர்பும் தேவை.' },
    hard: { en: 'Your parents may need more of your time and care in your chart.', ta: 'உங்கள் ஜாதகத்தில் பெற்றோருக்கு உங்கள் நேரமும் கவனிப்பும் அதிகம் தேவைப்படலாம்.' },
    tip: { en: 'Keep in regular touch and help with their check-ups.', ta: 'தொடர்ந்து தொடர்பில் இருங்கள்; அவர்களின் பரிசோதனைகளுக்கு உதவுங்கள்.' },
  },
};

// Short noun phrases for summaries ("Nov 2026 – Dec 2026: a career rise, buying property")
export const EVENT_SHORT = {
  marriage: { en: 'marriage', ta: 'திருமணம்' },
  childbirth: { en: 'a new child', ta: 'குழந்தைப் பேறு' },
  promotion: { en: 'a career rise (promotion, raise or recognition)', ta: 'தொழில் உயர்வு (பதவி, சம்பள உயர்வு, அங்கீகாரம்)' },
  property: { en: 'buying property or a vehicle', ta: 'சொத்து அல்லது வாகனம் வாங்குதல்' },
  kidsNews: { en: 'good news through your children', ta: 'குழந்தைகள் மூலம் நல்ல செய்தி' },
  jobChange: { en: 'a job or workplace change', ta: 'வேலை அல்லது பணியிட மாற்றம்' },
  newRole: { en: 'a new role or job offer', ta: 'புதிய பொறுப்பு அல்லது வேலை வாய்ப்பு' },
  business: { en: 'business growth or new clients', ta: 'தொழில் வளர்ச்சி, புதிய வாடிக்கையாளர்கள்' },
  incomeRise: { en: 'income growing', ta: 'வருமான உயர்வு' },
  loanClear: { en: 'loans approved or cleared', ta: 'கடன் கிடைத்தல் அல்லது அடைதல்' },
  inheritance: { en: 'unexpected gains', ta: 'எதிர்பாராத லாபம்' },
  studies: { en: 'success in studies or exams', ta: 'கல்வி, தேர்வில் வெற்றி' },
  partnerGood: { en: 'good times with your spouse', ta: 'வாழ்க்கைத் துணையுடன் நல்ல காலம்' },
  travel: { en: 'a long family trip or pilgrimage', ta: 'நீண்ட குடும்பப் பயணம் அல்லது யாத்திரை' },
  homeMove: { en: 'moving house or changes at home', ta: 'வீடு மாற்றம் அல்லது வீட்டில் மாற்றங்கள்' },
  healthGood: { en: 'good energy', ta: 'நல்ல உற்சாகம்' },
  healthCare: { en: 'your health (rest and check-ups)', ta: 'உடல்நலம் (ஓய்வு, பரிசோதனைகள்)' },
  setback: { en: 'unexpected expenses or a setback', ta: 'எதிர்பாராத செலவு அல்லது பின்னடைவு' },
  expenses: { en: 'expenses running ahead of income', ta: 'வருமானத்தை மிஞ்சும் செலவுகள்' },
  disputes: { en: 'disagreements at home or work', ta: 'வீட்டிலோ வேலையிலோ கருத்து வேறுபாடு' },
  parents: { en: 'your parents’ wellbeing', ta: 'பெற்றோரின் நலன்' },
  safety: { en: 'physical safety (driving, heights, tools, sports)', ta: 'உடல் பாதுகாப்பு (வாகனம், உயரம், கருவிகள், விளையாட்டு)' },
};
