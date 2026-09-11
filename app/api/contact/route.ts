import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// Browser check: visiting http://localhost:3000/api/contact confirms route is active
export async function GET() {
  return NextResponse.json({ status: 'active', route: '/api/contact' });
}

export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

    console.log('Incoming contact payload:', body);

    const fullName = (body.fullName || body.name || '').trim();
    const email = (body.email || '').trim();
    const organisation = (body.organisation || body.organization || '').trim();
    const enquiryType = body.enquiryType || 'General enquiry';
    const message = (body.message || '').trim();

    if (!fullName || !email || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: Name, Email, and Message are required.' },
        { status: 400 }
      );
    }

    // 1. Log submission to Supabase
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error: dbError } = await supabase.from('contact_submissions').insert([
        {
          full_name: fullName,
          organisation: organisation || null,
          email,
          enquiry_type: enquiryType,
          message,
        },
      ]);

      if (dbError) {
        console.warn('Supabase insert notice:', dbError.message);
      } else {
        console.log('Saved submission to Supabase successfully.');
      }
    }

    // 2. Dispatch email via Resend
    const resendKey = process.env.RESEND_API_KEY;
    const recipientEmail = process.env.CONTACT_NOTIFICATION_EMAIL || 'Krizzyworld9@gmail.com';

    if (resendKey) {
      const resend = new Resend(resendKey);
      const emailResult = await resend.emails.send({
        from: 'PharmaVerify NG <onboarding@resend.dev>',
        to: recipientEmail,
        replyTo: email,
        subject: `[PharmaVerify Contact] ${enquiryType} from ${fullName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #00c97a; margin-top: 0;">New Inquiry Received</h2>
            <p><strong>Sender:</strong> ${fullName} (&lt;${email}&gt;)</p>
            <p><strong>Organisation:</strong> ${organisation || 'None specified'}</p>
            <p><strong>Enquiry Type:</strong> ${enquiryType}</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap; background: #f8fafc; padding: 12px; border-radius: 6px; color: #1e293b;">${message}</p>
          </div>
        `,
      });
      console.log('Resend dispatch result:', emailResult);
    }

    return NextResponse.json({ success: true, message: 'Message submitted successfully!' });
  } catch (error: any) {
    console.error('Contact handler error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error while processing message.' },
      { status: 500 }
    );
  }
}