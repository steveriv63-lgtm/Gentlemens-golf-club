# Esegui sul tuo PC: non comunicare password o valori a nessuno.
Add-Type -AssemblyName System.Security
$secure = Read-Host 'Scegli la password dell Area Soci' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
if ($password.Length -lt 14) { Write-Host 'Scegli almeno 14 caratteri.'; exit 1 }
$salt = New-Object byte[] 16
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($salt)
$kdf = New-Object System.Security.Cryptography.Rfc2898DeriveBytes($password,$salt,210000,[System.Security.Cryptography.HashAlgorithmName]::SHA256)
$hash = $kdf.GetBytes(32)
$secretBytes = New-Object byte[] 48
$rng.GetBytes($secretBytes)
$secret = [Convert]::ToBase64String($secretBytes)
Write-Host ''
Write-Host 'KEY: AREA_SOCI_PASSWORD_HASH'
Write-Host ('VALUE: pbkdf2-sha256:'+[Convert]::ToBase64String($salt)+':'+[Convert]::ToBase64String($hash))
Write-Host ''
Write-Host 'KEY: AREA_SOCI_SESSION_SECRET'
Write-Host ('VALUE: '+$secret)
Write-Host ''
Write-Host 'Copia i due valori direttamente in Netlify Environment variables, solo Functions.'
$password = $null
