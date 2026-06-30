# test-triton.ps1 — helper de test pour le déploiement Triton phi35_financial
#
# Usage :
#   . .\scripts\test-triton.ps1          # charge la fonction Ask-Phi (note le point + espace)
#   Ask-Phi "Qu'est-ce que l'EBITDA ?"
#
# Cible l'endpoint KServe v2 du serveur Triton (cf. docs/triton-deployment.md).
# Sécurité : ce script n'envoie qu'une requête HTTP locale, aucun secret, aucune
# écriture disque, aucun accès réseau sortant hors localhost:8000.

$TritonUrl = "http://localhost:8000/v2/models/phi35_financial/infer"

# La console PowerShell 5.1 affiche en codepage ANSI par défaut → accents cassés.
# On force l'UTF-8 en sortie pour un rendu correct.
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

function Ask-Phi {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true, Position = 0)]
        [string]$Question,

        # Affiche la sortie brute (prompt + complétion) sans retirer l'écho du prompt.
        [switch]$Raw
    )

    # Payload protocole KServe v2 : entrée 'text_input' de type BYTES.
    $payload = @{
        inputs = @(
            @{
                name     = "text_input"
                shape    = @(1)
                datatype = "BYTES"
                data     = @($Question)
            }
        )
    } | ConvertTo-Json -Depth 6

    # On envoie le corps en octets UTF-8 explicites (évite tout souci d'accent
    # dans la question) et on décode la réponse en UTF-8 à la main : Triton ne
    # renvoie pas de charset dans l'en-tête, et Invoke-RestMethod (PS 5.1) tombe
    # alors en ISO-8859-1 => mojibake. On contourne via Invoke-WebRequest + bytes.
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
    try {
        $resp = Invoke-WebRequest -Uri $TritonUrl -Method Post -Body $bodyBytes `
            -ContentType "application/json" -UseBasicParsing
    }
    catch {
        Write-Host "[ERREUR] Triton injoignable sur $TritonUrl — le conteneur tourne-t-il ?" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        return
    }

    $json = [System.Text.Encoding]::UTF8.GetString($resp.RawContentStream.ToArray())
    $obj  = $json | ConvertFrom-Json

    # $obj.outputs est un tableau d'objets de sortie ; on prend le 1er, dont
    # .data est un tableau de chaînes (ici 1 élément). [string](...) le déballe.
    # NB : NE PAS faire $obj.outputs.data[0] — PowerShell déballe le tableau à
    # 1 élément en string, et [0] renverrait alors le 1er CARACTÈRE.
    $text = [string]($obj.outputs[0].data)

    # Le model.py (identique à la référence, sans chat template) renvoie le
    # prompt + la complétion. Par défaut on retire l'écho du prompt en tête pour
    # la lisibilité ; -Raw garde la sortie complète. Strip prudent : on ne coupe
    # que si le texte commence bien par la question exacte.
    if (-not $Raw -and $text.StartsWith($Question)) {
        $text = $text.Substring($Question.Length).TrimStart()
    }

    Write-Host "`n--- Q: $Question ---" -ForegroundColor Cyan
    Write-Host $text
    Write-Host ""
}

