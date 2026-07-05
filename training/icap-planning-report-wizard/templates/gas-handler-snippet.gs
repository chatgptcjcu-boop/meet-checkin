/**
 * iCAP Report Wizard — GAS handler pointer (do NOT duplicate full Code.gs here)
 *
 * Source of truth: gas/Code.gs in meet-checkin repo
 *
 * Symbols to copy or verify when forking:
 *
 * | Item                         | Symbol                         | ~Line |
 * |------------------------------|--------------------------------|-------|
 * | Sheet tab name               | REPORT_WIZARD_SHEET_NAME       | 50    |
 * | Field keys (must match JS)   | REPORT_WIZARD_FIELD_KEYS       | 87-99 |
 * | doPost route                 | action === 'icap-report-worksheet' | 121-122 |
 * | Write handler                | handleReportWizardWorksheet    | 294-318 |
 * | Manual test                  | testReportWizardWorksheet      | 1321-1337 |
 *
 * After editing Code.gs:
 *   1. Run testReportWizardWorksheet in Apps Script editor
 *   2. Deploy → Manage deployments → Edit → New version → Deploy
 *   3. Ensure frontend backend.gasWebAppUrl matches /exec URL
 *
 * POST payload shape (from report-wizard-submit.js):
 *   { action, formType, name, role, timestamp, courseName,
 *     fields: { REPORT_WIZARD_FIELD_KEYS... }, answers, pageUrl }
 *
 * Sheet headers (auto-created on first submit):
 *   提交時間, 身份, ...REPORT_WIZARD_FIELD_KEYS..., 頁面URL, 結構化答案JSON
 */
