# Test API Script
Write-Host "Testing SmartHome Server API..." -ForegroundColor Green

# Test Health Endpoint
Write-Host "`n1. Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET
    Write-Host "✓ Health Check: " -ForegroundColor Green -NoNewline
    Write-Host ($healthResponse | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "✗ Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test User Registration
Write-Host "`n2. Testing User Registration..." -ForegroundColor Yellow
$registerBody = @{
    name = "Test User"
    email = "test@smarthome.com"
    password = "TestPassword123!"
    confirmPassword = "TestPassword123!"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/register" -Method POST -Body $registerBody -ContentType "application/json"
    Write-Host "✓ Registration Success: " -ForegroundColor Green -NoNewline
    Write-Host ($registerResponse | ConvertTo-Json -Depth 3)
    
    # Save token for future use
    $global:jwt_token = $registerResponse.data.tokens.accessToken
} catch {
    Write-Host "✗ Registration Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorBody = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorBody)
        $errorText = $reader.ReadToEnd()
        Write-Host "Error Details: $errorText" -ForegroundColor Red
    }
}

# Test User Login
Write-Host "`n3. Testing User Login..." -ForegroundColor Yellow
$loginBody = @{
    email = "test@smarthome.com"
    password = "TestPassword123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    Write-Host "✓ Login Success: " -ForegroundColor Green -NoNewline
    Write-Host ($loginResponse | ConvertTo-Json -Depth 3)
    
    # Update token
    $global:jwt_token = $loginResponse.data.tokens.accessToken
} catch {
    Write-Host "✗ Login Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorBody = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorBody)
        $errorText = $reader.ReadToEnd()
        Write-Host "Error Details: $errorText" -ForegroundColor Red
    }
}

# Test Protected Endpoint (Get Profile)
Write-Host "`n4. Testing Protected Endpoint (Get Profile)..." -ForegroundColor Yellow
if ($global:jwt_token) {
    try {
        $headers = @{
            "Authorization" = "Bearer $global:jwt_token"
        }
        $profileResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/profile" -Method GET -Headers $headers
        Write-Host "✓ Profile Access Success: " -ForegroundColor Green -NoNewline
        Write-Host ($profileResponse | ConvertTo-Json -Depth 3)
    } catch {
        Write-Host "✗ Profile Access Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "✗ No JWT token available for testing protected endpoint" -ForegroundColor Red
}

Write-Host "`nAPI Testing Complete!" -ForegroundColor Green
