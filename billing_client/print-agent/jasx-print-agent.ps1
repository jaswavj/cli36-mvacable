# JASXBILL local print agent — run on each billing PC.
# Sends RAW ESC/POS to the Windows printer named in Company Details.
# Browser talks only to 127.0.0.1 so cloud deploy still prints on this PC.

$listen = [System.Net.HttpListener]::new()
$listen.Prefixes.Add('http://127.0.0.1:1818/')
$listen.Start()
Write-Host 'JASXBILL print agent listening on http://127.0.0.1:1818'
Write-Host 'Keep this window open while using Collection / Billing print.'

function Send-Response($ctx, [int]$code, [string]$body) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    $ctx.Response.StatusCode = $code
    $ctx.Response.Headers.Add('Access-Control-Allow-Origin', '*')
    $ctx.Response.Headers.Add('Access-Control-Allow-Methods', 'POST, OPTIONS')
    $ctx.Response.Headers.Add('Access-Control-Allow-Headers', 'Content-Type')
    $ctx.Response.ContentType = 'application/json'
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $ctx.Response.Close()
}

function Write-RawPrinter([string]$printer, [byte[]]$data) {
    $paths = @(
        "\\localhost\$printer",
        "\\.\$printer"
    )
    foreach ($path in $paths) {
        try {
            $fs = [System.IO.File]::Open($path, 'Open', 'Write', 'Read')
            $fs.Write($data, 0, $data.Length)
            $fs.Flush()
            $fs.Close()
            return $true
        } catch {
            # try next path
        }
    }
    return $false
}

while ($listen.IsListening) {
    $ctx = $listen.GetContext()
    if ($ctx.Request.HttpMethod -eq 'OPTIONS') {
        Send-Response $ctx 204 ''
        continue
    }
    if ($ctx.Request.HttpMethod -ne 'POST' -or $ctx.Request.Url.AbsolutePath -ne '/print') {
        Send-Response $ctx 404 '{"ok":false,"error":"Not found"}'
        continue
    }
    $reader = New-Object System.IO.StreamReader($ctx.Request.InputStream, $ctx.Request.ContentEncoding)
    $json = $reader.ReadToEnd()
    $reader.Close()
    try {
        $job = $json | ConvertFrom-Json
        $printer = [string]$job.printer
        if ([string]::IsNullOrWhiteSpace($printer)) {
            Send-Response $ctx 400 '{"ok":false,"error":"Printer name missing"}'
            continue
        }
        $bytes = [Convert]::FromBase64String([string]$job.rawBase64)
        if (Write-RawPrinter $printer $bytes) {
            Send-Response $ctx 200 '{"ok":true}'
        } else {
            Send-Response $ctx 500 '{"ok":false,"error":"Printer not found on this PC"}'
        }
    } catch {
        Send-Response $ctx 500 ('{"ok":false,"error":"' + $_.Exception.Message.Replace('"','') + '"}')
    }
}
