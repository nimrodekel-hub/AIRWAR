// Per-country configuration for the generalized AIRWAR pack builder
// (tools/build-pack.js). Each entry maps a Natural Earth ADMIN name to a
// game country id, plus Hebrew labels for the country, its neighbours and
// its major cities. Geometry / elevation / target seeding are automatic;
// only naming and hostile-eligibility hints live here.

// Hebrew names for European admin-0 countries (home + any neighbour that
// can appear in a frame). Fallback is the English name when absent.
const COUNTRY_HE = {
  'Ukraine': 'אוקראינה', 'Russia': 'רוסיה', 'Belarus': 'בלארוס',
  'Poland': 'פולין', 'Slovakia': 'סלובקיה', 'Hungary': 'הונגריה',
  'Romania': 'רומניה', 'Moldova': 'מולדובה', 'Germany': 'גרמניה',
  'France': 'צרפת', 'Czechia': 'צכיה', 'Czech Republic': 'צכיה',
  'Austria': 'אוסטריה', 'Switzerland': 'שווייץ', 'Netherlands': 'הולנד',
  'Belgium': 'בלגיה', 'Denmark': 'דנמרק', 'Luxembourg': 'לוקסמבורג',
  'Lithuania': 'ליטא', 'Latvia': 'לטביה', 'Estonia': 'אסטוניה',
  'Spain': 'ספרד', 'Italy': 'איטליה', 'United Kingdom': 'בריטניה',
  'Ireland': 'אירלנד', 'Slovenia': 'סלובניה', 'Croatia': 'קרואטיה',
  'Serbia': 'סרביה', 'Bulgaria': 'בולגריה', 'Andorra': 'אנדורה',
  'Monaco': 'מונקו', 'San Marino': 'סן מרינו', 'Liechtenstein': 'ליכטנשטיין',
  'Norway': 'נורווגיה', 'Sweden': 'שוודיה', 'Turkey': 'טורקיה',
  'Greece': 'יוון', 'Portugal': 'פורטוגל'
};

// Hebrew names for the major cities used as strategic targets.
const CITY_HE = {
  // Ukraine
  'Kyiv': 'קייב', 'Kiev': 'קייב', 'Kharkiv': 'חרקוב', 'Odessa': 'אודסה',
  'Odesa': 'אודסה', 'Dnipropetrovsk': 'דנייפרו', 'Dnipro': 'דנייפרו',
  'Donetsk': 'דונייצק', 'Lviv': 'לבוב', 'Zaporizhzhya': 'זפוריז׳יה',
  'Zaporizhzhia': 'זפוריז׳יה', 'Mykolayiv': 'מיקולאיב', 'Mariupol': 'מריופול',
  'Kryvyy Rih': 'קריבי ריה', 'Kryvyi Rih': 'קריבי ריה',
  // Poland
  'Warsaw': 'ורשה', 'Kraków': 'קרקוב', 'Krakow': 'קרקוב', 'Cracow': 'קרקוב',
  'Łódź': 'לודז', 'Lodz': 'לודז', 'Wrocław': 'ורוצלב', 'Wroclaw': 'ורוצלב',
  'Poznań': 'פוזנן', 'Poznan': 'פוזנן', 'Gdańsk': 'גדנסק', 'Gdansk': 'גדנסק',
  'Szczecin': 'שצצין', 'Lublin': 'לובלין', 'Katowice': 'קטוביץ',
  // Germany
  'Berlin': 'ברלין', 'Hamburg': 'המבורג', 'Munich': 'מינכן', 'München': 'מינכן',
  'Cologne': 'קלן', 'Köln': 'קלן', 'Frankfurt': 'פרנקפורט', 'Stuttgart': 'שטוטגרט',
  'Düsseldorf': 'דיסלדורף', 'Dusseldorf': 'דיסלדורף', 'Dortmund': 'דורטמונד',
  'Essen': 'אסן', 'Leipzig': 'לייפציג', 'Bremen': 'ברמן', 'Dresden': 'דרזדן',
  'Hannover': 'האנובר', 'Nuremberg': 'נירנברג', 'Nürnberg': 'נירנברג',
  // France
  'Paris': 'פריז', 'Marseille': 'מרסיי', 'Lyon': 'ליון', 'Toulouse': 'טולוז',
  'Nice': 'ניס', 'Nantes': 'נאנט', 'Strasbourg': 'שטרסבורג', 'Bordeaux': 'בורדו',
  'Lille': 'ליל', 'Montpellier': 'מונפלייה', 'Rennes': 'רן', 'Le Havre': 'לה האבר'
};

// Starter set. `admin` must match Natural Earth ADMIN exactly.
// `center` (optional) overrides the auto capital-based frame centre with
// an explicit [lon, lat] when the capital sits off to one side.
const CONFIGS = {
  ua: { id: 'ua', admin: 'Ukraine', nameHe: 'אוקראינה' },
  pl: { id: 'pl', admin: 'Poland',  nameHe: 'פולין' },
  de: { id: 'de', admin: 'Germany', nameHe: 'גרמניה' },
  fr: { id: 'fr', admin: 'France',  nameHe: 'צרפת', center: [2.6, 46.6] }
};

module.exports = { COUNTRY_HE, CITY_HE, CONFIGS };
