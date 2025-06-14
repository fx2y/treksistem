// Test script for QRIS Billing API
const ADMIN_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyX2FkbWluXzAxIiwiaWF0IjoxNzQ5Nzg1OTE3LCJleHAiOjE3NDk4NzIzMTc9.mxtsXdE-O1Sf70U4hcEYngQA1zjhDf4YPbWSkeB0vpM"
const MITRA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyX21pdHJhXzAxIiwiaWF0IjoxNzQ5Nzg1OTE3LCJleHAiOjE3NDk4NzIzMTc9.bKXxSzFu87LFj9TAdgXKy_hFxM0_yqTEXuTUGx0Sz-s"

async function testAPI() {
  const baseURL = "http://localhost:8787/api"
  
  console.log("Testing QRIS Billing API endpoints...\n")
  
  // Test admin endpoint
  console.log("1. Testing Admin QRIS endpoint:")
  try {
    const adminResponse = await fetch(`${baseURL}/admin/billing/qris`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ADMIN_JWT}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mitraId: "test-mitra-id",
        amount: 50000,
        description: "Test QRIS payment for admin"
      })
    })
    
    const adminResult = await adminResponse.json()
    console.log("Status:", adminResponse.status)
    console.log("Response:", JSON.stringify(adminResult, null, 2))
  } catch (error) {
    console.error("Admin endpoint error:", error.message)
  }
  
  console.log("\n" + "=".repeat(50) + "\n")
  
  // Test mitra endpoint  
  console.log("2. Testing Mitra QRIS endpoint:")
  try {
    const mitraResponse = await fetch(`${baseURL}/mitra/billing/qris`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MITRA_JWT}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: 75000,
        description: "Mitra subscription payment"
      })
    })
    
    const mitraResult = await mitraResponse.json()
    console.log("Status:", mitraResponse.status)
    console.log("Response:", JSON.stringify(mitraResult, null, 2))
  } catch (error) {
    console.error("Mitra endpoint error:", error.message)
  }
}

testAPI().catch(console.error)