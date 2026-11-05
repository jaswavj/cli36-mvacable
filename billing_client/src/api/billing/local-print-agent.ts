const AGENT_URL = 'http://127.0.0.1:9177/print';
const AGENT_MSG = 'Print agent is not running on this PC. Start start-print-agent.bat and leave the window open.';

export type PrintDispatch = {
  type?: string;
  billNo?: string;
  message?: string;
  printerName?: string;
  payload?: string;
  rawBase64?: string;
  error?: string;
};

export const agentError = AGENT_MSG;

export async function sendToPrintAgent(printerName: string, payload: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(AGENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ printerName, payload }),
    });
  } catch {
    throw new Error(AGENT_MSG);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || AGENT_MSG);
  }
}

export async function handleThermalDispatch(
  res: any,
  onA4?: (billNo: string) => Promise<void> | void
): Promise<'a4' | 'printed' | 'local'> {
  const data: PrintDispatch = res?.data || {};
  if (!res?.success) {
    throw new Error(data.error || 'Thermal print failed. Check printer name in Company Details.');
  }
  if (data.type === 'a4') {
    await onA4?.(data.billNo || '');
    return 'a4';
  }
  if (data.type === 'printed') {
    return 'printed';
  }
  const payload = data.payload || data.rawBase64 || '';
  if (data.type === 'local' || data.type === 'thermal') {
    if (!data.printerName || !payload) {
      throw new Error('Printer name not found.');
    }
    try {
      await sendToPrintAgent(data.printerName, payload);
      return 'local';
    } catch (err: any) {
      throw new Error(err?.message || AGENT_MSG);
    }
  }
  throw new Error('Thermal print did not run. Set Print Format, Thermal Print Type and Printer Name in Company Details.');
}
