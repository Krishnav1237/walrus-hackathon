# VaultGuard API Documentation

## Base URL

- **Development**: `http://localhost:3001`
- **Production**: `https://api.yourdomain.com`

## Authentication

VaultGuard uses wallet-based authentication. Users are identified by their Sui wallet address.

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP address
- **Response**: 429 Too Many Requests when limit exceeded
- **Headers**: 
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Time when limit resets

## Health Check

### GET /health

Check API health and service status.

**Response**
```json
{
  "status": "ok",
  "timestamp": "2024-01-05T10:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "services": {
    "api": "healthy",
    "database": "healthy",
    "redis": "healthy"
  }
}
```

**Status Codes**
- `200 OK`: All services healthy
- `503 Service Unavailable`: One or more services degraded

## Receipts

### GET /api/receipts

List all receipts for a user.

**Query Parameters**
- `suiAddress` (required): User's Sui wallet address

**Response**
```json
{
  "receipts": [
    {
      "id": "uuid",
      "walrusBlobId": "blob-id",
      "sealPolicyId": "policy-id",
      "nftObjectId": "sui-object-id",
      "merchantName": "Best Buy",
      "purchaseDate": "2024-01-01T00:00:00.000Z",
      "amount": 299.99,
      "currency": "USD",
      "warrantyExpiry": "2025-01-01T00:00:00.000Z",
      "category": "electronics",
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z"
    }
  ]
}
```

**Status Codes**
- `200 OK`: Success
- `400 Bad Request`: Missing or invalid suiAddress
- `500 Internal Server Error`: Server error

### POST /api/receipts

Create a new receipt.

**Request Body**
```json
{
  "suiAddress": "0x...",
  "walrusBlobId": "blob-id",
  "sealPolicyId": "policy-id",
  "nftObjectId": "sui-object-id",
  "merchantName": "Best Buy",
  "purchaseDate": "2024-01-01T00:00:00.000Z",
  "amount": 299.99,
  "currency": "USD",
  "warrantyExpiry": "2025-01-01T00:00:00.000Z",
  "category": "electronics"
}
```

**Field Validations**
- `suiAddress`: Required, non-empty string
- `walrusBlobId`: Required, non-empty string
- `sealPolicyId`: Required, non-empty string
- `nftObjectId`: Optional string
- `merchantName`: Required, non-empty string
- `purchaseDate`: Required, ISO 8601 datetime string
- `amount`: Required, positive number
- `currency`: Required, 3-letter currency code
- `warrantyExpiry`: Optional, ISO 8601 datetime string
- `category`: Required, non-empty string

**Response**
```json
{
  "receipt": {
    "id": "uuid",
    // ... receipt object
  }
}
```

**Status Codes**
- `201 Created`: Receipt created successfully
- `400 Bad Request`: Invalid request body
- `500 Internal Server Error`: Server error

### GET /api/receipts/:id

Get a single receipt by ID.

**Path Parameters**
- `id`: Receipt UUID

**Response**
```json
{
  "receipt": {
    "id": "uuid",
    // ... receipt object
  }
}
```

**Status Codes**
- `200 OK`: Success
- `404 Not Found`: Receipt not found
- `500 Internal Server Error`: Server error

### DELETE /api/receipts/:id

Delete a receipt.

**Path Parameters**
- `id`: Receipt UUID

**Response**
```json
{
  "success": true
}
```

**Status Codes**
- `200 OK`: Receipt deleted
- `404 Not Found`: Receipt not found
- `500 Internal Server Error`: Server error

## Reminders

### GET /api/reminders

Get upcoming reminders for a user.

**Query Parameters**
- `suiAddress` (required): User's Sui wallet address

**Response**
```json
{
  "reminders": [
    {
      "id": "uuid",
      "receiptId": "receipt-uuid",
      "remindAt": "2024-12-01T00:00:00.000Z",
      "reminded": false,
      "snoozedUntil": null,
      "createdAt": "2024-01-01T10:00:00.000Z",
      "receipt": {
        // ... full receipt object
      }
    }
  ]
}
```

**Status Codes**
- `200 OK`: Success
- `400 Bad Request`: Missing or invalid suiAddress
- `500 Internal Server Error`: Server error

### POST /api/reminders/snooze/:id

Snooze a reminder.

**Path Parameters**
- `id`: Reminder UUID

