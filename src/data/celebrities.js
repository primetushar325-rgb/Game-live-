/* Celebrity battle — placeholders by design (copyright-safe).
   Add real names + images in the Content Manager. */

const CE = [
  ['Celebrity One', 'Icon'],
  ['Celebrity Two', 'Star'],
  ['Celebrity Three', 'Legend'],
  ['Celebrity Four', 'Vocalist'],
  ['Celebrity Five', 'Actor'],
  ['Celebrity Six', 'Queen'],
  ['Celebrity Seven', 'King'],
  ['Celebrity Eight', 'Global'],
  ['Celebrity Nine', 'Iconic'],
  ['Celebrity Ten', 'Champion'],
  ['Celebrity Eleven', 'Superstar'],
  ['Celebrity Twelve', 'Phenomenon'],
  ['Celebrity Thirteen', 'Idol'],
  ['Celebrity Fourteen', 'Star'],
  ['Celebrity Fifteen', 'Face'],
  ['Celebrity Sixteen', 'Master'],
];

export const CELEBRITIES = CE.map(([name, sub], i) => ({
  id: `ce_${i}`,
  kind: 'celebrity',
  name,
  sub,
  emoji: null,
  image: null,
  color: null,
  enabled: true,
  index: i,
}));
