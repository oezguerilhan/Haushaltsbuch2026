'use strict';

export function openModal(title, html, wide = false) {
  document.getElementById('m-title').textContent = title;
  document.getElementById('m-body').innerHTML = html;
  document.getElementById('modal-box').classList.toggle('wide', wide);
  document.getElementById('modal-ov').classList.add('open');
}

export function closeModal() {
  document.getElementById('modal-ov').classList.remove('open');
  document.getElementById('m-body').innerHTML = '';
}

export function notify(msg, dur = 2800) {
  const n = document.getElementById('notif');
  n.textContent = msg;
  n.classList.add('show');
  clearTimeout(n._t);
  n._t = setTimeout(() => n.classList.remove('show'), dur);
}

export function initModal() {
  document.getElementById('m-close').onclick = closeModal;
  document.getElementById('modal-ov').onclick = e => {
    if (e.target.id === 'modal-ov') closeModal();
  };
}
