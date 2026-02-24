param()

$root = Get-Location
$src = Join-Path $root 'src'
$docsModules = Join-Path $root 'docs/modules'
New-Item -ItemType Directory -Force -Path $docsModules | Out-Null

$controllerFiles = Get-ChildItem -Path $src -Recurse -Filter *.controller.ts | Sort-Object FullName
$byModule = @{}
foreach ($file in $controllerFiles) {
  $module = Split-Path (Split-Path $file.FullName -Parent) -Leaf
  if (-not $byModule.ContainsKey($module)) { $byModule[$module] = @() }
  $byModule[$module] += $file
}

foreach ($module in ($byModule.Keys | Sort-Object)) {
  $controllers = $byModule[$module]
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.AppendLine("# Modulo $module")
  [void]$sb.AppendLine()
  [void]$sb.AppendLine("## Proposito")
  [void]$sb.AppendLine("Documentacion tecnica del modulo src/$module y sus controladores. Este documento fue generado automaticamente y puede complementarse con detalles funcionales del equipo.")
  [void]$sb.AppendLine()
  [void]$sb.AppendLine("## Auth / Seguridad")
  $guards = @()
  foreach ($ctrl in $controllers) {
    $content = Get-Content $ctrl.FullName -Raw
    if ($content -match 'JwtAuthGuard') { $guards += 'JwtAuthGuard' }
    if ($content -match 'RolesGuard') { $guards += 'RolesGuard' }
  }
  $guards = $guards | Sort-Object -Unique
  if ($guards.Count -eq 0) { [void]$sb.AppendLine("- Sin guardas globales en controlador (revisar metodos individuales).") }
  else { foreach ($g in $guards) { [void]$sb.AppendLine("- Usa guard $g en uno o mas endpoints.") } }
  [void]$sb.AppendLine()
  [void]$sb.AppendLine("## Controladores y Endpoints")

  foreach ($ctrl in $controllers) {
    $text = Get-Content $ctrl.FullName -Raw
    $lines = Get-Content $ctrl.FullName
    $ctrlName = [IO.Path]::GetFileName($ctrl.Name)
    $baseMatch = [regex]::Match($text, "@Controller\('([^']*)'\)")
    $baseRoute = if ($baseMatch.Success) { $baseMatch.Groups[1].Value } else { '' }
    [void]$sb.AppendLine("### $ctrlName")
    [void]$sb.AppendLine("- Ruta base: /$baseRoute")

    $dtoImports = [regex]::Matches($text, 'import \{([^}]*)\} from .*dto') | ForEach-Object {
      $_.Groups[1].Value -split ',' | ForEach-Object { $_.Trim() }
    } | Where-Object { $_ -match 'Dto$' } | Sort-Object -Unique
    if ($dtoImports) { [void]$sb.AppendLine("- DTOs referenciados: " + ($dtoImports -join ', ')) }
    else { [void]$sb.AppendLine("- DTOs referenciados: (sin DTOs importados en controlador)") }

    [void]$sb.AppendLine()
    [void]$sb.AppendLine("| Metodo | Ruta | Handler |")
    [void]$sb.AppendLine("|---|---|---|")

    for ($i=0; $i -lt $lines.Count; $i++) {
      $line = $lines[$i].Trim()
      $m = [regex]::Match($line, '^@(Get|Post|Patch|Delete)\((.*)\)')
      if (-not $m.Success) { continue }
      $http = $m.Groups[1].Value.ToUpper()
      $rawArg = $m.Groups[2].Value.Trim()
      $routePart = ''
      if ($rawArg -match "'([^']*)'") { $routePart = $matches[1] }
      $fullRoute = if ([string]::IsNullOrWhiteSpace($routePart)) { "/$baseRoute" } elseif ([string]::IsNullOrWhiteSpace($baseRoute)) { "/$routePart" } else { "/$baseRoute/$routePart" }
      $fullRoute = $fullRoute -replace '//','/'
      $handler = ''
      for ($j=$i+1; $j -lt [Math]::Min($i+8, $lines.Count); $j++) {
        $candidate = $lines[$j].Trim()
        if ($candidate -match '^(async\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\(') { $handler = $matches[2]; break }
      }
      [void]$sb.AppendLine("| $http | $fullRoute | $handler |")
    }

    [void]$sb.AppendLine()
    [void]$sb.AppendLine("#### Ejemplos request/response")
    [void]$sb.AppendLine("- Request (ejemplo): curl -X GET https://<host>/$baseRoute")
    [void]$sb.AppendLine("- Response (ejemplo): JSON segun contrato del controlador; validar con Postman/Swagger si aplica.")
    [void]$sb.AppendLine()
    [void]$sb.AppendLine("#### Decisiones de implementacion")
    [void]$sb.AppendLine("- Se documenta a nivel de controlador y rutas para trazabilidad de cambios.")
    [void]$sb.AppendLine("- Completar contratos finos de DTOs desde código fuente cuando se publiquen cambios en PR.")
    [void]$sb.AppendLine()
    [void]$sb.AppendLine("#### Pendientes")
    [void]$sb.AppendLine("- Agregar ejemplos reales por endpoint (payload y respuesta) en siguientes iteraciones.")
    [void]$sb.AppendLine("- Mantener actualizado este documento cuando cambien rutas/guardas/DTOs.")
    [void]$sb.AppendLine()
  }

  $outPath = Join-Path $docsModules ("$module.md")
  Set-Content -Path $outPath -Value $sb.ToString() -Encoding UTF8
}
