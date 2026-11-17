// Small wrappers around the Android app's native storage, used as a second, safer copy of
// the save and the grown-up's recordings. In a browser these all quietly do nothing.
//
// Why: the game's own storage lives inside the app's web view. App updates keep it, but a
// second copy in native storage (which Android also includes in its own device backup)
// means progress survives even if the web view's data is ever reset.

const plugin = (name) => {
  const C = typeof window !== 'undefined' ? window.Capacitor : null;
  return C?.isNativePlatform?.() ? C.Plugins?.[name] || null : null;
};

export const hasNative = () => !!plugin('Preferences');

export async function prefGet(key) {
  try { return (await plugin('Preferences')?.get({ key }))?.value ?? null; } catch { return null; }
}

export async function prefSet(key, value) {
  try { await plugin('Preferences')?.set({ key, value }); return true; } catch { return false; }
}

const DATA = 'DATA'; // the app's private files folder (included in Android's backup)

export async function fileWrite(path, base64) {
  try { await plugin('Filesystem')?.writeFile({ path, data: base64, directory: DATA, recursive: true }); return true; } catch { return false; }
}

export async function fileRead(path) {
  try {
    const r = await plugin('Filesystem')?.readFile({ path, directory: DATA });
    return typeof r?.data === 'string' ? r.data : null;
  } catch { return null; }
}

export async function fileDelete(path) {
  try { await plugin('Filesystem')?.deleteFile({ path, directory: DATA }); } catch { /* already gone */ }
}

export async function fileList(dir) {
  try {
    const r = await plugin('Filesystem')?.readdir({ path: dir, directory: DATA });
    return (r?.files || []).map((f) => (typeof f === 'string' ? f : f.name));
  } catch { return []; }
}

// base64 <-> bytes, in chunks so large recordings do not overflow the call stack
export function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function fromBase64(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
