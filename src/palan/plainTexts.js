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

// [expect, do] per tone
export const HOUSE_PLAIN = [
  null,
  {
    good: { en: ['You feel confident and noticed; personal plans move forward.', 'Take the lead on things you have been putting off.'], ta: ['தன்னம்பிக்கை கூடும்; உங்கள் சொந்தத் திட்டங்கள் முன்னேறும்.', 'தள்ளிப்போட்ட காரியங்களை முன்னின்று தொடங்குங்கள்.'] },
    hard: { en: ['You may feel under pressure or unsure of yourself.', 'Keep routines simple, rest well and avoid ego clashes.'], ta: ['அழுத்தமோ தயக்கமோ உணரலாம்.', 'எளிய நடைமுறை, போதுமான ஓய்வு; வீண் கௌரவப் போட்டிகளைத் தவிருங்கள்.'] },
  },
  {
    good: { en: ['Savings grow and family life is warm; your words carry weight.', 'Save regularly and spend time with family.'], ta: ['சேமிப்பு வளரும்; குடும்பத்தில் அன்பு நிலவும்; உங்கள் சொல்லுக்கு மதிப்பு.', 'தவறாமல் சேமியுங்கள்; குடும்பத்துடன் நேரம் செலவிடுங்கள்.'] },
    hard: { en: ['Money may feel tight, or family talks may get tense.', 'Watch spending and think before you speak.'], ta: ['பணம் இறுக்கமாக இருக்கலாம் அல்லது குடும்பப் பேச்சில் பதற்றம் வரலாம்.', 'செலவைக் கவனியுங்கள்; பேசும் முன் யோசியுங்கள்.'] },
  },
  {
    good: { en: ['Good energy for new efforts, short trips, writing or selling; siblings help.', 'Start that side project, pitch your ideas, travel for opportunities.'], ta: ['புதிய முயற்சிகள், குறுகிய பயணம், எழுத்து, விற்பனைக்கு நல்ல உற்சாகம்; உடன்பிறப்புகள் உதவுவர்.', 'பக்க முயற்சியைத் தொடங்குங்கள்; உங்கள் யோசனைகளை முன்வையுங்கள்.'] },
    hard: { en: ['Efforts need extra push; misunderstandings with siblings or neighbours are possible.', 'Be patient and double-check messages and contracts.'], ta: ['முயற்சிகளுக்கு கூடுதல் உழைப்பு தேவை; உடன்பிறப்புகள், அண்டை வீட்டாருடன் தவறான புரிதல் வரலாம்.', 'பொறுமை; செய்திகள், ஒப்பந்தங்களை இருமுறை சரிபாருங்கள்.'] },
  },
  {
    good: { en: ['Home life is comfortable; buying a house or vehicle is favoured.', 'Good time for property, home improvements and time with your mother.'], ta: ['வீட்டில் சுகம்; வீடு, வாகனம் வாங்க சாதகம்.', 'சொத்து, வீட்டுப் பணிகள், தாயுடன் நேரம் செலவிட நல்ல காலம்.'] },
    hard: { en: ['Home matters or property may cause worry; peace of mind needs care.', 'Avoid hasty property deals; keep home calm.'], ta: ['வீட்டு விஷயங்கள் அல்லது சொத்து கவலை தரலாம்; மன நிம்மதியில் கவனம்.', 'அவசர சொத்து ஒப்பந்தங்களைத் தவிருங்கள்; வீட்டில் அமைதி காருங்கள்.'] },
  },
  {
    good: { en: ['Good news about children, studies or creative work; investments can do well.', 'Study, create, and plan long-term investments.'], ta: ['குழந்தைகள், கல்வி, படைப்புப் பணியில் நல்ல செய்தி; முதலீடுகள் பலன் தரலாம்.', 'படியுங்கள், படையுங்கள்; நீண்டகால முதலீடுகளைத் திட்டமிடுங்கள்.'] },
    hard: { en: ['Children or studies may need extra attention; speculative investments are risky.', 'Avoid risky trading; give time to children.'], ta: ['குழந்தைகள் அல்லது கல்விக்கு கூடுதல் கவனம் தேவை; ஊக முதலீடுகள் ஆபத்து.', 'அபாயமான வர்த்தகம் வேண்டாம்; குழந்தைகளுக்கு நேரம் கொடுங்கள்.'] },
  },
  {
    good: { en: ['You beat competition and clear obstacles; good for exams, jobs and paying off loans.', 'Face challenges head-on and clear debts.'], ta: ['போட்டியை வெல்வீர்கள்; தடைகள் விலகும்; தேர்வு, வேலை, கடன் அடைப்புக்கு நல்லது.', 'சவால்களை நேரடியாக எதிர்கொள்ளுங்கள்; கடன்களை அடையுங்கள்.'] },
    hard: { en: ['Workload, disputes or loans may weigh on you.', 'Avoid new loans and arguments; keep a steady routine.'], ta: ['வேலைச்சுமை, வாக்குவாதம் அல்லது கடன் சுமையாக இருக்கலாம்.', 'புதிய கடன், வாக்குவாதங்களைத் தவிருங்கள்; சீரான நடைமுறை.'] },
  },
  {
    good: { en: ['Relationships and partnerships go well; marriage talks or a new business partner are favoured.', 'Invest time in your partner; sign partnerships with care.'], ta: ['உறவுகள், கூட்டாண்மை நன்றாக அமையும்; திருமணப் பேச்சு, புதிய கூட்டாளிக்கு சாதகம்.', 'துணைக்கு நேரம் கொடுங்கள்; கூட்டு ஒப்பந்தங்களைக் கவனமாகச் செய்யுங்கள்.'] },
    hard: { en: ['Partnerships need patience; misunderstandings with spouse or partners are possible.', 'Listen more, avoid ultimatums, read agreements carefully.'], ta: ['உறவுகளில் பொறுமை தேவை; துணை, கூட்டாளிகளுடன் தவறான புரிதல் வரலாம்.', 'அதிகம் கேளுங்கள்; பிடிவாதம் வேண்டாம்; ஒப்பந்தங்களை நன்கு படியுங்கள்.'] },
  },
  {
    good: { en: ['Unexpected gains are possible, such as inheritance, insurance or a breakthrough in research.', 'Good time for research and deep study.'], ta: ['பரம்பரைச் சொத்து, காப்பீடு, ஆராய்ச்சி போன்ற எதிர்பாராத லாபம் வரலாம்.', 'ஆராய்ச்சி, ஆழ்ந்த படிப்புக்கு நல்ல காலம்.'] },
    hard: { en: ['Sudden changes or setbacks; things may not go to plan.', 'Keep an emergency fund, avoid risky ventures and double-check paperwork.'], ta: ['திடீர் மாற்றங்கள், பின்னடைவுகள்; திட்டப்படி நடக்காமல் போகலாம்.', 'அவசர நிதி வைத்திருங்கள்; ஆபத்தான முயற்சிகள் வேண்டாம்; ஆவணங்களைச் சரிபாருங்கள்.'] },
  },
  {
    good: { en: ['Luck is on your side; help from elders, teachers or your father; long journeys or pilgrimages.', 'Seek advice from mentors; plan a pilgrimage or higher studies.'], ta: ['அதிர்ஷ்டம் துணை நிற்கும்; பெரியோர், ஆசிரியர், தந்தையின் உதவி; நீண்ட பயணம், தீர்த்த யாத்திரை.', 'வழிகாட்டிகளின் ஆலோசனை பெறுங்கள்; யாத்திரை அல்லது உயர்கல்வி திட்டமிடுங்கள்.'] },
    hard: { en: ['Luck feels slow; differences with your father or mentors are possible.', 'Stay humble and keep faith in long-term plans.'], ta: ['அதிர்ஷ்டம் மெதுவாக இருக்கும்; தந்தை, வழிகாட்டிகளுடன் கருத்து வேறுபாடு வரலாம்.', 'பணிவுடன் இருங்கள்; நீண்டகாலத் திட்டங்களில் நம்பிக்கை வையுங்கள்.'] },
  },
  {
    good: { en: ['Career growth, recognition or a better role is likely.', 'Ask for the promotion, apply for the role, or start the venture.'], ta: ['தொழில் வளர்ச்சி, அங்கீகாரம், நல்ல பதவி வரலாம்.', 'பதவி உயர்வு கேளுங்கள்; புதிய வேலை அல்லது தொழிலைத் தொடங்குங்கள்.'] },
    hard: { en: ['Work pressure or a slower career phase.', 'Build skills, avoid clashes with bosses, and don’t quit in haste.'], ta: ['வேலை அழுத்தம் அல்லது தொழிலில் மந்த நிலை.', 'திறமையை வளருங்கள்; மேலதிகாரிகளுடன் மோதல் வேண்டாம்; அவசரமாக வேலையை விடாதீர்கள்.'] },
  },
  {
    good: { en: ['Income rises and wishes come true; friends and contacts help.', 'Network, ask for support and set bigger goals.'], ta: ['வருமானம் உயரும்; ஆசைகள் நிறைவேறும்; நண்பர்கள் உதவுவர்.', 'தொடர்புகளை வளருங்கள்; உதவி கேளுங்கள்; பெரிய இலக்குகளை வையுங்கள்.'] },
    hard: { en: ['Gains come slower than hoped; some friends may disappoint.', 'Keep expectations realistic and build more than one source of income.'], ta: ['லாபம் எதிர்பார்த்ததை விட மெதுவாக வரும்; சில நண்பர்கள் ஏமாற்றலாம்.', 'யதார்த்தமான எதிர்பார்ப்பு; ஒன்றுக்கு மேற்பட்ட வருமான வழிகள்.'] },
  },
  {
    good: { en: ['Travel abroad, worthwhile spending (home, family, charity) and inner peace.', 'Good time for foreign plans, retreats and charity.'], ta: ['வெளிநாட்டுப் பயணம், நல்ல செலவுகள் (வீடு, குடும்பம், தானம்), மன அமைதி.', 'வெளிநாட்டுத் திட்டங்கள், ஆன்மிகப் பயணம், தானத்துக்கு நல்ல காலம்.'] },
    hard: { en: ['Expenses rise and sleep or peace of mind may suffer.', 'Budget carefully, avoid lending money, and make time to rest.'], ta: ['செலவுகள் கூடும்; தூக்கம், மன நிம்மதி பாதிக்கலாம்.', 'கவனமாக பட்ஜெட்; கடன் கொடுக்காதீர்கள்; ஓய்வுக்கு நேரம்.'] },
  },
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
  sat8: { en: ['Saturn is in a testing position for you: obstacles and delays are likely.', 'Be cautious with money, travel and new ventures; keep paperwork in order.'], ta: ['சனி சோதனையான நிலையில்: தடைகள், தாமதங்கள் வரலாம்.', 'பணம், பயணம், புதிய முயற்சிகளில் எச்சரிக்கை; ஆவணங்களைச் சரியாக வையுங்கள்.'] },
  satGood: { en: ['Saturn is helping you: steady effort brings success and gains.', 'A good time to work hard on long-term goals.'], ta: ['சனி உங்களுக்கு உதவுகிறார்: நிலையான முயற்சி வெற்றியும் லாபமும் தரும்.', 'நீண்டகால இலக்குகளில் கடுமையாக உழைக்க நல்ல காலம்.'] },
  satMixed: { en: ['Saturn gives mixed results for you now.', 'Keep a steady pace; avoid big gambles.'], ta: ['சனி இப்போது கலவையான பலன் தருகிறார்.', 'நிலையான வேகம்; பெரிய சூதாட்டங்கள் வேண்டாம்.'] },
  jupGood: { en: ['Jupiter is favourable: growth, good news and help from elders are more likely.', 'Good time to start important things, hold marriage talks or invest.'], ta: ['குரு சாதகம்: வளர்ச்சி, நல்ல செய்தி, பெரியோர் ஆதரவு.', 'முக்கிய காரியங்கள் தொடங்க, திருமணப் பேச்சு, முதலீட்டுக்கு நல்ல காலம்.'] },
  jupWeak: { en: ['Jupiter is less supportive: growth is slower for now.', 'Be patient with big plans; prepare rather than launch.'], ta: ['குரு குறைந்த ஆதரவு: வளர்ச்சி இப்போது மெதுவாக இருக்கும்.', 'பெரிய திட்டங்களில் பொறுமை; தொடங்குவதை விடத் தயார் செய்யுங்கள்.'] },
  rahuGood: { en: ['Raagu favours bold moves and unusual opportunities.', 'Say yes to new, unconventional openings, with care.'], ta: ['ராகு துணிச்சலான முயற்சிகள், மாறுபட்ட வாய்ப்புகளுக்கு சாதகம்.', 'புதிய, மாறுபட்ட வாய்ப்புகளை கவனத்துடன் ஏற்றுக்கொள்ளுங்கள்.'] },
  rahuWeak: { en: ['Raagu may bring restlessness or confusion.', 'Avoid hasty decisions and get-rich-quick offers.'], ta: ['ராகு அமைதியின்மை அல்லது குழப்பம் தரலாம்.', 'அவசர முடிவுகள், விரைவுப் பணக்கார வாய்ப்புகளைத் தவிருங்கள்.'] },
};

export const TONE = {
  good: { en: '🟢 Favourable', ta: '🟢 சாதகம்' },
  mixed: { en: '🟡 Mixed', ta: '🟡 கலவை' },
  hard: { en: '🟠 Needs care', ta: '🟠 கவனம் தேவை' },
};

export const STUDIES = {
  good: { en: ['Learning comes easily; exams, courses and new skills go well.', 'Sign up for that course or exam; this is a good time to learn.'], ta: ['கல்வி எளிதாக வரும்; தேர்வுகள், படிப்புகள், புதிய திறன்கள் நன்றாக அமையும்.', 'அந்தப் படிப்பு அல்லது தேர்வுக்கு பதிவு செய்யுங்கள்; கற்க நல்ல காலம்.'] },
  hard: { en: ['Studies need more discipline; distractions or changes of course are possible.', 'Keep a fixed study routine and ask teachers for help early.'], ta: ['கல்விக்கு அதிக ஒழுக்கம் தேவை; கவனச் சிதறல் அல்லது பாட மாற்றம் வரலாம்.', 'நிலையான படிப்பு நேரம்; ஆசிரியர்களிடம் முன்கூட்டியே உதவி கேளுங்கள்.'] },
};