**Request Body**
```json
{
  "days": 7
}
```

**Response**
```json
{
  "reminder": {
    "id": "uuid",
    "snoozedUntil": "2024-01-08T00:00:00.000Z",
    // ... other reminder fields
  }
}
```

**Status Codes**
- `200 OK`: Reminder snoozed
- `404 Not Found`: Reminder not found
- `500 Internal Server Error`: Server error

### POST /api/reminders/settings

Update notification settings.

**Request Body**
```json
{
  "suiAddress": "0x...",
  "email": "user@example.com",
  "preferences": {
    "emailEnabled": true,
    "reminderDays": [30, 7, 1]
  }
}
```

**Response**
```json
{
  "user": {
    "id": "uuid",
    "suiAddress": "0x...",
    "email": "user@example.com",
    "notificationPreferences": { /* ... */ }
  }
}
```

**Status Codes**
- `200 OK`: Settings updated
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

## Claims

### POST /api/claims/generate

Generate a proof for a receipt (claim).

**Request Body**
```json
{
  "receiptId": "receipt-uuid",
  "expiresAt": "2024-12-31T23:59:59.000Z",
  "allowedVerifiers": ["0x..."]
}
```

**Response**
```json
{
  "proof": {
    "id": "proof-uuid",
    "receiptId": "receipt-uuid",
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "verificationUrl": "https://app.yourdomain.com/verify/proof-uuid"
  }
}
```

**Status Codes**
- `201 Created`: Proof generated
- `400 Bad Request`: Invalid request
- `404 Not Found`: Receipt not found
- `500 Internal Server Error`: Server error

### GET /api/claims/verify/:hash

Verify a claim proof.

**Path Parameters**
- `hash`: Proof hash/ID

**Response**
```json
{
  "valid": true,
  "proof": {
    "merchant": "Best Buy",
    "purchaseDate": "2024-01-01T00:00:00.000Z",
    "amount": 299.99,
    "currency": "USD",
    "expiresAt": "2024-12-31T23:59:59.000Z"
  }
}
```

**Status Codes**
- `200 OK`: Proof verified
- `404 Not Found`: Proof not found
- `410 Gone`: Proof expired
- `500 Internal Server Error`: Server error

## Error Responses

All endpoints may return error responses in this format:

```json
{
  "error": "Error message"
}
```

### Common Error Codes

- `400 Bad Request`: Invalid request parameters or body
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

## Examples

### cURL Examples

**List receipts**
```bash
curl -X GET "http://localhost:3001/api/receipts?suiAddress=0x..." \
  -H "Content-Type: application/json"
```

**Create receipt**
```bash
curl -X POST "http://localhost:3001/api/receipts" \
  -H "Content-Type: application/json" \
  -d '{
    "suiAddress": "0x...",
    "walrusBlobId": "blob-id",
    "sealPolicyId": "policy-id",
    "merchantName": "Best Buy",
    "purchaseDate": "2024-01-01T00:00:00.000Z",
    "amount": 299.99,
    "currency": "USD",
    "category": "electronics"
  }'
```

### JavaScript Example

```javascript
// Fetch receipts
const response = await fetch(
  `http://localhost:3001/api/receipts?suiAddress=${walletAddress}`,
  {
    headers: {
      'Content-Type': 'application/json',
    },
  }
);
const data = await response.json();
console.log(data.receipts);

// Create receipt
const createResponse = await fetch('http://localhost:3001/api/receipts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    suiAddress: walletAddress,
    walrusBlobId: 'blob-id',
    sealPolicyId: 'policy-id',
    merchantName: 'Best Buy',
    purchaseDate: new Date().toISOString(),
    amount: 299.99,
    currency: 'USD',
    category: 'electronics',
  }),
});
const receipt = await createResponse.json();
```

## CORS

The API supports CORS with the following configuration:

- **Allowed Origins**: Configurable via `CORS_ORIGINS` environment variable
- **Credentials**: Enabled
- **Methods**: GET, POST, PUT, DELETE, PATCH, OPTIONS
- **Headers**: Content-Type, Authorization

## Webhook Events (Future)

Coming soon: Webhook support for real-time notifications of:
- Receipt creation
- Warranty expiration reminders
- Proof generation

## Support

For API support or bug reports:
- GitHub Issues: https://github.com/your-username/vault-guard/issues
- Email: api@yourdomain.com
