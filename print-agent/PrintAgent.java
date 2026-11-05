import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import javax.print.PrintService;
import javax.print.PrintServiceLookup;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Shop-PC print agent. Browser posts ESC/POS bytes here; this process
 * sends them as a Winspool RAW job to the named thermal printer.
 */
public class PrintAgent {

    private static final int PORT = 9177;

    public static void main(String[] args) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", PORT), 0);
        server.createContext("/print", PrintAgent::handlePrint);
        server.setExecutor(Executors.newCachedThreadPool());
        server.start();
        System.out.println("MVA CABLE print agent listening on http://127.0.0.1:" + PORT + "/print");
        System.out.println("Leave this window open while using Collection print. Press Ctrl+C to stop.");
    }

    private static void handlePrint(HttpExchange exchange) throws IOException {
        cors(exchange);
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
            exchange.close();
            return;
        }
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            write(exchange, 405, "{\"success\":false,\"error\":\"POST only\"}");
            return;
        }
        String body = new String(readAll(exchange.getRequestBody()), StandardCharsets.UTF_8);
        String printerName = jsonString(body, "printerName");
        String payload = jsonString(body, "payload");
        if (payload.isBlank()) {
            payload = jsonString(body, "rawBase64");
        }
        if (printerName.isBlank()) {
            printerName = jsonString(body, "printer");
        }
        if (printerName.isBlank() || payload.isBlank()) {
            write(exchange, 400, "{\"success\":false,\"error\":\"printerName and payload are required\"}");
            return;
        }
        byte[] data;
        try {
            data = Base64.getDecoder().decode(payload);
        } catch (IllegalArgumentException ex) {
            write(exchange, 400, "{\"success\":false,\"error\":\"Invalid payload\"}");
            return;
        }
        String resolved = resolvePrinter(printerName);
        if (resolved == null) {
            write(exchange, 404, "{\"success\":false,\"error\":\"Printer not found: " + escapeJson(printerName) + "\"}");
            return;
        }
        if (!rawPrint(resolved, data)) {
            write(exchange, 500, "{\"success\":false,\"error\":\"Winspool RAW print failed\"}");
            return;
        }
        write(exchange, 200, "{\"success\":true,\"message\":\"Printed to " + escapeJson(resolved) + "\"}");
    }

    private static String resolvePrinter(String wanted) {
        PrintService[] services = PrintServiceLookup.lookupPrintServices(null, null);
        String needle = wanted.toLowerCase();
        for (PrintService service : services) {
            String name = service.getName();
            if (name != null && name.toLowerCase().contains(needle)) {
                return name;
            }
        }
        return wanted;
    }

    private static boolean rawPrint(String printerName, byte[] data) {
        try {
            String script = script(printerName, Base64.getEncoder().encodeToString(data));
            String encoded = Base64.getEncoder().encodeToString(script.getBytes(StandardCharsets.UTF_16LE));
            Process process = new ProcessBuilder(
                    "powershell.exe",
                    "-NoProfile",
                    "-NonInteractive",
                    "-ExecutionPolicy", "Bypass",
                    "-EncodedCommand", encoded
            ).redirectErrorStream(true).start();
            boolean finished = process.waitFor(25, TimeUnit.SECONDS);
            return finished && process.exitValue() == 0;
        } catch (Exception ex) {
            System.err.println("RAW print failed: " + ex.getMessage());
            return false;
        }
    }

    private static String script(String printerName, String payloadB64) {
        return """
                $ErrorActionPreference = 'Stop'
                Add-Type @"
                using System;
                using System.Runtime.InteropServices;
                public class JasxAgentRaw {
                  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
                  public class DOCINFO {
                    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
                    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
                    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
                  }
                  [DllImport("winspool.drv", CharSet = CharSet.Unicode, ExactSpelling = false, SetLastError = true)]
                  public static extern bool OpenPrinter(string pPrinterName, out IntPtr hPrinter, IntPtr pDefault);
                  [DllImport("winspool.drv", SetLastError = true)]
                  public static extern bool ClosePrinter(IntPtr hPrinter);
                  [DllImport("winspool.drv", EntryPoint = "StartDocPrinterW", CharSet = CharSet.Unicode, SetLastError = true)]
                  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFO di);
                  [DllImport("winspool.drv", SetLastError = true)]
                  public static extern bool EndDocPrinter(IntPtr hPrinter);
                  [DllImport("winspool.drv", SetLastError = true)]
                  public static extern bool StartPagePrinter(IntPtr hPrinter);
                  [DllImport("winspool.drv", SetLastError = true)]
                  public static extern bool EndPagePrinter(IntPtr hPrinter);
                  [DllImport("winspool.drv", SetLastError = true)]
                  public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);
                }
                "@
                $h = [IntPtr]::Zero
                if (-not [JasxAgentRaw]::OpenPrinter('%s', [ref]$h, [IntPtr]::Zero)) { exit 2 }
                $di = New-Object JasxAgentRaw+DOCINFO
                $di.pDocName = 'MVA CABLE'
                $di.pOutputFile = $null
                $di.pDataType = 'RAW'
                if (-not [JasxAgentRaw]::StartDocPrinter($h, 1, $di)) { [JasxAgentRaw]::ClosePrinter($h); exit 3 }
                [JasxAgentRaw]::StartPagePrinter($h) | Out-Null
                $bytes = [Convert]::FromBase64String('%s')
                $written = 0
                $ok = [JasxAgentRaw]::WritePrinter($h, $bytes, $bytes.Length, [ref]$written)
                [JasxAgentRaw]::EndPagePrinter($h) | Out-Null
                [JasxAgentRaw]::EndDocPrinter($h) | Out-Null
                [JasxAgentRaw]::ClosePrinter($h) | Out-Null
                if (-not $ok -or $written -le 0) { exit 4 }
                exit 0
                """.formatted(escapePs(printerName), payloadB64);
    }

    private static void cors(HttpExchange exchange) {
        Headers headers = exchange.getResponseHeaders();
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        headers.set("Access-Control-Allow-Headers", "Content-Type");
        headers.set("Access-Control-Allow-Private-Network", "true");
        headers.set("Access-Control-Max-Age", "86400");
    }

    private static void write(HttpExchange exchange, int status, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream out = exchange.getResponseBody()) {
            out.write(bytes);
        }
        exchange.close();
    }

    private static byte[] readAll(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        in.transferTo(out);
        return out.toByteArray();
    }

    private static String jsonString(String body, String key) {
        String needle = "\"" + key + "\"";
        int start = body.indexOf(needle);
        if (start < 0) {
            return "";
        }
        int colon = body.indexOf(':', start + needle.length());
        int quote = body.indexOf('"', colon + 1);
        if (quote < 0) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (int i = quote + 1; i < body.length(); i++) {
            char c = body.charAt(i);
            if (c == '\\' && i + 1 < body.length()) {
                sb.append(body.charAt(i + 1));
                i++;
                continue;
            }
            if (c == '"') {
                break;
            }
            sb.append(c);
        }
        return sb.toString();
    }

    private static String escapeJson(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private static String escapePs(String value) {
        return value.replace("'", "''");
    }
}
