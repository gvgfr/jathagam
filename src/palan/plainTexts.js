// Plain-language outcome texts: what to expect and what to do, by house and
// by tone ('good' | 'hard'). Used by the plain palan generator.

// Area names in everyday words
export const AREA = [
  null,
  { en: 'you and your confidence', ta: 'நீங்களும் உங்கள் தன்னம்பிக்கையும்' },
  { en: 'money and family', ta: 'பணமும் குடும்பமும்' },
  { en: 'efforts, siblings and communication', ta: 'முயற்சி, உடன்பிறப்புகள், தொடர்பு' },
  { en: 'home and property', ta: 'வீடும் சொத்தும்' },
  { en: 'children, studies and investments', ta: 'குழந்தைகள், கல்வி, முதலீடுகள்' },
  { en: 'work, competition and loans', ta: 'பணி, போட்டி, கடன்கள்' },
  { en: 'marriage and partnerships', ta: 'திருமணமும் கூட்டாண்மையும்' },
  { en: 'sudden changes', ta: 'திடீர் மாற்றங்கள்' },
  { en: 'luck and mentors', ta: 'அதிர்ஷ்டமும் வழிகாட்டிகளும்' },
  { en: 'career', ta: 'தொழில்' },
  { en: 'income and friends', ta: 'வருமானமும் நண்பர்களும்' },
  { en: 'expenses and travel abroad', ta: 'செலவுகளும் வெளிநாட்டுப் பயணமும்' },
];

// How a planet tends to deliver results, in plain words
export const HOW = {
  sun: { en: 'through authority, government or your father', ta: 'அதிகாரம், அரசு அல்லது தந்தை மூலம்' },
  moon: { en: 'through your mother, emotions, travel and dealing with people', ta: 'தாய், உணர்வுகள், பயணம், மக்கள் தொடர்பு மூலம்' },
  mars: { en: 'through energy, property and bold action', ta: 'உற்சாகம், சொத்து, துணிச்சலான செயல் மூலம்' },
  mercury: { en: 'through learning, business and communication', ta: 'கல்வி, வியாபாரம், தொடர்புத் திறன் மூலம்' },
  jupiter: { en: 'through wisdom, teachers, children and good advice', ta: 'ஞானம், ஆசிரியர்கள், குழந்தைகள், நல்ல ஆலோசனை மூலம்' },
  venus: { en: 'through relationships, comforts and creativity', ta: 'உறவுகள், சுகம், படைப்பாற்றல் மூலம்' },
  saturn: { en: 'slowly, through hard work and patience', ta: 'மெதுவாக, கடின உழைப்பு, பொறுமை மூலம்' },
  rahu: { en: 'suddenly, often through foreign or unusual paths', ta: 'திடீரென, பெரும்பாலும் வெளிநாடு அல்லது வழக்கத்துக்கு மாறான வழிகளில்' },
  ketu: { en: 'through letting go, research or spiritual interests', ta: 'பற்றை விடுதல், ஆராய்ச்சி, ஆன்மிகம் மூலம்' },
};

// Kinds of work traditionally suggested by where the 10th lord sits
export const CAREER_FIELDS = [
  null,
  { en: 'self-employment, your own brand, roles where you are the face', ta: 'சுயதொழில், சொந்த அடையாளம், நீங்களே முகமாக இருக்கும் பணிகள்' },
  { en: 'finance, banking, family business, teaching or speaking', ta: 'நிதி, வங்கி, குடும்பத் தொழில், கற்பித்தல், பேச்சு சார்ந்த பணி' },
  { en: 'media, writing, sales, marketing, travel', ta: 'ஊடகம், எழுத்து, விற்பனை, சந்தைப்படுத்தல், பயணம்' },
  { en: 'real estate, vehicles, education, agriculture, work from home', ta: 'ரியல் எஸ்டேட், வாகனம், கல்வி, விவசாயம், வீட்டிலிருந்து வேலை' },
  { en: 'teaching, advisory, creative arts, investments', ta: 'கற்பித்தல், ஆலோசனை, கலை, முதலீடு' },
  { en: 'service jobs, law, healthcare support, competitive fields', ta: 'சேவைப் பணி, சட்டம், மருத்துவச் சேவை, போட்டித் துறைகள்' },
  { en: 'business partnerships, client-facing roles, trade', ta: 'கூட்டுத் தொழில், வாடிக்கையாளர் சார்ந்த பணி, வணிகம்' },
  { en: 'research, insurance, investigation, technical or hidden work', ta: 'ஆராய்ச்சி, காப்பீடு, புலனாய்வு, தொழில்நுட்பப் பணி' },
  { en: 'teaching, law, religion, higher education, work far from home', ta: 'கற்பித்தல், சட்டம், ஆன்மிகம், உயர்கல்வி, தொலைவில் வேலை' },
  { en: 'leadership and management; career is a big part of life', ta: 'தலைமை, நிர்வாகம்; தொழில் வாழ்க்கையின் முக்கிய அங்கம்' },
  { en: 'large organisations, networks, steady income', ta: 'பெரிய நிறுவனங்கள், தொடர்பு வலை, நிலையான வருமானம்' },
  { en: 'working abroad, multinational companies, hospitals, charities', ta: 'வெளிநாட்டு வேலை, பன்னாட்டு நிறுவனங்கள், மருத்துவமனை, தொண்டு நிறுவனங்கள்' },
];

