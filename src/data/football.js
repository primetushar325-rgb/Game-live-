/* Football player battle — sample data with country flags; images are
   user-replaceable placeholders (no copyrighted assets bundled). */

const F = [
  ['Cristiano Ronaldo', 'Portugal', 'CR7'],
  ['Lionel Messi', 'Argentina', 'La Pulga'],
  ['Kylian Mbappé', 'France', 'MB'],
  ['Erling Haaland', 'Norway', 'Haa'],
  ['Jude Bellingham', 'England', 'Jude'],
  ['Vinícius Júnior', 'Brazil', 'Vini'],
  ['Rodrygo', 'Brazil', 'Rodrygo'],
  ['Kai Havertz', 'Germany', 'Kai'],
  ['Jamal Musiala', 'Germany', 'Musiala'],
  ['Jude Bell', 'England', 'Jude Bell'],
  ['Bukayo Saka', 'England', 'Saka'],
  ['Mohamed Salah', 'Egypt', 'Salah'],
  ['Sadio Mané', 'Senegal', 'Mané'],
  ['Harry Kane', 'England', 'Kane'],
  ['Kevin De Bruyne', 'Belgium', 'KDB'],
  ['Neymar', 'Brazil', 'Neymar'],
  ['Luis Suárez', 'Uruguay', 'Suárez'],
  ['Antoine Griezmann', 'France', 'Grizi'],
  ['Harry Maguire', 'England', 'Maguire'],
  ['Sofyan Amrabat', 'Morocco', 'Amrabat'],
  ['Achraf Hakimi', 'Morocco', 'Hakimi'],
  ['Yamal', 'Spain', 'Yamal'],
  ['Pedri', 'Spain', 'Pedri'],
  ['Gavi', 'Spain', 'Gavi'],
  ['Federico Chiesa', 'Italy', 'Chiesa'],
  ['Lautaro Martínez', 'Argentina', 'Lau'],
  ['Enzo Fernández', 'Argentina', 'Enzo'],
  ['Aleksandar Mitrović', 'Serbia', 'Mitro'],
  ['Romelu Lukaku', 'Belgium', 'Lukaku'],
  ['Son Heung-min', 'South Korea', 'Son'],
  ['Mohammed Kudus', 'Ghana', 'Kudus'],
  ['Viktor Gyökeres', 'Sweden', 'Gyökeres'],
  ['Igor Thiago', 'Brazil', 'Igor'],
  ['Takefusa Kubo', 'Japan', 'Kubo'],
];

const FLAG_BY_COUNTRY = null; // resolved in content store via country code lookup

export const FOOTBALL = F.map(([name, country, tag], i) => ({
  id: `f_${i}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
  kind: 'football',
  name,
  sub: country,
  country,
  tag,
  emoji: null,
  image: null,
  color: null,
  enabled: true,
  index: i,
}));

export { FLAG_BY_COUNTRY };
