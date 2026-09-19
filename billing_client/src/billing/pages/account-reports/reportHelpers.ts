export const today = () => new Date().toISOString().slice(0, 10);
export const n2 = (v?: number) => Number(v || 0).toFixed(2);
export const n3 = (v?: number) => Number(v || 0).toFixed(3);
export const sum = (rows: any[], key: string) => rows.reduce((s, r) => s + Number(r[key] || 0), 0);
