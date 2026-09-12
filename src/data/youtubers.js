/* Local, editable YouTuber database (no scraping). Users can replace
   images via the Content Manager. Sub counts / URLs are display-only. */

const Y = [
  ['MrBeast', '290M', 'USA', 'https://youtube.com/@MrBeast'],
  ['PewDiePie', '111M', 'Sweden', 'https://youtube.com/@PewDiePie'],
  ['MKBHD', '20M', 'USA', 'https://youtube.com/@MKBHD'],
  ['Dude Perfect', '62M', 'USA', 'https://youtube.com/@DudePerfect'],
  ['Markiplier', '37M', 'Canada', 'https://youtube.com/@Markiplier'],
  ['Linus Tech Tips', '16M', 'Canada', 'https://youtube.com/@LinusTechTips'],
  ['T-Series', '280M', 'India', 'https://youtube.com/@TSeries'],
  ['WWE', '100M', 'USA', 'https://youtube.com/@WWE'],
  ['Justin Bieber', '60M', 'Canada', 'https://youtube.com/@justinbieber'],
  ['Cocomelon', '185M', 'USA', 'https://youtube.com/@Cocomelon'],
  ['Tiger', '95M', 'USA', 'https://youtube.com/@Tiger'],
  ['Zack D. Filmz', '45M', 'USA', 'https://youtube.com/@ZackDFilmz'],
  ['David Dobrik', '37M', 'USA', 'https://youtube.com/@DavidDobrik'],
  ['NileRed', '40M', 'Canada', 'https://youtube.com/@NileRed'],
  ['Asmongold', '14M', 'USA', 'https://youtube.com/@Asmongold'],
  ['xQc', '5M', 'Canada', 'https://youtube.com/@xQc'],
  ['IShowSpeed', '150M', 'Brazil', 'https://youtube.com/@IShowSpeed'],
  ['Amit Kumar', '55M', 'India', 'https://youtube.com/@AmitKumar'],
  ['Vidyanand Jindal', '12M', 'India', 'https://youtube.com/@VidyanandJindal'],
  ['CarryMinati', '38M', 'India', 'https://youtube.com/@CarryMinati'],
  ['Technical Guruji', '25M', 'India', 'https://youtube.com/@TechnicalGuruji'],
  ['Mothar', '18M', 'India', 'https://youtube.com/@Mothar'],
  ['Sourav Joshi', '20M', 'India', 'https://youtube.com/@SouravJoshi'],
  ['Fazur Rahman', '15M', 'Bangladesh', 'https://youtube.com/@FazurRahman'],
];

export const YOUTUBERS = Y.map(([name, subs, country, url], i) => ({
  id: `y_${i}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
  kind: 'youtuber',
  name,
  sub: `${subs} subs • ${country}`,
  subs,
  country,
  url,
  emoji: null,
  image: null,
  color: null,
  enabled: true,
  index: i,
}));
