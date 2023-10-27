/* eslint-disable no-unused-vars */
const isUrl = url => {
  if (typeof url !== 'string') return false;
  if (!url.startsWith('http')) return false;

  try {
    const u = new URL(url);
    return true;
  } catch (_) {
    return false;
  }
};

export default isUrl;
