export type TicketEmailPayload = {
  to: string;
  buyerName: string;
  orderNumber: string;
  eventTitle: string;
  passCodes: string[];
};

export async function sendTicketEmail(payload: TicketEmailPayload) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_FROM;

  if (!apiKey || !senderEmail) {
    console.log('[Email Mock] Ticket Confirmation:', payload);
    return;
  }

  const passListHtml = payload.passCodes
    .map(
      (code) =>
        `<li style="font-family:monospace;font-size:16px;font-weight:bold;margin:6px 0;">${code}</li>`,
    )
    .join('');

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: { name: 'SeatZero', email: senderEmail },
      to: [{ email: payload.to, name: payload.buyerName }],
      subject: `Your SeatZero Tickets (${payload.orderNumber})`,
      htmlContent: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:20px;border:1px solid #e5e5e5;border-radius:10px;">
          <h2>Booking Confirmed!</h2>
          <p>Hi ${payload.buyerName},</p>
          <p>আপনার <strong>${payload.eventTitle}</strong> ওয়ার্কশপের টিকিট নিশ্চিত হয়েছে।</p>
          <p><strong>Order Number:</strong> ${payload.orderNumber}</p>
          <p><strong>Your Ticket Passes:</strong></p>
          <ul>${passListHtml}</ul>
          <p style="color:#666;font-size:12px;">ইভেন্টের প্রবেশপথে এই কোডগুলো দেখাবেন।</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Brevo email failed:', errText);
  }
}