// What tradition says about the partner/marriage by where the 7th lord sits
export const MARRIAGE_BY = [
  null,
  { en: 'your partner strongly shapes your life; you may choose them yourself', ta: 'துணை உங்கள் வாழ்க்கையை பெரிதும் வடிவமைப்பார்; நீங்களே தேர்ந்தெடுக்கலாம்' },
  { en: 'family plays a big part; your partner values family and savings', ta: 'குடும்பம் முக்கியப் பங்கு வகிக்கும்; துணை குடும்பம், சேமிப்பை மதிப்பவர்' },
  { en: 'you may meet through siblings, neighbours, travel or social media', ta: 'உடன்பிறப்புகள், அண்டை வீட்டார், பயணம் அல்லது சமூக ஊடகம் மூலம் சந்திக்கலாம்' },
  { en: 'a settled home life; your partner is close to your mother and home', ta: 'நிலையான குடும்ப வாழ்க்கை; துணை உங்கள் வீடு, தாயுடன் நெருக்கம்' },
  { en: 'a love marriage or romance is possible', ta: 'காதல் திருமணம் அல்லது காதல் வாய்ப்பு உண்டு' },
  { en: 'you may meet through work; small disagreements need patience', ta: 'பணியிடத்தில் சந்திக்கலாம்; சிறு கருத்து வேறுபாடுகளுக்குப் பொறுமை தேவை' },
  { en: 'a strong, equal partnership; partner may be independent-minded', ta: 'வலுவான, சமமான உறவு; துணை சுதந்திர மனம் கொண்டவர்' },
  { en: 'some ups and downs; the partner’s family may bring wealth', ta: 'சில ஏற்ற இறக்கங்கள்; துணையின் குடும்பம் செல்வம் தரலாம்' },
  { en: 'a partner from a good or religious background, possibly from far away', ta: 'நல்ல அல்லது ஆன்மிகப் பின்னணி கொண்ட துணை, தொலைவிலிருந்தும் இருக்கலாம்' },
  { en: 'you may meet through work; your partner is career-minded', ta: 'வேலை மூலம் சந்திக்கலாம்; துணை தொழில் ஆர்வம் கொண்டவர்' },
  { en: 'you may meet through friends; gains after marriage', ta: 'நண்பர்கள் மூலம் சந்திக்கலாம்; திருமணத்துக்குப் பின் லாபம்' },
  { en: 'a partner from far away or abroad; marriage may bring travel or expense', ta: 'தொலைவு அல்லது வெளிநாட்டுத் துணை; பயணம் அல்லது செலவு தரலாம்' },
];

