const AGENT_URL = 'http://127.0.0.1:1818/print';

export type ClientPrintJob = {
  printerName?: string;
  rawBase64?: string;
};

export type ClientPrintResult = {
  ok: boolean;
  message: string;
};

export const printOnClientPrinter = async (job: ClientPrintJob): Promise<ClientPrintResult> => {
  const printerName = (job.printerName || '').trim();
  if (!printerName || !job.rawBase64) {
    return { ok: false, message: 'Printer name or receipt data missing' };
  }
  try {
    const res = await fetch(AGENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ printer: printerName, rawBase64: job.rawBase64 }),
    });
    if (res.ok) {
      return { ok: true, message: `ESC/POS printed to ${printerName}` };
    }
  } catch {
    // Agent not running on this PC.
  }
  return { ok: false, message: 'Local ESC/POS agent not running' };
};
