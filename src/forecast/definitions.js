// Explicit, testable definitions for every event kind the site forecasts or
// tests. Written BEFORE any tuning (see AUDIT.md, "Evaluation protocol").
//
// Each definition fixes:
//   yes / no      what resolves a forecast as having happened or not
//   unknown       when the honest answer is "don't know" (excluded from scoring)
//   eligible      who can have the event: age range [min, max] in years, and
//                 whether a repeat counts (repeatable). A non-repeatable kind
//                 that already happened makes the person ineligible.
//   horizonMonths forecast horizon; toleranceDays slack at the window edges
// Dates: a month-precision date resolves to that month. A year-only date is
// "weak": it says the event happened somewhere in that calendar year, and
// month-level tests treat those 12 months as unknown, never as non-events.
// A kind the person did not answer about is unknown, never "did not happen".

export const DEF_VERSION = 1;
export const HORIZON_MONTHS = 12;
export const TOLERANCE_DAYS = 15;

const d = (age, repeatable, en, ta) => ({ age, repeatable, horizonMonths: HORIZON_MONTHS, toleranceDays: TOLERANCE_DAYS, en, ta });

export const EVENT_DEFS = {
  marriage: d([18, 60], false,
    { yes: 'You had a legal or religious wedding ceremony.', no: 'No wedding took place.', unknown: 'Engagement only, or you are not sure.' },
    { yes: 'சட்டப்படி அல்லது சமய முறைப்படி திருமணம் நடந்தது.', no: 'திருமணம் நடக்கவில்லை.', unknown: 'நிச்சயதார்த்தம் மட்டும், அல்லது உறுதியில்லை.' }),
  childbirth: d([18, 50], true,
    { yes: 'Your child was born (or adopted).', no: 'No child was born or adopted.', unknown: 'Not sure.' },
    { yes: 'உங்கள் குழந்தை பிறந்தது (அல்லது தத்தெடுத்தீர்கள்).', no: 'குழந்தை பிறக்கவில்லை / தத்தெடுக்கவில்லை.', unknown: 'உறுதியில்லை.' }),
  jobChange: d([18, 70], true,
    { yes: 'You started work with a different employer (or left a job for a new one).', no: 'Same employer throughout (an internal move does not count).', unknown: 'Not sure, or an offer was accepted but you have not started.' },
    { yes: 'வேறொரு நிறுவனத்தில் வேலை தொடங்கினீர்கள்.', no: 'அதே நிறுவனம் (உள் மாற்றம் கணக்கில் இல்லை).', unknown: 'உறுதியில்லை, அல்லது ஏற்றுக்கொண்டும் இன்னும் தொடங்கவில்லை.' }),
  promotion: d([18, 70], true,
    { yes: 'A formal promotion (new title or grade) or a pay rise of 10% or more.', no: 'Neither happened.', unknown: 'Not sure.' },
    { yes: 'முறையான பதவி உயர்வு அல்லது 10% அல்லது அதற்கு மேல் சம்பள உயர்வு.', no: 'இரண்டும் நடக்கவில்லை.', unknown: 'உறுதியில்லை.' }),
  business: d([18, 75], true,
    { yes: 'You registered a business or signed a business partnership.', no: 'Neither happened.', unknown: 'Only planning, or not sure.' },
    { yes: 'தொழிலைப் பதிவு செய்தீர்கள் அல்லது கூட்டுத் தொழில் ஒப்பந்தம் செய்தீர்கள்.', no: 'இரண்டும் நடக்கவில்லை.', unknown: 'திட்டம் மட்டும், அல்லது உறுதியில்லை.' }),
  property: d([18, 90], true,
    { yes: 'A purchase of a house, flat or land was completed (registration or closing). Vehicles do not count.', no: 'No property purchase completed.', unknown: 'Booked or in progress, or not sure.' },
    { yes: 'வீடு, அடுக்ககம் அல்லது நிலம் வாங்குவது பதிவு / முடிவு ஆனது. வாகனம் கணக்கில் இல்லை.', no: 'சொத்து வாங்குவது முடியவில்லை.', unknown: 'முன்பதிவு / நடைமுறையில், அல்லது உறுதியில்லை.' }),
  homeMove: d([18, 90], true,
    { yes: 'You changed your home address for at least 3 months.', no: 'Same home address.', unknown: 'Temporary stay, or not sure.' },
    { yes: 'குறைந்தது 3 மாதங்களுக்கு வீட்டு முகவரி மாறியது.', no: 'அதே முகவரி.', unknown: 'தற்காலிகத் தங்கல், அல்லது உறுதியில்லை.' }),
  travel: d([18, 80], true,
    { yes: 'You relocated to another country, or more than 500 km away, for at least 6 months.', no: 'No such relocation (holidays and trips do not count).', unknown: 'Not sure.' },
    { yes: 'குறைந்தது 6 மாதங்களுக்கு வேறு நாட்டுக்கு அல்லது 500 கி.மீ.க்கு மேல் இடம் பெயர்ந்தீர்கள்.', no: 'அப்படி இடம் பெயரவில்லை (சுற்றுலா கணக்கில் இல்லை).', unknown: 'உறுதியில்லை.' }),
  studies: d([15, 40], true,
    { yes: 'A degree or diploma was awarded, or you passed a major qualifying exam.', no: 'Neither happened.', unknown: 'Results pending, or not sure.' },
    { yes: 'பட்டம் / டிப்ளோமா கிடைத்தது, அல்லது முக்கியத் தேர்வில் வென்றீர்கள்.', no: 'இரண்டும் நடக்கவில்லை.', unknown: 'முடிவு வரவில்லை, அல்லது உறுதியில்லை.' }),
  healthCare: d([0, 120], true,
    { yes: 'You were admitted to hospital overnight, or had surgery under anaesthesia.', no: 'Neither happened.', unknown: 'Not sure.' },
    { yes: 'மருத்துவமனையில் இரவு தங்கினீர்கள், அல்லது மயக்க மருந்துடன் அறுவை சிகிச்சை.', no: 'இரண்டும் நடக்கவில்லை.', unknown: 'உறுதியில்லை.' }),
  safety: d([0, 120], true,
    { yes: 'An injury or accident that needed medical treatment.', no: 'No such injury or accident.', unknown: 'Minor, untreated, or not sure.' },
    { yes: 'மருத்துவ சிகிச்சை தேவைப்பட்ட காயம் அல்லது விபத்து.', no: 'அப்படி எதுவும் இல்லை.', unknown: 'சிறியது, சிகிச்சையில்லை, அல்லது உறுதியில்லை.' }),
  setback: d([18, 120], true,
    { yes: 'A financial loss of 3 months’ income or more (job loss without a new job counts).', no: 'No loss that large.', unknown: 'Not sure of the size.' },
    { yes: '3 மாத வருமானம் அல்லது அதற்கு மேல் பண இழப்பு (புதிய வேலையின்றி வேலை இழப்பும் சேரும்).', no: 'அவ்வளவு இழப்பு இல்லை.', unknown: 'அளவு உறுதியில்லை.' }),
  parents: d([18, 90], true,
    { yes: 'A parent was admitted to hospital for a serious illness, or passed away.', no: 'Neither happened.', unknown: 'Not sure.' },
    { yes: 'பெற்றோர் கடும் நோயால் மருத்துவமனையில் சேர்க்கப்பட்டனர், அல்லது மறைந்தனர்.', no: 'இரண்டும் நடக்கவில்லை.', unknown: 'உறுதியில்லை.' }),
};

/**
 * Is a person eligible for a forecast of this kind at this age, given what
 * they reported? Non-repeatable kinds that already happened are ineligible.
 * @param {string} kind
 * @param {number} age years
 * @param {{year:number, month?:number}[]|undefined} past reported events of this kind
 */
export function eligible(kind, age, past) {
  const def = EVENT_DEFS[kind];
  if (!def) return false;
  if (age < def.age[0] || age > def.age[1]) return false;
  if (!def.repeatable && past && past.length) return false;
  return true;
}

/** Share of reported events that only have a year (weaker evidence). */
export function weakShare(reported) {
  const all = Object.values(reported).flat();
  if (!all.length) return 0;
  return all.filter((e) => !e.month).length / all.length;
}

/** A birth time on the hour or half hour is often rounded. */
export const roundBirthTime = (hh, mm) => Number(mm) === 0 || Number(mm) === 30;