// Main income source by where the 11th lord sits
export const INCOME_BY = [
  null,
  { en: 'your own efforts and personality', ta: 'உங்கள் சொந்த முயற்சி, ஆளுமை' },
  { en: 'family, savings and steady accumulation', ta: 'குடும்பம், சேமிப்பு, சீரான சேர்க்கை' },
  { en: 'your initiative, sales, writing or media', ta: 'உங்கள் முன்முயற்சி, விற்பனை, எழுத்து, ஊடகம்' },
  { en: 'property, rent, vehicles or land', ta: 'சொத்து, வாடகை, வாகனம், நிலம்' },
  { en: 'investments, creative work or teaching', ta: 'முதலீடுகள், படைப்புப் பணி, கற்பித்தல்' },
  { en: 'a job or service; competitive work', ta: 'வேலை அல்லது சேவை; போட்டித் துறை' },
  { en: 'business, trade or your spouse', ta: 'வியாபாரம், வணிகம் அல்லது வாழ்க்கைத் துணை' },
  { en: 'sudden gains, inheritance or insurance', ta: 'திடீர் லாபம், பரம்பரைச் சொத்து, காப்பீடு' },
  { en: 'luck, your father, teaching or long-distance work', ta: 'அதிர்ஷ்டம், தந்தை, கற்பித்தல், தொலைதூரப் பணி' },
  { en: 'your career and position', ta: 'உங்கள் தொழில், பதவி' },
  { en: 'several sources and a strong network', ta: 'பல வருமான வழிகள், வலுவான தொடர்புகள்' },
  { en: 'abroad or foreign companies (watch expenses)', ta: 'வெளிநாடு அல்லது வெளிநாட்டு நிறுவனங்கள் (செலவில் கவனம்)' },
];

// Transits in plain words: [expect, do]
export const TRANSIT_PLAIN = {
  sade1: { en: ['Saturn’s 7½-year phase has begun (first part): expenses and changes around you are likely.', 'Spend carefully and don’t start big risks; this phase rewards patience.'], ta: ['ஏழரைச் சனியின் முதல் கட்டம்: செலவுகள், சூழல் மாற்றங்கள் வரலாம்.', 'கவனமாகச் செலவிடுங்கள்; பெரிய ரிஸ்க் வேண்டாம்; பொறுமைக்குப் பலன் உண்டு.'] },
  sade2: { en: ['You are in the middle of Saturn’s 7½-year phase: life can feel heavy with responsibilities.', 'Keep steady routines, avoid shortcuts, and look after your rest. Hard work now pays off later.'], ta: ['ஏழரைச் சனியின் நடுக் கட்டம்: பொறுப்புகள் அதிகமாக உணரலாம்.', 'சீரான நடைமுறை, குறுக்கு வழி வேண்டாம், போதுமான ஓய்வு. இப்போதைய உழைப்பு பின்னர் பலன் தரும்.'] },
  sade3: { en: ['The last part of Saturn’s 7½-year phase: things begin to settle.', 'Be careful with money and family words; finish what you started.'], ta: ['ஏழரைச் சனியின் கடைசிக் கட்டம்: நிலைமை சீராகத் தொடங்கும்.', 'பணம், குடும்பப் பேச்சில் கவனம்; தொடங்கியதை முடியுங்கள்.'] },
  sat4: { en: ['Saturn is putting pressure on home life and peace of mind.', 'Avoid rushed property decisions and give time to family.'], ta: ['சனி வீட்டு வாழ்க்கை, மன நிம்மதியில் அழுத்தம் தருகிறார்.', 'அவசர சொத்து முடிவுகள் வேண்டாம்; குடும்பத்துக்கு நேரம் கொடுங்கள்.'] },
  sat8: { en: ['Saturn is in a testing position for you: obstacles and delays are likely.', 'Be cautious with money, driving and new ventures.'], ta: ['சனி சோதனையான நிலையில்: தடைகள், தாமதங்கள் வரலாம்.', 'பணம், வாகனம், புதிய முயற்சிகளில் எச்சரிக்கை.'] },
  satGood: { en: ['Saturn is helping you: steady effort brings success and gains.', 'A good time to work hard on long-term goals.'], ta: ['சனி உங்களுக்கு உதவுகிறார்: நிலையான முயற்சி வெற்றியும் லாபமும் தரும்.', 'நீண்டகால இலக்குகளில் கடுமையாக உழைக்க நல்ல காலம்.'] },
  satMixed: { en: ['Saturn gives mixed results for you now.', 'Keep a steady pace; avoid big gambles.'], ta: ['சனி இப்போது கலவையான பலன் தருகிறார்.', 'நிலையான வேகம்; பெரிய சூதாட்டங்கள் வேண்டாம்.'] },
  jupGood: { en: ['Jupiter is favourable: growth, good news and help from elders are more likely.', 'Good time to start important things, hold marriage talks or invest.'], ta: ['குரு சாதகம்: வளர்ச்சி, நல்ல செய்தி, பெரியோர் ஆதரவு.', 'முக்கிய காரியங்கள் தொடங்க, திருமணப் பேச்சு, முதலீட்டுக்கு நல்ல காலம்.'] },
  jupWeak: { en: ['Jupiter is less supportive: growth is slower for now.', 'Be patient with big plans; prepare rather than launch.'], ta: ['குரு குறைந்த ஆதரவு: வளர்ச்சி இப்போது மெதுவாக இருக்கும்.', 'பெரிய திட்டங்களில் பொறுமை; தொடங்குவதை விடத் தயார் செய்யுங்கள்.'] },
  rahuGood: { en: ['Raagu favours bold moves and unusual opportunities.', 'Say yes to new, unconventional openings, with care.'], ta: ['ராகு துணிச்சலான முயற்சிகள், மாறுபட்ட வாய்ப்புகளுக்கு சாதகம்.', 'புதிய, மாறுபட்ட வாய்ப்புகளை கவனத்துடன் ஏற்றுக்கொள்ளுங்கள்.'] },
  rahuWeak: { en: ['Raagu may bring restlessness or confusion.', 'Avoid hasty decisions and get-rich-quick offers.'], ta: ['ராகு அமைதியின்மை அல்லது குழப்பம் தரலாம்.', 'அவசர முடிவுகள், விரைவுப் பணக்கார வாய்ப்புகளைத் தவிருங்கள்.'] },
};


