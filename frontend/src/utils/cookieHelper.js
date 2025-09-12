// utils/cookieHelper.js
export function setSessionCookie(name, value) {
  document.cookie = `${name}=${value}; path=/`; 
  // no expires/max-age => session cookie
}

export function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}
