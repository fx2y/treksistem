#!/bin/bash

# TS-SPEC-014 Vehicle Management API Verification Script
# This script verifies all requirements from .ai/verifications/014.md

API_BASE="http://localhost:8787"
PASS_COUNT=0
FAIL_COUNT=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get valid test tokens from the API
log_test "Getting valid test tokens..."
token_response=$(curl -s "$API_BASE/api/test/tokens")
if [ $? -eq 0 ]; then
    TOKEN_MITRA_1=$(echo "$token_response" | jq -r '.TOKEN_MITRA_1')
    TOKEN_MITRA_2=$(echo "$token_response" | jq -r '.TOKEN_MITRA_2')
    TOKEN_DRIVER_1=$(echo "$token_response" | jq -r '.TOKEN_DRIVER_1')
    
    if [ "$TOKEN_MITRA_1" != "null" ] && [ -n "$TOKEN_MITRA_1" ]; then
        log_pass "Valid test tokens obtained"
    else
        log_fail "Failed to get valid tokens"
        exit 1
    fi
else
    log_fail "Failed to connect to API for tokens"
    exit 1
fi

# Variables to store test data
VEHICLE_ID_1=""
VEHICLE_ID_2=""
VEHICLE_ID_3=""

log_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASS_COUNT++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAIL_COUNT++))
}

# Test HTTP response status
test_status() {
    local expected=$1
    local actual=$2
    local description=$3
    
    if [ "$actual" = "$expected" ]; then
        log_pass "$description (HTTP $actual)"
    else
        log_fail "$description (Expected HTTP $expected, got $actual)"
    fi
}

# Test JSON field value
test_json_field() {
    local json=$1
    local field=$2
    local expected=$3
    local description=$4
    
    local actual=$(echo "$json" | jq -r ".$field")
    if [ "$actual" = "$expected" ]; then
        log_pass "$description ($field: $actual)"
    else
        log_fail "$description (Expected $field: $expected, got $actual)"
    fi
}

echo "=== TS-SPEC-014 Vehicle Management API Verification ==="
echo "API Base: $API_BASE"
echo

# Setup test data first
log_test "Setting up test data..."

# Create test users and mitras (this would be done via proper API in real scenario)
curl -s -X POST "$API_BASE/api/test/setup" > /dev/null 2>&1

echo "=== Security and Access Control Tests ==="

# Test 1: Unauthenticated request
log_test "Testing unauthenticated request"
response=$(curl -s -w "%{http_code}" -X POST "$API_BASE/api/mitra/vehicles" -H "Content-Type: application/json" -d '{"licensePlate": "TEST123"}')
status=${response: -3}
test_status "401" "$status" "POST /api/mitra/vehicles without auth token should return 401"

# Test 2: Driver (non-Mitra) trying to access Mitra endpoint  
log_test "Testing driver access to Mitra endpoint"
response=$(curl -s -w "%{http_code}" -X POST "$API_BASE/api/mitra/vehicles" -H "Authorization: Bearer $TOKEN_DRIVER_1" -H "Content-Type: application/json" -d '{"licensePlate": "TEST123"}')
status=${response: -3}
test_status "403" "$status" "POST /api/mitra/vehicles with driver token should return 403"

# Test 3: Driver trying to list vehicles
log_test "Testing driver access to vehicle list"
response=$(curl -s -w "%{http_code}" -X GET "$API_BASE/api/mitra/vehicles" -H "Authorization: Bearer $TOKEN_DRIVER_1")
status=${response: -3}
test_status "403" "$status" "GET /api/mitra/vehicles with driver token should return 403"

echo
echo "=== Vehicle Creation Tests ==="

# Test 4: Valid vehicle creation
log_test "Testing valid vehicle creation"
response=$(curl -s -w "%{http_code}" -X POST "$API_BASE/api/mitra/vehicles" -H "Authorization: Bearer $TOKEN_MITRA_1" -H "Content-Type: application/json" -d '{"licensePlate": " N 1234 ABC ", "description": "Honda Vario Putih"}')
status=${response: -3}
body=${response%???}
test_status "201" "$status" "POST /api/mitra/vehicles with valid data should return 201"

if [ "$status" = "201" ]; then
    test_json_field "$body" "licensePlate" "N1234ABC" "License plate should be normalized"
    test_json_field "$body" "description" "Honda Vario Putih" "Description should match input"
    VEHICLE_ID_1=$(echo "$body" | jq -r '.id')
    if [ "$VEHICLE_ID_1" != "null" ] && [ -n "$VEHICLE_ID_1" ]; then
        log_pass "Vehicle ID generated: $VEHICLE_ID_1"
    else
        log_fail "Vehicle ID should be generated"
    fi