// ---------------------------------------------------------------------------
// Six focus areas (the ones people ask about most)
export const FOCUS = ['family', 'kids', 'health', 'career', 'finances', 'education'];

export const FOCUS_NAME = {
  family: { en: 'Family and relationships', ta: 'குடும்பம், உறவுகள்' },
  kids: { en: 'Kids', ta: 'குழந்தைகள்' },
  health: { en: 'Health and wellbeing', ta: 'உடல்நலம், நல்வாழ்வு' },
  career: { en: 'Career', ta: 'தொழில்' },
  finances: { en: 'Finances (home, savings, debt)', ta: 'பணம் (வீடு, சேமிப்பு, கடன்)' },
  education: { en: 'Education', ta: 'கல்வி' },
};

// Which houses feed each area, and which life areas a house touches
export const FOCUS_HOUSES = { family: [2, 7, 4], kids: [5], health: [1, 6], career: [10, 6], finances: [2, 11, 4], education: [4, 5, 9] };
export const HOUSE_TO_FOCUS = [null, ['health'], ['finances', 'family'], ['career'], ['family', 'finances', 'education'], ['kids', 'education'], ['career', 'health'], ['family'], ['finances', 'health'], ['education'], ['career'], ['finances'], ['finances', 'health']];

// Overall picture of an area in the chart, by tone
export const FOCUS_CHART = {
  family: {
    good: { en: 'Your chart traditionally supports a warm family life and lasting relationships.', ta: 'உங்கள் ஜாதகம் பாரம்பரியமாக அன்பான குடும்ப வாழ்வையும் நீடித்த உறவுகளையும் ஆதரிக்கிறது.' },
    mixed: { en: 'Family life is generally good; relationships do best with patience and clear talk.', ta: 'குடும்ப வாழ்வு பொதுவாக நல்லது; பொறுமையும் தெளிவான பேச்சும் உறவுகளை வலுப்படுத்தும்.' },
    hard: { en: 'Relationships ask for more patience and effort in your chart; small issues are best solved early.', ta: 'உங்கள் ஜாதகத்தில் உறவுகளுக்கு அதிக பொறுமையும் முயற்சியும் தேவை; சிறு பிரச்சினைகளை ஆரம்பத்திலேயே தீர்ப்பது நல்லது.' },
  },
  kids: {
    good: { en: 'Children are traditionally a source of joy and pride in your chart.', ta: 'உங்கள் ஜாதகத்தில் குழந்தைகள் பாரம்பரியமாக மகிழ்ச்சியும் பெருமையும் தருவர்.' },
    mixed: { en: 'Children bring joy; they do best with your time and attention.', ta: 'குழந்தைகள் மகிழ்ச்சி தருவர்; உங்கள் நேரமும் கவனமும் அவர்களுக்கு நல்லது.' },
    hard: { en: 'Matters around children may need extra patience or come a little later.', ta: 'குழந்தைகள் தொடர்பான விஷயங்களுக்கு கூடுதல் பொறுமை தேவைப்படலாம் அல்லது சற்று தாமதமாகலாம்.' },
  },
  health: {
    good: { en: 'Your chart traditionally shows good basic energy and resilience.', ta: 'உங்கள் ஜாதகம் பாரம்பரியமாக நல்ல அடிப்படை உற்சாகத்தையும் தாங்கும் திறனையும் காட்டுகிறது.' },
    mixed: { en: 'Energy is generally steady; regular habits keep it that way.', ta: 'உற்சாகம் பொதுவாக சீராக இருக்கும்; தவறாத பழக்கங்கள் அதைக் காக்கும்.' },
    hard: { en: 'Energy can dip under stress; routines and rest matter more for you.', ta: 'மன அழுத்தத்தில் உற்சாகம் குறையலாம்; உங்களுக்கு நடைமுறையும் ஓய்வும் அதிக முக்கியம்.' },
  },
  career: {
    good: { en: 'Your chart traditionally supports a rising career and recognition.', ta: 'உங்கள் ஜாதகம் பாரம்பரியமாக வளரும் தொழிலையும் அங்கீகாரத்தையும் ஆதரிக்கிறது.' },
    mixed: { en: 'Career grows steadily; consistent effort pays off over time.', ta: 'தொழில் சீராக வளரும்; தொடர்ந்த முயற்சி காலப்போக்கில் பலன் தரும்.' },
    hard: { en: 'Career progress tends to come through persistence; it may be slower but lasts.', ta: 'தொழில் முன்னேற்றம் விடாமுயற்சியால் வரும்; மெதுவாக இருந்தாலும் நீடிக்கும்.' },
  },
  finances: {
    good: { en: 'Your chart traditionally supports savings, property and steady income.', ta: 'உங்கள் ஜாதகம் பாரம்பரியமாக சேமிப்பு, சொத்து, நிலையான வருமானத்தை ஆதரிக்கிறது.' },
    mixed: { en: 'Finances are generally stable; planning makes the difference.', ta: 'பணநிலை பொதுவாக நிலையானது; திட்டமிடலே வித்தியாசம் தரும்.' },
    hard: { en: 'Money needs careful planning in your chart; avoid debt and keep a buffer.', ta: 'உங்கள் ஜாதகத்தில் பணத்துக்கு கவனமான திட்டமிடல் தேவை; கடனைத் தவிர்த்து சேமிப்பு வையுங்கள்.' },
  },
  education: {
    good: { en: 'Learning comes naturally to you; studies traditionally go well.', ta: 'கற்றல் உங்களுக்கு இயல்பாக வரும்; கல்வி பாரம்பரியமாக நன்றாக அமையும்.' },
    mixed: { en: 'Studies go well with discipline; you learn best by doing.', ta: 'ஒழுக்கத்துடன் படித்தால் கல்வி நன்றாக அமையும்; செய்து பார்த்துக் கற்பது உங்களுக்குச் சிறந்தது.' },
    hard: { en: 'Studies need steady discipline; breaks or changes of course are possible but can be overcome.', ta: 'கல்விக்கு நிலையான ஒழுக்கம் தேவை; இடைவெளி அல்லது பாட மாற்றம் வரலாம், ஆனால் சமாளிக்கலாம்.' },
  },
};

