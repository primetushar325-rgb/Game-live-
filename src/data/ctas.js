/* Dynamic CTA system.
 * - COMMENT_CTA[category]: category-aware "comment your X" messages
 *   (shown during battle, non-blocking, and as the first CTA phase).
 * - CTA_TEMPLATES: between-match CTA phases. The WINNER→CTA sequence plays:
 *   comment CTA (category-aware) -> SUBSCRIBE -> LIKE/FOLLOW.
 * Icons reference the premium SVG icon set (src/ui/icons.js) — never emoji. */

export const COMMENT_CTA = {
  countries: [
    { text: 'COMMENT YOUR COUNTRY BELOW!', sub: 'We are watching the chat', color: '#22e584', anim: 'cta-slide', icon: 'comment' },
    { text: 'WHERE ARE YOU WATCHING FROM?', sub: 'Drop your flag in the comments', color: '#22e584', anim: 'cta-pop', icon: 'flag' },
    { text: 'COMMENT YOUR COUNTRY!', sub: 'Every nation has a chance to survive', color: '#22e584', anim: 'cta-zoom', icon: 'comment' },
    { text: 'SUPPORT YOUR COUNTRY!', sub: 'Type its name to keep it in the fight', color: '#22e584', anim: 'cta-slide', icon: 'users' },
  ],
  football: [
    { text: 'COMMENT YOUR FAVORITE PLAYER!', sub: 'Who rules the pitch?', color: '#ffcf4d', anim: 'cta-slide', icon: 'comment' },
    { text: 'WHO IS THE GOAT?', sub: 'Settle it in the comments', color: '#ffcf4d', anim: 'cta-pop', icon: 'star' },
    { text: 'COMMENT YOUR FAVORITE FOOTBALLER!', sub: 'Legacy or current era?', color: '#ffcf4d', anim: 'cta-zoom', icon: 'football' },
  ],
  youtubers: [
    { text: 'COMMENT YOUR FAVORITE YOUTUBER!', sub: 'Whose content wins today?', color: '#ff3d5a', anim: 'cta-slide', icon: 'comment' },
    { text: 'WHO SHOULD WIN THE NEXT BATTLE?', sub: 'Vote in the comments', color: '#ff3d5a', anim: 'cta-pop', icon: 'youtube' },
    { text: 'SUBSCRIBE TO YOUR FAVORITE!', sub: 'Then come back and fight for them', color: '#ff3d5a', anim: 'cta-zoom', icon: 'bell' },
  ],
  social: [
    { text: 'COMMENT YOUR FAVORITE SOCIAL MEDIA!', sub: 'Which platform owns you?', color: '#22d3ee', anim: 'cta-slide', icon: 'comment' },
    { text: 'WHICH PLATFORM DO YOU USE MOST?', sub: 'Be honest in the chat', color: '#22d3ee', anim: 'cta-pop', icon: 'phone' },
  ],
  games: [
    { text: 'COMMENT YOUR FAVORITE GAME!', sub: 'The arena never sleeps', color: '#8b5cf6', anim: 'cta-slide', icon: 'comment' },
    { text: 'WHICH GAME IS THE BEST RIGHT NOW?', sub: 'Argue it below', color: '#8b5cf6', anim: 'cta-zoom', icon: 'gamepad' },
  ],
  celebrities: [
    { text: 'COMMENT YOUR FAVORITE STAR!', sub: 'Who deserves the crown?', color: '#f472b6', anim: 'cta-slide', icon: 'star' },
  ],
  custom: [
    { text: 'COMMENT YOUR FAVORITE!', sub: 'Who should survive?', color: '#22e584', anim: 'cta-slide', icon: 'comment' },
  ],
  quick: [
    { text: 'COMMENT YOUR PICK!', sub: 'Who will survive?', color: '#38b6ff', anim: 'cta-slide', icon: 'comment' },
  ],
  random: [
    { text: 'WHO DO YOU THINK WILL WIN?', sub: 'Drop your prediction below', color: '#ffcf4d', anim: 'cta-pop', icon: 'target' },
  ],
};

export const CTA_TEMPLATES = [
  { id: 'subscribe', text: 'SUBSCRIBE FOR MORE BATTLES!', sub: 'New arenas drop every day', color: '#ff3d5a', anim: 'cta-pop', icon: 'youtube' },
  { id: 'like', text: 'LIKE THE LIVE!', sub: 'Every like keeps the arena alive', color: '#38b6ff', anim: 'cta-slide', icon: 'heart' },
  { id: 'follow', text: 'FOLLOW FOR MORE BATTLES!', sub: 'Never miss a live elimination', color: '#8b5cf6', anim: 'cta-zoom', icon: 'bell' },
  { id: 'share', text: 'SHARE THIS LIVE!', sub: 'Bring your squad into the arena', color: '#22d3ee', anim: 'cta-pop', icon: 'share' },
  { id: 'thanks', text: 'THANKS FOR WATCHING!', sub: 'BattleLoop Live — who will survive?', color: '#f472b6', anim: 'cta-slide', icon: 'star' },
];

/** The sequential post-winner sequence (shown one at a time during CTA):
 *  comment CTA (category-aware) -> SUBSCRIBE -> LIKE/FOLLOW. */
export function ctaSequence(category, { commentCta = true, subscribeCta = true } = {}) {
  const seq = [];
  if (commentCta) {
    const list = COMMENT_CTA[category] || COMMENT_CTA.random;
    seq.push(list[Math.floor(Math.random() * list.length)]);
  }
  const rest = CTA_TEMPLATES.filter((c) => c.id !== 'thanks');
  const shuffled = [...rest].sort(() => Math.random() - 0.5);
  if (subscribeCta) seq.push(rest.find((c) => c.id === 'subscribe'));
  seq.push(shuffled[0]);
  return seq.filter(Boolean);
}
