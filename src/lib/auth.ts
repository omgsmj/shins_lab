// src/lib/auth.ts
export const ADMIN_CONFIG = {
  ID: 'ddan1218',
  PW: 'TLSALSWHD',
};

export const verifyAdmin = (id: string, pw: string): boolean => {
  return id === ADMIN_CONFIG.ID && pw === ADMIN_CONFIG.PW;
};