// What a period means for an area, by tone: [expect, do]
export const FOCUS_PERIOD = {
  family: {
    good: { en: ['Family life feels warm; good for marriage talks, celebrations and reconnecting.', 'Plan family time, functions or a trip together.'], ta: ['குடும்பத்தில் அன்பு நிலவும்; திருமணப் பேச்சு, விழாக்கள், உறவுகளைப் புதுப்பிக்க நல்லது.', 'குடும்ப நேரம், விழா அல்லது ஒன்றாகப் பயணம் திட்டமிடுங்கள்.'] },
    mixed: { en: ['Family life is steady, with the usual ups and downs.', 'Keep talking openly; small gestures go a long way.'], ta: ['குடும்ப வாழ்வு சீராக இருக்கும், வழக்கமான ஏற்ற இறக்கங்களுடன்.', 'மனம் திறந்து பேசுங்கள்; சிறு அன்புச் செயல்கள் பெரிய பலன் தரும்.'] },
    hard: { en: ['Misunderstandings at home or with a partner are possible.', 'Listen more, avoid harsh words, and don’t take big family decisions in anger.'], ta: ['வீட்டில் அல்லது துணையுடன் தவறான புரிதல் வரலாம்.', 'அதிகம் கேளுங்கள்; கடும் சொற்கள் வேண்டாம்; கோபத்தில் பெரிய முடிவுகள் வேண்டாம்.'] },
  },
  kids: {
    good: { en: ['Good news about children: progress at school, milestones, or family growth.', 'Spend quality time; encourage their interests.'], ta: ['குழந்தைகள் பற்றி நல்ல செய்தி: படிப்பில் முன்னேற்றம், முக்கியத் தருணங்கள், குடும்ப வளர்ச்சி.', 'தரமான நேரம் செலவிடுங்கள்; அவர்களின் ஆர்வங்களை ஊக்குவியுங்கள்.'] },
    mixed: { en: ['Children need a bit more of your attention; things go well with guidance.', 'Stay involved in their studies and routines.'], ta: ['குழந்தைகளுக்கு உங்கள் கவனம் சற்று கூடுதலாகத் தேவை; வழிகாட்டினால் நன்றாக அமையும்.', 'அவர்களின் படிப்பு, நடைமுறையில் ஈடுபாடு காட்டுங்கள்.'] },
    hard: { en: ['Children’s matters may cause some worry or delays.', 'Be patient and supportive; avoid pressure. Seek advice from teachers or doctors when needed.'], ta: ['குழந்தைகள் தொடர்பான விஷயங்கள் சற்று கவலை அல்லது தாமதம் தரலாம்.', 'பொறுமையும் ஆதரவும்; அழுத்தம் வேண்டாம். தேவையானால் ஆசிரியர், மருத்துவர் ஆலோசனை பெறுங்கள்.'] },
  },
  health: {
    good: { en: ['Good energy and stamina; a good time to build healthy habits.', 'Start that exercise routine or health goal now.'], ta: ['நல்ல உற்சாகமும் சக்தியும்; நல்ல பழக்கங்களை உருவாக்க ஏற்ற காலம்.', 'உடற்பயிற்சி அல்லது உடல்நல இலக்கை இப்போது தொடங்குங்கள்.'] },
    mixed: { en: ['Energy is steady but can dip when you overwork.', 'Keep regular sleep and meals; don’t skip check-ups.'], ta: ['உற்சாகம் சீராக இருக்கும்; அதிக வேலையில் குறையலாம்.', 'சீரான தூக்கம், உணவு; பரிசோதனைகளைத் தவிர்க்காதீர்கள்.'] },
    hard: { en: ['A time to look after yourself more: stress and tiredness can build up.', 'Prioritise rest and routine, and get regular check-ups. For any health concern, see a doctor.'], ta: ['உங்களை அதிகம் கவனிக்க வேண்டிய காலம்: மன அழுத்தமும் சோர்வும் கூடலாம்.', 'ஓய்வுக்கும் நடைமுறைக்கும் முன்னுரிமை; தவறாமல் பரிசோதனை. எந்த உடல்நலக் கவலைக்கும் மருத்துவரை அணுகுங்கள்.'] },
  },
  career: {
    good: { en: ['Career growth, recognition or a better role is likely.', 'Ask for the promotion, apply for the role, or start the venture.'], ta: ['தொழில் வளர்ச்சி, அங்கீகாரம், நல்ல பதவி வரலாம்.', 'பதவி உயர்வு கேளுங்கள்; புதிய வேலைக்கு விண்ணப்பியுங்கள் அல்லது தொழில் தொடங்குங்கள்.'] },
    mixed: { en: ['Steady work with some pressure; progress comes from consistent effort.', 'Build skills and relationships at work; plan changes carefully.'], ta: ['சிறிது அழுத்தத்துடன் சீரான வேலை; தொடர்ந்த முயற்சியால் முன்னேற்றம்.', 'திறமைகளையும் பணியிட உறவுகளையும் வளருங்கள்; மாற்றங்களைக் கவனமாகத் திட்டமிடுங்கள்.'] },
    hard: { en: ['Work pressure or a slower phase; recognition may take time.', 'Keep your head down, avoid clashes with bosses, and don’t quit in haste.'], ta: ['வேலை அழுத்தம் அல்லது மந்த நிலை; அங்கீகாரம் வரத் தாமதமாகலாம்.', 'அமைதியாக உழையுங்கள்; மேலதிகாரிகளுடன் மோதல் வேண்டாம்; அவசரமாக வேலையை விடாதீர்கள்.'] },
  },
  finances: {
    good: { en: ['Income and savings can grow; good for buying property or paying off loans.', 'Save and invest steadily; a good time for home or property plans.'], ta: ['வருமானமும் சேமிப்பும் வளரலாம்; சொத்து வாங்க, கடன் அடைக்க நல்லது.', 'சீராகச் சேமித்து முதலீடு செய்யுங்கள்; வீடு, சொத்துத் திட்டங்களுக்கு நல்ல காலம்.'] },
    mixed: { en: ['Money comes in, but expenses keep pace.', 'Track spending, keep an emergency fund, and avoid new debt.'], ta: ['பணம் வரும், ஆனால் செலவுகளும் கூடவே வரும்.', 'செலவைக் கண்காணியுங்கள்; அவசர நிதி வையுங்கள்; புதிய கடன் வேண்டாம்.'] },
    hard: { en: ['Expenses or loans may weigh on you; money can feel tight.', 'Cut non-essentials, avoid lending or borrowing, and don’t make risky investments.'], ta: ['செலவுகள் அல்லது கடன்கள் சுமையாகலாம்; பணம் இறுக்கமாக இருக்கலாம்.', 'தேவையற்ற செலவைக் குறையுங்கள்; கடன் கொடுக்கவோ வாங்கவோ வேண்டாம்; அபாய முதலீடுகள் வேண்டாம்.'] },
  },
  education: {
    good: { en: ['A good time for learning: exams, courses and new skills go well.', 'Sign up for that course or certification now.'], ta: ['கற்க நல்ல காலம்: தேர்வுகள், படிப்புகள், புதிய திறன்கள் நன்றாக அமையும்.', 'அந்தப் படிப்பு அல்லது சான்றிதழுக்கு இப்போது பதிவு செய்யுங்கள்.'] },
    mixed: { en: ['Studies go well with discipline; some distractions are likely.', 'Set a fixed study routine and clear goals.'], ta: ['ஒழுக்கத்துடன் கல்வி நன்றாக அமையும்; சில கவனச் சிதறல்கள் வரலாம்.', 'நிலையான படிப்பு நேரமும் தெளிவான இலக்குகளும் வையுங்கள்.'] },
    hard: { en: ['Focus can be harder; results may need extra effort.', 'Break study into small steps and ask teachers for help early.'], ta: ['கவனம் செலுத்துவது கடினமாகலாம்; முடிவுகளுக்கு கூடுதல் உழைப்பு தேவை.', 'படிப்பைச் சிறு படிகளாகப் பிரியுங்கள்; ஆசிரியர்களிடம் முன்கூட்டியே உதவி கேளுங்கள்.'] },
  },
};