fi

# Test 5: Empty body should fail
log_test "Testing empty request body"
response=$(curl -s -w "%{http_code}" -X POST "$API_BASE/api/mitra/vehicles" -H "Authorization: Bearer $TOKEN_MITRA_1" -H "Content-Type: application/json" -d '{}')
status=${response: -3}
test_status "400" "$status" "POST /api/mitra/vehicles with empty body should return 400"

# Test 6: Missing license plate should fail
log_test "Testing missing license plate"
response=$(curl -s -w "%{http_code}" -X POST "$API_BASE/api/mitra/vehicles" -H "Authorization: Bearer $TOKEN_MITRA_1" -H "Content-Type: application/json" -d '{"description": "A vehicle with no plate"}')
status=${response: -3}
test_status "400" "$status" "POST /api/mitra/vehicles without licensePlate should return 400"

echo
echo "=== Vehicle Retrieval Tests ==="

# Setup test vehicles for retrieval tests
log_test "Setting up test vehicles for retrieval tests"

# Create vehicle for mitra_1
response=$(curl -s -w "%{http_code}" -X POST "$API_BASE/api/mitra/vehicles" -H "Authorization: Bearer $TOKEN_MITRA_1" -H "Content-Type: application/json" -d '{"licensePlate": "V1PLATE", "description": "Vehicle One"}')
VEHICLE_ID_2=$(echo "${response%???}" | jq -r '.id')

response=$(curl -s -w "%{http_code}" -X POST "$API_BASE/api/mitra/vehicles" -H "Authorization: Bearer $TOKEN_MITRA_1" -H "Content-Type: application/json" -d '{"licensePlate": "V2PLATE", "description": "Vehicle Two"}')

# Create vehicle for mitra_2
response=$(curl -s -w "%{http_code}" -X POST "$API_BASE/api/mitra/vehicles" -H "Authorization: Bearer $TOKEN_MITRA_2" -H "Content-Type: application/json" -d '{"licensePlate": "V3PLATE", "description": "Vehicle Three"}')
VEHICLE_ID_3=$(echo "${response%???}" | jq -r '.id')

# Test 7: List vehicles for mitra_1
log_test "Testing vehicle list for mitra_1"
response=$(curl -s -w "%{http_code}" -X GET "$API_BASE/api/mitra/vehicles" -H "Authorization: Bearer $TOKEN_MITRA_1")
status=${response: -3}
body=${response%???}
test_status "200" "$status" "GET /api/mitra/vehicles should return 200"

if [ "$status" = "200" ]; then
    vehicle_count=$(echo "$body" | jq '.data | length')
    if [ "$vehicle_count" -ge "2" ]; then
        log_pass "Vehicle list contains at least 2 vehicles for mitra_1"
    else
        log_fail "Vehicle list should contain at least 2 vehicles for mitra_1 (got $vehicle_count)"
    fi
    
    # Check that mitra_2's vehicle is not in mitra_1's list
    contains_v3=$(echo "$body" | jq --arg id "$VEHICLE_ID_3" '.data | any(.id == $id)')
    if [ "$contains_v3" = "false" ]; then
        log_pass "Vehicle list properly scoped - does not contain other mitra's vehicles"
    else
        log_fail "Vehicle list contains vehicles from other mitras"
    fi
fi

# Test 8: Get specific vehicle
log_test "Testing get vehicle by ID"
response=$(curl -s -w "%{http_code}" -X GET "$API_BASE/api/mitra/vehicles/$VEHICLE_ID_2" -H "Authorization: Bearer $TOKEN_MITRA_1")
status=${response: -3}
body=${response%???}
test_status "200" "$status" "GET /api/mitra/vehicles/:id should return 200"

if [ "$status" = "200" ]; then
    test_json_field "$body" "id" "$VEHICLE_ID_2" "Vehicle ID should match requested ID"
    test_json_field "$body" "licensePlate" "V1PLATE" "License plate should match"
fi

# Test 9: Try to get other mitra's vehicle
log_test "Testing cross-mitra vehicle access"
response=$(curl -s -w "%{http_code}" -X GET "$API_BASE/api/mitra/vehicles/$VEHICLE_ID_3" -H "Authorization: Bearer $TOKEN_MITRA_1")
status=${response: -3}
test_status "404" "$status" "GET other mitra's vehicle should return 404"

