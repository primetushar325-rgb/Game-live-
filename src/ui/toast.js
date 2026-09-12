/* Single reusable toast (bottom, non-blocking). */

export function makeToast(root) {
  let el = null;
  let h = null;
  return function toast(msg, ms = 2600) {
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      root.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(h);
    h = setTimeout(() => el.classList.remove('show'), ms);
  };
}
