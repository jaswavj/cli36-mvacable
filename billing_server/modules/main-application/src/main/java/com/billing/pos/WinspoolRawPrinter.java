package com.billing.pos;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.concurrent.TimeUnit;

/**
 * Sends ESC/POS bytes through Winspool RAW on Windows.
 * Java PrintService / GDI / share paths print a blank slip on these printers.
 */
public final class WinspoolRawPrinter {

    private WinspoolRawPrinter() {
    }

    public static boolean isWindows() {
        return System.getProperty("os.name", "").toLowerCase().contains("win");
    }

    public static boolean print(String printerName, byte[] data) {
        if (!isWindows() || printerName == null || printerName.isBlank() || data == null || data.length == 0) {
            return false;
        }
        try {
            String script = script(printerName.trim(), Base64.getEncoder().encodeToString(data));
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
        } catch (Exception ignored) {
            return false;
        }
    }

    private static String script(String printerName, String payloadB64) {
        return """
                $ErrorActionPreference = 'Stop'
                Add-Type @"
                using System;
                using System.Runtime.InteropServices;
                public class JasxRawPrint {
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
                if (-not [JasxRawPrint]::OpenPrinter('%s', [ref]$h, [IntPtr]::Zero)) { exit 2 }
                $di = New-Object JasxRawPrint+DOCINFO
                $di.pDocName = 'MVA CABLE'
                $di.pOutputFile = $null
                $di.pDataType = 'RAW'
                if (-not [JasxRawPrint]::StartDocPrinter($h, 1, $di)) { [JasxRawPrint]::ClosePrinter($h); exit 3 }
                [JasxRawPrint]::StartPagePrinter($h) | Out-Null
                $bytes = [Convert]::FromBase64String('%s')
                $written = 0
                $ok = [JasxRawPrint]::WritePrinter($h, $bytes, $bytes.Length, [ref]$written)
                [JasxRawPrint]::EndPagePrinter($h) | Out-Null
                [JasxRawPrint]::EndDocPrinter($h) | Out-Null
                [JasxRawPrint]::ClosePrinter($h) | Out-Null
                if (-not $ok -or $written -le 0) { exit 4 }
                exit 0
                """.formatted(escapePs(printerName), payloadB64);
    }

    private static String escapePs(String value) {
        return value.replace("'", "''");
    }
}
