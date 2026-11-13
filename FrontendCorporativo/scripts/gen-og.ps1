# Genera og-default.png (1200x630) para compartir en redes
Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap 1200, 630
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAlias'
$navy = [System.Drawing.Color]::FromArgb(15, 23, 42)
$sky  = [System.Drawing.Color]::FromArgb(56, 189, 248)
$bgBrush = New-Object System.Drawing.SolidBrush $navy
$g.FillRectangle($bgBrush, 0, 0, 1200, 630)

# Franja inferior celeste
$skyBrush = New-Object System.Drawing.SolidBrush $sky
$g.FillRectangle($skyBrush, 0, 610, 1200, 20)

# Icono casa+lente (escalado del diseño SVG)
$u = 0.32; $ox = 150; $oy = 165
$pen = New-Object System.Drawing.Pen $sky, (24 * $u)
$pen.StartCap = 'Round'; $pen.EndCap = 'Round'; $pen.LineJoin = 'Round'
$pts = @(
    [System.Drawing.PointF]::new($ox + 256 * $u, $oy + 112 * $u),
    [System.Drawing.PointF]::new($ox + 400 * $u, $oy + 240 * $u),
    [System.Drawing.PointF]::new($ox + 400 * $u, $oy + 384 * $u),
    [System.Drawing.PointF]::new($ox + 128 * $u, $oy + 384 * $u),
    [System.Drawing.PointF]::new($ox + 128 * $u, $oy + 240 * $u)
)
$g.DrawPolygon($pen, $pts)
# Lente 360 (arco)
$g.DrawArc($pen, $ox + 180 * $u, $oy + 300 * $u, 260 * $u, 180 * $u, 20, 140)

# Texto
$font1 = New-Object System.Drawing.Font('Arial', 62, [System.Drawing.FontStyle]::Bold)
$font2 = New-Object System.Drawing.Font('Arial', 30)
$white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$grey  = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(203, 213, 225))
$g.DrawString('Inmobiliaria 360', $font1, $white, 340, 250)
$g.DrawString([string]'Servicios inmobiliarios con tecnologia 360 e IA', $font2, $grey, 340, 345)

$bmp.Save('static/og-default.png', [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output 'og-default.png generado'
