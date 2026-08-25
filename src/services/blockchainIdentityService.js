/**
 * Mock Blockchain Identity Service for Tourist Guardian Prototype
 * 
 * This service simulates a blockchain identity verification process.
 * In a production environment, this would integrate with an actual blockchain node or smart contract (e.g., Ethereum, Polygon).
 */

/**
 * Simulates generating an SHA-256 hash for the identity payload.
 * Since this is a browser prototype, we use a simple deterministic mock hash.
 */
export function generateIdentityHash(normalizedData) {
  const str = JSON.stringify(normalizedData);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return '0x' + Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Masks a document number for safe display and storage.
 * e.g., '123456789012' -> 'XXXX-XXXX-9012'
 */
export function maskDocumentNumber(docType, docNumber) {
  if (!docNumber) return '';
  const cleanNum = docNumber.replace(/\D/g, '');
  
  if (docType === 'AADHAAR') {
    if (cleanNum.length === 12) {
      return `XXXX-XXXX-${cleanNum.substring(8)}`;
    }
  } else if (docType === 'PASSPORT') {
    if (docNumber.length > 4) {
      return `XXXX${docNumber.substring(docNumber.length - 4)}`;
    }
  }
  
  // Generic fallback
  return `XXXX-${docNumber.substring(docNumber.length - 4) || 'XXXX'}`;
}

/**
 * Simulates a blockchain verification request.
 * @param {Object} kycData - Raw KYC data submitted by the user
 * @param {string} safetyId - The existing Tourist Digital Safety ID
 * @returns {Promise<Object>} The verified blockchain payload
 */
export async function verifyIdentity(kycData, safetyId) {
  return new Promise((resolve) => {
    // Simulate network delay for the blockchain verification
    setTimeout(() => {
      
      // 1. Normalize the identity fields
      const normalizedData = {
        name: kycData.fullName.toUpperCase().trim(),
        dob: kycData.dateOfBirth,
        nationality: kycData.nationality.toUpperCase().trim(),
        docType: kycData.documentType,
        docNumber: kycData.documentNumber, // Raw number is hashed, not stored
        safetyId: safetyId
      };
      
      // 2. Generate Cryptographic Hash
      const identityHash = generateIdentityHash(normalizedData);
      
      // 3. Generate Mock Blockchain Transaction ID
      const randomTx = Math.random().toString(16).substring(2, 8).toUpperCase();
      const transactionId = `TG-BLOCK-${randomTx}`;
      
      // 4. Calculate Expiry (Temporary ID concept: Expires in 7 days for demo)
      const now = new Date();
      const issuedAt = now.toISOString();
      
      const expiryDate = new Date(now);
      expiryDate.setDate(expiryDate.getDate() + 7);
      const expiresAt = expiryDate.toISOString();
      
      // 5. Generate secure masked reference for database storage
      const maskedReference = maskDocumentNumber(kycData.documentType, kycData.documentNumber);
      
      resolve({
        verified: true,
        verificationMethod: "DEMO_BLOCKCHAIN",
        identityHash: identityHash,
        transactionId: transactionId,
        issuedAt: issuedAt,
        expiresAt: expiresAt,
        documentType: kycData.documentType
      });
      
    }, 1500); // 1.5s simulated delay
  });
}

/**
 * Simulates an authority verifying the blockchain integrity of a tourist record.
 * Recalculates the hash from current DB fields and compares to the stored hash.
 */
export async function verifyBlockchainIntegrity(touristData) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!touristData.identity_hash || touristData.blockchain_status !== 'VERIFIED') {
        resolve({ isValid: false, error: 'No blockchain identity found for this tourist.' });
        return;
      }

      // Reconstruct the exact normalized payload used during generation
      const normalizedData = {
        name: touristData.name.toUpperCase().trim(),
        dob: touristData.date_of_birth,
        nationality: touristData.nationality.toUpperCase().trim(),
        docType: touristData.kyc_type,
        docNumber: touristData.kyc_reference, 
        safetyId: touristData.safety_id || touristData.id
      };
      
      const expectedHash = generateIdentityHash(normalizedData);
      
      resolve({
        isValid: expectedHash === touristData.identity_hash,
        expectedHash,
        actualHash: touristData.identity_hash
      });
    }, 800);
  });
}