// Overall feel of a period, in words instead of colours
export const TONE_WORDS = {
  good: { en: 'A supportive time.', ta: 'ஆதரவான காலம்.' },
  mixed: { en: 'A steady time: good results with effort.', ta: 'சீரான காலம்: முயற்சியால் நல்ல பலன்.' },
  hard: { en: 'A time that asks for patience.', ta: 'பொறுமை தேவைப்படும் காலம்.' },
};

// Extra flavour for houses that colour a period
export const HOUSE_FLAVOR = {
  3: { en: 'Good for short trips, writing, selling and new efforts.', ta: 'குறுகிய பயணம், எழுத்து, விற்பனை, புதிய முயற்சிகளுக்கு நல்லது.' },
  8: { en: 'Some unexpected changes are possible; keep plans flexible.', ta: 'சில எதிர்பாராத மாற்றங்கள் வரலாம்; திட்டங்களை நெகிழ்வாக வையுங்கள்.' },
  9: { en: 'Help from elders, mentors or your father.', ta: 'பெரியோர், வழிகாட்டிகள், தந்தையின் உதவி.' },
  12: { en: 'Expenses are likely to rise.', ta: 'செலவுகள் உயர வாய்ப்பு.' },
};

// Fields tradition associates with each planet, for work and for study
export const PLANET_FIELDS = {
  sun: { work: { en: 'government, administration, management, medicine, politics', ta: 'அரசுப் பணி, நிர்வாகம், மேலாண்மை, மருத்துவம், அரசியல்' }, study: { en: 'medicine, public administration, political science, management', ta: 'மருத்துவம், பொது நிர்வாகம், அரசியல் அறிவியல், மேலாண்மை' } },
  moon: { work: { en: 'nursing and care work, hospitality, food business, psychology, public-facing roles', ta: 'செவிலியர், பராமரிப்புப் பணி, விருந்தோம்பல், உணவுத் தொழில், உளவியல், மக்கள் தொடர்புப் பணி' }, study: { en: 'nursing, psychology, hotel management, nutrition', ta: 'செவிலியம், உளவியல், ஹோட்டல் மேலாண்மை, ஊட்டச்சத்து' } },
  mars: { work: { en: 'engineering, surgery, police and defence, sports, construction and real estate', ta: 'பொறியியல், அறுவை சிகிச்சை, காவல், ராணுவம், விளையாட்டு, கட்டுமானம், ரியல் எஸ்டேட்' }, study: { en: 'engineering, surgery and medicine, sports science, defence', ta: 'பொறியியல், அறுவை சிகிச்சை, மருத்துவம், விளையாட்டு அறிவியல், பாதுகாப்புப் படிப்பு' } },
  mercury: { work: { en: 'commerce, accounting, IT and software, writing, media, trading', ta: 'வணிகம், கணக்கியல், ஐ.டி., மென்பொருள், எழுத்து, ஊடகம், வர்த்தகம்' }, study: { en: 'commerce, accounting, mathematics, computer science, journalism', ta: 'வணிகவியல், கணக்கியல், கணிதம், கணினி அறிவியல், இதழியல்' } },
  jupiter: { work: { en: 'teaching, law, banking and finance, advisory and consulting, charitable work', ta: 'கற்பித்தல், சட்டம், வங்கி, நிதி, ஆலோசனை, தொண்டுப் பணி' }, study: { en: 'law, finance and economics, education, philosophy', ta: 'சட்டம், நிதி, பொருளாதாரம், கல்வியியல், தத்துவம்' } },
  venus: { work: { en: 'arts, design, fashion, film and music, beauty, luxury and hospitality', ta: 'கலை, வடிவமைப்பு, ஃபேஷன், திரைப்படம், இசை, அழகுக்கலை, ஆடம்பரத் தொழில்' }, study: { en: 'fine arts, design, music, fashion, architecture', ta: 'நுண்கலை, வடிவமைப்பு, இசை, ஃபேஷன், கட்டடக்கலை' } },
  saturn: { work: { en: 'engineering and manufacturing, mining and energy, law and justice, public service, operations', ta: 'பொறியியல், உற்பத்தி, சுரங்கம், எரிசக்தி, சட்டம், நீதி, பொதுச் சேவை, செயல்பாட்டுப் பணி' }, study: { en: 'civil or mechanical engineering, law, public administration', ta: 'சிவில், இயந்திரப் பொறியியல், சட்டம், பொது நிர்வாகம்' } },
  rahu: { work: { en: 'technology, foreign or multinational companies, aviation, electronics, unconventional fields', ta: 'தொழில்நுட்பம், வெளிநாட்டு / பன்னாட்டு நிறுவனங்கள், விமானத் துறை, மின்னணுவியல், மாறுபட்ட துறைகள்' }, study: { en: 'computer science, electronics, aviation, data science', ta: 'கணினி அறிவியல், மின்னணுவியல், விமானவியல், தரவு அறிவியல்' } },
  ketu: { work: { en: 'research, programming, medicine (including alternative medicine), spiritual work', ta: 'ஆராய்ச்சி, நிரலாக்கம், மருத்துவம் (மாற்று மருத்துவம் உட்பட), ஆன்மிகப் பணி' }, study: { en: 'research sciences, computer programming, medicine', ta: 'ஆராய்ச்சி அறிவியல், கணினி நிரலாக்கம், மருத்துவம்' } },
};
