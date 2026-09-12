/* Social media platform battle — editable local data (user can import logos). */

const S = [
  ['YouTube', 'Red', '#ff0033'],
  ['Facebook', 'Blue', '#1877f2'],
  ['Instagram', 'Pink', '#e1306c'],
  ['TikTok', 'Black', '#25f4ee'],
  ['X', 'Black', '#94a3b8'],
  ['WhatsApp', 'Green', '#25d366'],
  ['Telegram', 'Sky', '#229ed9'],
  ['Discord', 'Indigo', '#5865f2'],
  ['Reddit', 'Orange', '#ff4500'],
  ['Snapchat', 'Yellow', '#fadb5f'],
  ['Pinterest', 'Red', '#e60023'],
  ['LinkedIn', 'Cyan', '#0a66c2'],
  ['Twitch', 'Purple', '#9146ff'],
  ['Threads', 'White', '#e2e8f0'],
  ['Messenger', 'Blue', '#0084ff'],
  ['Gaming', 'Blue', '#38b6ff'],
];

export const SOCIAL = S.map(([name, _tint, color], i) => ({
  id: `s_${name.toLowerCase()}`,
  kind: 'social',
  name,
  sub: 'platform',
  emoji: null,
  image: null,
  color,
  enabled: true,
  index: i,
}));
