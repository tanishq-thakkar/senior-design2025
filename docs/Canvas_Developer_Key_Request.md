# Canvas Developer Key Request for UniSync

**Project:** UniSync – AI-Powered Voice Assistant for UC Students  
**Institution:** University of Cincinnati  
**Canvas Instance:** `https://uc.instructure.com`  
**Request Date:** November 2025  
**Contact:** [Your Name] | [Your Email] | [Your UC ID/Department]

---

## Project Overview

UniSync is a senior design capstone project that provides UC students with an AI-powered voice and chat assistant to help manage their academic schedules, assignments, and course information. The application integrates with Canvas LMS, Google Calendar, and Microsoft Outlook to provide personalized, real-time answers to questions like:

- "When is my next Calculus class?"
- "What assignments are due this week?"
- "Where is my 3pm lab?"
- "Show all today's events."

The application is built on AWS infrastructure with Amazon Cognito for authentication, ensuring secure access to student data.

---

## Technical Architecture

### Application Details
- **Application Name:** UniSync
- **Application Type:** Web application (React frontend + AWS Lambda backend)
- **Authentication Method:** OAuth 2.0 via Amazon Cognito
- **Hosting:** AWS (Amazon API Gateway, Lambda, DynamoDB)

### OAuth Configuration Requirements

#### Redirect URI
```
https://[your-cognito-domain].auth.[region].amazoncognito.com/oauth2/idpresponse
```

**Note:** The exact redirect URI will be provided once AWS Cognito is fully configured. We will update this document with the final URI before production deployment. For development/testing, we may also need a secondary redirect URI for local development.

#### Required OAuth Scopes

We request the following Canvas API scopes to provide the core functionality:

1. **`url:GET|/api/v1/courses`**
   - Purpose: Retrieve student's enrolled courses
   - Usage: Display course list, identify course context for queries

2. **`url:GET|/api/v1/courses/:course_id/assignments`**
   - Purpose: Fetch assignments for specific courses
   - Usage: Answer questions about due dates, assignment details, submission status

3. **`url:GET|/api/v1/courses/:course_id/calendar_events`**
   - Purpose: Access course calendar events (lectures, labs, office hours)
   - Usage: Provide schedule information and location details

4. **`url:GET|/api/v1/calendar_events`**
   - Purpose: Access user's personal calendar events from Canvas
   - Usage: Integrate Canvas events with Google/Microsoft calendars for unified view

5. **`url:GET|/api/v1/users/:user_id/todo`** (if available)
   - Purpose: Access student's to-do items
   - Usage: Quick overview of pending tasks

6. **`url:GET|/api/v1/conversations`** (optional, for future features)
   - Purpose: Access unread Canvas messages/conversations
   - Usage: Notify students of important course communications

**Minimum Required Scopes for MVP:**
- `url:GET|/api/v1/courses`
- `url:GET|/api/v1/courses/:course_id/assignments`
- `url:GET|/api/v1/calendar_events`

---

## Security & Privacy

### Data Handling
- **Data Storage:** All Canvas data is stored securely in AWS DynamoDB, encrypted at rest
- **Data Access:** Only the authenticated student can access their own data
- **Data Retention:** Canvas data is cached temporarily (24-48 hours) for performance; students can disconnect at any time
- **No Third-Party Sharing:** Canvas data is never shared with third parties or used for advertising

### FERPA Compliance
- UniSync adheres to FERPA (Family Educational Rights and Privacy Act) requirements
- Only the student's own academic data is accessed and displayed
- Students maintain full control and can disconnect Canvas integration at any time
- No data is used for purposes other than providing the student with their own information

### Authentication Flow
1. Student initiates Canvas connection from UniSync
2. Student is redirected to Canvas OAuth login page
3. Student authenticates with their UC credentials
4. Canvas redirects back to UniSync with authorization code
5. UniSync backend exchanges code for access token (server-side only)
6. Access token is stored securely, associated only with the student's Cognito user ID

**Security Measures:**
- OAuth client secret is never exposed to frontend
- All API calls to Canvas are made server-side
- Access tokens are encrypted in storage
- HTTPS-only communication
- Token refresh handled automatically to maintain secure sessions

---

## Use Cases & Student Benefits

### Primary Use Cases
1. **Schedule Management:** Students can ask "What's my schedule today?" and receive a unified view of Canvas events, Google Calendar, and Microsoft Calendar
2. **Assignment Tracking:** Voice queries like "What's due this week?" return assignments from Canvas with due dates and submission status
3. **Course Information:** Quick access to course details, locations, and times without navigating multiple Canvas pages
4. **Time Management:** AI assistant helps students prioritize tasks and manage deadlines

### Benefits
- **Accessibility:** Voice interface supports students with disabilities or those who prefer hands-free interaction
- **Time Savings:** Reduces time spent navigating Canvas to find specific information
- **Unified Experience:** Integrates Canvas data with other calendar systems students already use
- **Proactive Notifications:** Can alert students to upcoming deadlines or schedule conflicts

---

## Development & Testing

### Development Phase
- **Timeline:** Currently in active development (Fall 2025 - Spring 2026)
- **Testing Environment:** We will test thoroughly with a limited set of student volunteers before any public release
- **Production Launch:** Expected Spring 2026

### Testing Requirements
- We request a developer key that can be used for both development and production, OR
- Separate keys for development (`uc.test.instructure.com`) and production (`uc.instructure.com`)

---

## Requested Information

Please provide the following:

1. **OAuth Client ID** (Developer Key ID)
2. **OAuth Client Secret**
3. **Confirmation of approved redirect URI(s)**
4. **Any additional documentation or requirements for Canvas API integration at UC**
5. **Contact information for technical support if issues arise during integration**

---

## Additional Information

### Project Team
- **Team Members:** [List team members and their roles]
- **Faculty Advisor:** [Advisor name and contact]
- **Course:** Senior Design Capstone Project

### Support & Contact
- **Primary Contact:** [Your Name]
- **Email:** [Your UC email]
- **Phone:** [If applicable]
- **Project Repository:** [GitHub link if public]

### Compliance Documentation
- We are happy to provide additional security documentation, architecture diagrams, or compliance statements if required
- We can schedule a meeting to discuss the technical implementation and security measures in detail

---

## Next Steps

1. **Review this request** and confirm Canvas API access requirements
2. **Issue Developer Key** with the specified scopes and redirect URI
3. **Provide integration documentation** specific to UC's Canvas instance (if any custom configurations are needed)
4. **Schedule follow-up** (if needed) to discuss any questions or concerns

---

## Appendix: Example API Usage

### Example: Fetching Assignments
```http
GET /api/v1/courses/{course_id}/assignments?include[]=submission
Authorization: Bearer {access_token}
```

### Example: Fetching Calendar Events
```http
GET /api/v1/calendar_events?type=assignment&start_date=2025-11-18&end_date=2025-11-25
Authorization: Bearer {access_token}
```

---

**Thank you for your consideration. We look forward to working with you to provide UC students with an enhanced academic management experience.**

---

*This document will be updated with the final Cognito redirect URI once AWS infrastructure is fully configured. We will notify Canvas administrators immediately upon finalization.*


