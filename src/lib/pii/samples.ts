import type { SampleDataset } from "./types";

export const SAMPLE_DATASETS: readonly SampleDataset[] = [
  {
    id: "support-ticket",
    label: "Noisy Support Ticket",
    tag: "Support • TXT",
    description:
      "Escalation thread with recurring email/phone, PAN, Aadhaar, card, IP, and decoy Order ID.",
    filename: "support-ticket-sanitized.txt",
    content: `[TICKET #INC-4092] Priority Escalation — Refund & KYC Verification
Customer: Aarav Mehta (Primary Email: aarav.mehta@finbridge.in)
Alt Contact: +91 98765 43210 | Backup UK Desk: +44 20 7946 0958
Order Reference ID: 4532-0192-8374-6510 (Non-PII ledger reference — must NOT redact)

Notes from Agent Riya (riya.kapoor@finbridge.in):
1. Customer reported double debit on Visa ending 6518: 4532 0192 8374 6518.
2. Verified KYC docs — PAN: ABCDE1234F, Aadhaar: 2345 6789 0123.
3. Auth session originated from IPv4 192.168.14.88 and IPv6 2001:0db8:85a3::8a2e:0370:7334.
4. Re-sent receipt to aarav.mehta@finbridge.in and called 9876543210 to confirm.`,
  },
  {
    id: "clinical-note",
    label: "Clinical Intake Note",
    tag: "Healthcare • TXT",
    description:
      "OPD discharge summary with patient identifiers, guardian contact, IP log, and decoy Lab Order ID.",
    filename: "clinical-note-sanitized.txt",
    content: `CLINICAL DISCHARGE SUMMARY — WARD 4B
Patient Portal ID: 8821904411223345 (Internal Lab Batch — non-Luhn decoy)
Patient Email: meera.nair@caremail.org | Guardian Phone: +91-91234-56789
Insurance PAN: BNZPM2501K | ABHA/Aadhaar Link: 4567-8901-2345

Billing & Telehealth Audit:
- Follow-up card on file: 4111-1111-1111-1111
- Telehealth endpoint IP: 172.16.42.19 (fallback node fe80::1ff:fe23:4567:890a)
- Discharge PDF sent twice to meera.nair@caremail.org and doctor.singh@hospital.in.
- Nurse callback logged at +91 91234 56789 at 14:25:00 IST.`,
  },
  {
    id: "customer-csv",
    label: "Customer Export CSV",
    tag: "Finance • CSV",
    description:
      "Structured CSV rows with recurring accounts, cards, Indian IDs, and 16-digit decoy Order IDs.",
    filename: "customers-sanitized.csv",
    content: `order_id,customer_email,phone,pan,aadhaar,card_number,login_ip
5100998877665541,kiran.rao@shopkart.in,+91 98201 44556,AAACR5055K,3456 7890 1234,5500000000000004,10.24.18.92
5100998877665542,neha.verma@shopkart.in,+1 (415) 555-0192,DHKPV7890L,5678 9012 3456,378282246310005,203.0.113.45
5100998877665543,kiran.rao@shopkart.in,9820144556,AAACR5055K,3456-7890-1234,5500-0000-0000-0004,10.24.18.92`,
  },
];
