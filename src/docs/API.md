# 📡 Invoice Management System - API Documentation

## 🔗 Base URL
```
Local Development: http://localhost:3000/api
Production: https://your-app.vercel.app/api
```

## 🔐 Authentication

### Bearer Token Authentication
All API endpoints (except auth) require a Bearer token:
```
Authorization: Bearer <token>
```

### Auth Endpoints

#### POST /api/auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "admin|finance_supervisor|finance_staff"
  },
  "token": "jwt_token_here"
}
```

**Error Responses:**
- `400` - Invalid input data
- `401` - Invalid credentials

#### POST /api/auth/register
Register new user (Admin only).

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "role": "finance_staff"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "newuser@example.com",
    "role": "finance_staff"
  }
}
```

#### GET /api/auth/me
Get current user information.

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "admin",
    "full_name": "John Doe",
    "settings": {}
  }
}
```

#### PUT /api/auth/profile
Update user profile.

**Request Body:**
```json
{
  "full_name": "Updated Name",
  "settings": {
    "theme": "dark",
    "language": "id"
  }
}
```

#### POST /api/auth/change-password
Change user password.

**Request Body:**
```json
{
  "current_password": "oldpass123",
  "new_password": "newpass123"
}
```

#### POST /api/auth/logout
Logout current user.

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

## 🏢 Companies API

### GET /api/companies
Get companies list with pagination and search.

**Query Parameters:**
- `limit` (default: 20, max: 50)
- `offset` (default: 0)
- `search` - Search in company name or NPWP
- `is_active` (true|false)

**Response (200):**
```json
{
  "companies": [
    {
      "id": "uuid",
      "company_name": "PT Example Corp",
      "npwp": "123456789012345",
      "idtku": "IDTKU001",
      "address": "Jakarta, Indonesia",
      "contact_phone": "+62812345678",
      "contact_email": "contact@example.com",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "job_count": 5
    }
  ],
  "pagination": {
    "offset": 0,
    "limit": 20,
    "total": 100,
    "hasMore": true
  }
}
```

### POST /api/companies
Create new company (Admin, Finance Supervisor, Finance Staff).

**Request Body:**
```json
{
  "company_name": "PT New Company",
  "npwp": "987654321098765",
  "idtku": "IDTKU002",
  "address": "Surabaya, Indonesia",
  "contact_phone": "+62812345679",
  "contact_email": "info@newcompany.com"
}
```

**Response (201):**
```json
{
  "company": {
    "id": "uuid",
    "company_name": "PT New Company",
    "npwp": "987654321098765",
    "idtku": "IDTKU002",
    "address": "Surabaya, Indonesia",
    "contact_phone": "+62812345679",
    "contact_email": "info@newcompany.com",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### GET /api/companies/[id]
Get company details by ID.

**Response (200):**
```json
{
  "company": {
    "id": "uuid",
    "company_name": "PT Example Corp",
    "npwp": "123456789012345",
    "idtku": "IDTKU001",
    "address": "Jakarta, Indonesia",
    "contact_phone": "+62812345678",
    "contact_email": "contact@example.com",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "job_descriptions": [
      {
        "id": "uuid",
        "job_name": "Software Developer",
        "job_description": "Develop web applications",
        "price": 15000000.00,
        "is_active": true
      }
    ]
  }
}
```

### PUT /api/companies/[id]
Update company (Admin, Finance Supervisor, Finance Staff).

**Request Body:**
```json
{
  "company_name": "PT Updated Company",
  "address": "Updated address",
  "contact_phone": "+62812345680",
  "contact_email": "updated@company.com",
  "is_active": true
}
```

### DELETE /api/companies/[id]
Soft delete company (Admin only).

**Response (200):**
```json
{
  "message": "Company deleted successfully"
}
```

### GET /api/companies/search
Smart search companies.

**Query Parameters:**
- `q` - Search query
- `limit` (default: 10, max: 50)

**Response (200):**
```json
{
  "companies": [
    {
      "id": "uuid",
      "company_name": "PT Example Corp",
      "npwp": "123456789012345",
      "idtku": "IDTKU001",
      "is_active": true
    }
  ]
}
```

---

## 👷 TKA Workers API

### GET /api/tka-workers
Get TKA workers list.

**Query Parameters:**
- `limit` (default: 20, max: 50)
- `offset` (default: 0)
- `search` - Search in name or passport
- `is_active` (true|false)
- `divisi` - Filter by division

**Response (200):**
```json
{
  "workers": [
    {
      "id": "uuid",
      "nama": "John Smith",
      "passport": "A12345678",
      "divisi": "Engineering",
      "jenis_kelamin": "Laki-laki",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "family_count": 2
    }
  ],
  "pagination": {
    "offset": 0,
    "limit": 20,
    "total": 50,
    "hasMore": true
  }
}
```

### POST /api/tka-workers
Create new TKA worker (Admin, Finance Supervisor, Finance Staff).

**Request Body:**
```json
{
  "nama": "John Smith",
  "passport": "A12345678",
  "divisi": "Engineering",
  "jenis_kelamin": "Laki-laki"
}
```

### GET /api/tka-workers/[id]
Get TKA worker details.

**Response (200):**
```json
{
  "worker": {
    "id": "uuid",
    "nama": "John Smith",
    "passport": "A12345678",
    "divisi": "Engineering",
    "jenis_kelamin": "Laki-laki",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "family_members": [
      {
        "id": "uuid",
        "nama": "Jane Smith",
        "passport": "B87654321",
        "jenis_kelamin": "Perempuan",
        "relationship": "spouse",
        "is_active": true
      }
    ]
  }
}
```

### PUT /api/tka-workers/[id]
Update TKA worker (Admin, Finance Supervisor, Finance Staff).

### DELETE /api/tka-workers/[id]
Soft delete TKA worker (Admin only).

### GET /api/tka-workers/search
Smart search TKA workers.

### POST /api/tka-workers/import
Import TKA workers from Excel/CSV (Admin, Finance Supervisor, Finance Staff).

**Request:** Multipart form data with file upload.

### GET /api/tka-workers/[id]/family
Get family members of TKA worker.

### POST /api/tka-workers/[id]/family
Add family member (Admin, Finance Supervisor, Finance Staff).

**Request Body:**
```json
{
  "nama": "Jane Smith",
  "passport": "B87654321",
  "jenis_kelamin": "Perempuan",
  "relationship": "spouse"
}
```

---

## 💼 Job Descriptions API

### GET /api/job-descriptions
Get job descriptions list.

**Query Parameters:**
- `company_id` - Filter by company
- `limit` (default: 20, max: 50)
- `offset` (default: 0)
- `search` - Search in job name
- `is_active` (true|false)

**Response (200):**
```json
{
  "jobs": [
    {
      "id": "uuid",
      "company_id": "uuid",
      "job_name": "Software Developer",
      "job_description": "Develop web applications using modern frameworks",
      "price": 15000000.00,
      "is_active": true,
      "sort_order": 1,
      "company_name": "PT Example Corp",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "offset": 0,
    "limit": 20,
    "total": 25,
    "hasMore": true
  }
}
```

### POST /api/job-descriptions
Create new job description (Admin, Finance Supervisor, Finance Staff).

**Request Body:**
```json
{
  "company_id": "uuid",
  "job_name": "Software Developer",
  "job_description": "Develop web applications using modern frameworks",
  "price": 15000000.00,
  "sort_order": 1
}
```

### GET /api/job-descriptions/[id]
Get job description details.

### PUT /api/job-descriptions/[id]
Update job description (Admin, Finance Supervisor, Finance Staff).

### DELETE /api/job-descriptions/[id]
Soft delete job description (Admin only).

---

## 🧾 Invoices API

### GET /api/invoices
Get invoices list.

**Query Parameters:**
- `limit` (default: 20, max: 50)
- `offset` (default: 0)
- `status` - Filter by status (draft|finalized|paid|cancelled)
- `company_id` - Filter by company
- `date_from` - Filter from date (YYYY-MM-DD)
- `date_to` - Filter to date (YYYY-MM-DD)
- `search` - Search in invoice number

**Response (200):**
```json
{
  "invoices": [
    {
      "id": "uuid",
      "invoice_number": "INV-24-12-001",
      "company_id": "uuid",
      "company_name": "PT Example Corp",
      "company_npwp": "123456789012345",
      "invoice_date": "2024-12-01",
      "subtotal": 30000000.00,
      "vat_percentage": 11.00,
      "vat_amount": 3300000.00,
      "total_amount": 33300000.00,
      "status": "finalized",
      "notes": "Monthly services",
      "line_count": 3,
      "printed_count": 1,
      "last_printed_at": "2024-12-02T10:00:00Z",
      "created_at": "2024-12-01T09:00:00Z"
    }
  ],
  "pagination": {
    "offset": 0,
    "limit": 20,
    "total": 150,
    "hasMore": true
  }
}
```

### POST /api/invoices
Create new invoice (Admin, Finance Supervisor, Finance Staff).

**Request Body:**
```json
{
  "company_id": "uuid",
  "invoice_date": "2024-12-01",
  "notes": "Monthly services for December",
  "bank_account_id": "uuid",
  "lines": [
    {
      "baris": 1,
      "tka_id": "uuid",
      "job_description_id": "uuid",
      "quantity": 1,
      "unit_price": 15000000.00,
      "custom_job_name": null,
      "custom_price": null
    },
    {
      "baris": 2,
      "tka_id": "uuid",
      "job_description_id": "uuid",
      "quantity": 1,
      "unit_price": 15000000.00
    }
  ]
}
```

**Response (201):**
```json
{
  "invoice": {
    "id": "uuid",
    "invoice_number": "INV-24-12-002",
    "company_id": "uuid",
    "invoice_date": "2024-12-01",
    "subtotal": 30000000.00,
    "vat_amount": 3300000.00,
    "total_amount": 33300000.00,
    "status": "draft",
    "notes": "Monthly services for December",
    "bank_account_id": "uuid",
    "created_at": "2024-12-01T09:00:00Z"
  }
}
```

### GET /api/invoices/[id]
Get invoice details with line items.

**Response (200):**
```json
{
  "invoice": {
    "id": "uuid",
    "invoice_number": "INV-24-12-001",
    "company": {
      "id": "uuid",
      "company_name": "PT Example Corp",
      "npwp": "123456789012345",
      "address": "Jakarta, Indonesia"
    },
    "invoice_date": "2024-12-01",
    "subtotal": 30000000.00,
    "vat_percentage": 11.00,
    "vat_amount": 3300000.00,
    "total_amount": 33300000.00,
    "status": "finalized",
    "notes": "Monthly services",
    "bank_account": {
      "bank_name": "Bank BCA",
      "account_number": "1234567890",
      "account_name": "PT Company Name"
    },
    "lines": [
      {
        "id": "uuid",
        "baris": 1,
        "line_order": 1,
        "tka_worker": {
          "id": "uuid",
          "nama": "John Smith",
          "passport": "A12345678"
        },
        "job_description": {
          "id": "uuid",
          "job_name": "Software Developer",
          "job_description": "Develop web applications"
        },
        "custom_job_name": null,
        "custom_price": null,
        "quantity": 1,
        "unit_price": 15000000.00,
        "line_total": 15000000.00
      }
    ],
    "created_at": "2024-12-01T09:00:00Z"
  }
}
```

### PUT /api/invoices/[id]
Update invoice (Admin, Finance Supervisor, Finance Staff - only if status is draft).

### DELETE /api/invoices/[id]
Delete invoice (Admin only - only if status is draft).

### GET /api/invoices/number
Generate next invoice number.

**Response (200):**
```json
{
  "invoice_number": "INV-24-12-003"
}
```

### POST /api/invoices/import
Import invoices from Excel/CSV (Admin, Finance Supervisor, Finance Staff).

### GET /api/invoices/[id]/pdf
Generate invoice PDF.

**Response:** PDF file download

### POST /api/invoices/[id]/print
Print invoice (update print count).

**Response (200):**
```json
{
  "message": "Invoice printed successfully",
  "printed_count": 2
}
```

### GET /api/invoices/[id]/lines
Get invoice line items.

### POST /api/invoices/[id]/lines
Add line item to invoice (Admin, Finance Supervisor, Finance Staff).

**Request Body:**
```json
{
  "baris": 3,
  "tka_id": "uuid",
  "job_description_id": "uuid",
  "quantity": 1,
  "unit_price": 10000000.00,
  "custom_job_name": "Custom Service",
  "custom_price": 12000000.00
}
```

---

## 🏦 Bank Accounts API

### GET /api/bank-accounts
Get bank accounts list.

**Response (200):**
```json
{
  "bank_accounts": [
    {
      "id": "uuid",
      "bank_name": "Bank BCA",
      "account_number": "1234567890",
      "account_name": "PT Company Name",
      "is_default": true,
      "is_active": true,
      "sort_order": 1,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/bank-accounts
Create bank account (Admin only).

**Request Body:**
```json
{
  "bank_name": "Bank Mandiri",
  "account_number": "0987654321",
  "account_name": "PT Company Name",
  "is_default": false,
  "sort_order": 2
}
```

### PUT /api/bank-accounts/[id]
Update bank account (Admin only).

### DELETE /api/bank-accounts/[id]
Delete bank account (Admin only).

---

## 📊 Reports API

### GET /api/reports/invoices
Get invoice reports.

**Query Parameters:**
- `date_from` - From date (YYYY-MM-DD)
- `date_to` - To date (YYYY-MM-DD)
- `company_id` - Filter by company
- `status` - Filter by status
- `group_by` - Group by (company|month|status)

**Response (200):**
```json
{
  "summary": {
    "total_invoices": 50,
    "total_amount": 500000000.00,
    "paid_amount": 300000000.00,
    "pending_amount": 200000000.00
  },
  "data": [
    {
      "company_name": "PT Example Corp",
      "invoice_count": 10,
      "total_amount": 100000000.00,
      "paid_amount": 60000000.00,
      "pending_amount": 40000000.00
    }
  ],
  "period": {
    "from": "2024-01-01",
    "to": "2024-12-31"
  }
}
```

### POST /api/reports/export
Export reports to Excel/PDF.

**Request Body:**
```json
{
  "type": "excel|pdf",
  "report": "invoices|companies",
  "filters": {
    "date_from": "2024-01-01",
    "date_to": "2024-12-31",
    "company_id": "uuid"
  }
}
```

**Response:** File download

---

## ⚙️ Settings API

### GET /api/settings
Get application settings.

**Response (200):**
```json
{
  "settings": {
    "vat_percentage": 11.00,
    "invoice_prefix": "INV",
    "company_name": "Your Company Name",
    "company_address": "Your Company Address",
    "auto_backup": true,
    "print_copies": 2
  }
}
```

### PUT /api/settings
Update application settings (Admin only).

**Request Body:**
```json
{
  "vat_percentage": 11.00,
  "invoice_prefix": "INV",
  "company_name": "Updated Company Name",
  "auto_backup": false,
  "print_copies": 1
}
```

### GET /api/settings/system
Get system settings (Admin only).

### PUT /api/settings/system
Update system settings (Admin only).

---

## 🔒 Role-Based Access Control

### Admin
- Full access to all endpoints
- User management (create, edit, delete users)
- System settings
- All CRUD operations
- Delete operations

### Finance Supervisor  
- Invoice management (create, edit, view)
- Mark invoices as paid/unpaid
- Export reports
- Company and TKA worker management
- Job descriptions management
- Cannot manage users or system settings
- Cannot delete records

### Finance Staff
- Invoice management (create, edit, view)
- Company and TKA worker management  
- Job descriptions management
- Cannot mark invoices as paid
- Cannot manage users
- Cannot delete records
- Limited export capabilities

---

## 📋 Error Codes

### Authentication Errors
- `401` - Unauthorized (invalid or missing token)
- `403` - Forbidden (insufficient permissions)

### Validation Errors
- `400` - Bad Request (invalid input data)
- `422` - Unprocessable Entity (validation failed)

### Resource Errors
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate data, e.g., NPWP already exists)

### Server Errors
- `500` - Internal Server Error
- `503` - Service Unavailable

### Example Error Response
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "npwp",
      "message": "NPWP must be 15 digits"
    },
    {
      "field": "email",
      "message": "Email is required"
    }
  ],
  "code": "VALIDATION_ERROR"
}
```

---

## 📊 Rate Limits

### Free Tier (Vercel)
- 100 requests per minute per IP
- 1000 requests per hour per user

### Production
- 1000 requests per minute per IP  
- 10000 requests per hour per user

Rate limit headers included in response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## 🔧 Development Notes

### Edge Runtime
All API routes use Edge Runtime for optimal performance on Vercel.

### Database Connection
- Connection pooling enabled
- Maximum 20 concurrent connections in production
- Automatic connection retry with exponential backoff

### Caching
- Response caching for static data (companies, job descriptions)
- Cache invalidation on data updates
- ETags support for conditional requests

### Security
- CORS enabled for same-origin requests
- Request sanitization
- SQL injection protection via parameterized queries
- XSS protection via input validation