# Test 10: Get nonexistent vehicle
log_test "Testing nonexistent vehicle"
response=$(curl -s -w "%{http_code}" -X GET "$API_BASE/api/mitra/vehicles/nonexistent" -H "Authorization: Bearer $TOKEN_MITRA_1")
status=${response: -3}
test_status "404" "$status" "GET nonexistent vehicle should return 404"

echo
echo "=== Vehicle Update Tests ==="

# Test 11: Update description
log_test "Testing vehicle description update"
response=$(curl -s -w "%{http_code}" -X PUT "$API_BASE/api/mitra/vehicles/$VEHICLE_ID_2" -H "Authorization: Bearer $TOKEN_MITRA_1" -H "Content-Type: application/json" -d '{"description": "New Description"}')
status=${response: -3}
body=${response%???}
test_status "200" "$status" "PUT /api/mitra/vehicles/:id should return 200"

if [ "$status" = "200" ]; then
    test_json_field "$body" "id" "$VEHICLE_ID_2" "Vehicle ID should remain unchanged"
    test_json_field "$body" "licensePlate" "V1PLATE" "License plate should remain unchanged"
    test_json_field "$body" "description" "New Description" "Description should be updated"
fi

# Test 12: Update license plate
log_test "Testing license plate update"
response=$(curl -s -w "%{http_code}" -X PUT "$API_BASE/api/mitra/vehicles/$VEHICLE_ID_2" -H "Authorization: Bearer $TOKEN_MITRA_1" -H "Content-Type: application/json" -d '{"licensePlate": "NEWPLATE"}')
status=${response: -3}
body=${response%???}
test_status "200" "$status" "PUT license plate should return 200"

if [ "$status" = "200" ]; then
    test_json_field "$body" "licensePlate" "NEWPLATE" "License plate should be updated"
fi

# Test 13: Try to update other mitra's vehicle
log_test "Testing cross-mitra vehicle update"
response=$(curl -s -w "%{http_code}" -X PUT "$API_BASE/api/mitra/vehicles/$VEHICLE_ID_3" -H "Authorization: Bearer $TOKEN_MITRA_1" -H "Content-Type: application/json" -d '{"description": "Attempted Hijack"}')
status=${response: -3}
test_status "404" "$status" "PUT other mitra's vehicle should return 404"

echo
echo "=== Vehicle Deletion Tests ==="

# Setup vehicle for deletion test
response=$(curl -s -w "%{http_code}" -X POST "$API_BASE/api/mitra/vehicles" -H "Authorization: Bearer $TOKEN_MITRA_1" -H "Content-Type: application/json" -d '{"licensePlate": "DELETEPLATE", "description": "To be deleted"}')
VEHICLE_TO_DELETE=$(echo "${response%???}" | jq -r '.id')

# Test 14: Try to delete other mitra's vehicle
log_test "Testing cross-mitra vehicle deletion"
response=$(curl -s -w "%{http_code}" -X DELETE "$API_BASE/api/mitra/vehicles/$VEHICLE_ID_3" -H "Authorization: Bearer $TOKEN_MITRA_1")
status=${response: -3}
test_status "404" "$status" "DELETE other mitra's vehicle should return 404"

# Test 15: Delete own vehicle
log_test "Testing vehicle deletion"
response=$(curl -s -w "%{http_code}" -X DELETE "$API_BASE/api/mitra/vehicles/$VEHICLE_TO_DELETE" -H "Authorization: Bearer $TOKEN_MITRA_1")
status=${response: -3}
test_status "204" "$status" "DELETE own vehicle should return 204"

# Test 16: Verify deletion
log_test "Testing deleted vehicle is gone"
response=$(curl -s -w "%{http_code}" -X GET "$API_BASE/api/mitra/vehicles/$VEHICLE_TO_DELETE" -H "Authorization: Bearer $TOKEN_MITRA_1")
status=${response: -3}
test_status "404" "$status" "GET deleted vehicle should return 404"

# Test 17: Try to delete already deleted vehicle
log_test "Testing double deletion"
response=$(curl -s -w "%{http_code}" -X DELETE "$API_BASE/api/mitra/vehicles/$VEHICLE_TO_DELETE" -H "Authorization: Bearer $TOKEN_MITRA_1")
status=${response: -3}
test_status "404" "$status" "DELETE already deleted vehicle should return 404"

echo
echo "=== Test Summary ==="
echo -e "Passed: ${GREEN}$PASS_COUNT${NC}"
echo -e "Failed: ${RED}$FAIL_COUNT${NC}"
echo -e "Total:  $((PASS_COUNT + FAIL_COUNT))"

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✅${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed! ❌${NC}"
    exit 1
fi