# Genera los iconos PNG del sitio corporativo replicando icons/icon.svg
Add-Type -AssemblyName System.Drawing

function New-Icon([int]$size, [bool]$maskable, [string]$path) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $navy = [System.Drawing.Color]::FromArgb(15, 23, 42)
    $sky  = [System.Drawing.Color]::FromArgb(56, 189, 248)
    $bgBrush = New-Object System.Drawing.SolidBrush $navy
    $g.FillRectangle($bgBrush, 0, 0, $size, $size)

    # Los iconos maskable necesitan zona segura (padding ~16%)
    $pad = if ($maskable) { [int]($size * 0.16) } else { 0 }
    $s = $size - 2 * $pad
    $u = $s / 512.0
    $pen = New-Object System.Drawing.Pen $sky, (24 * $u)
    $pen.StartCap = 'Round'; $pen.EndCap = 'Round'; $pen.LineJoin = 'Round'
    $ox = $pad; $oy = $pad

    # Casa: M256 112 L400 240 V384 H128 V240 Z
    $pts = @(
        [System.Drawing.PointF]::new($ox + 256 * $u, $oy + 112 * $u),
        [System.Drawing.PointF]::new($ox + 400 * $u, $oy + 240 * $u),
        [System.Drawing.PointF]::new($ox + 400 * $u, $oy + 384 * $u),
        [System.Drawing.PointF]::new($ox + 128 * $u, $oy + 384 * $u),
        [System.Drawing.PointF]::new($ox + 128 * $u, $oy + 240 * $u)
    )
    $g.DrawPolygon($pen, $pts)

    # Circulo interior (lente 360)
    $cx = $ox + 256 * $u; $cy = $oy + 288 * $u; $r = 56 * $u
    $g.DrawEllipse($pen, $cx - $r, $cy - $r, 2 * $r, 2 * $r)
    $brush2 = New-Object System.Drawing.SolidBrush $sky
    $r2 = 20 * $u
    $g.FillEllipse($brush2, $cx - $r2, $cy - $r2, 2 * $r2, 2 * $r2)

    $g.Dispose()
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

$dir = Join-Path $PSScriptRoot '..\static\icons'
New-Icon 192 $false (Join-Path $dir 'icon-192.png')
New-Icon 512 $false (Join-Path $dir 'icon-512.png')
New-Icon 512 $true  (Join-Path $dir 'icon-maskable-512.png')
Get-ChildItem $dir
