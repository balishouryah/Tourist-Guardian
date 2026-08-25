import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action, touristName, safetyId, familyEmail, familyName, inviteLink, timestamp, location, liveLink } = body

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Tourist Guardian <safety@touristguardian.app>'

    let subject = ''
    let htmlContent = ''

    if (action === 'invite') {
      subject = 'Tourist Guardian — Family Tracking Invitation'
      htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #10b981; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Tourist Guardian</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">Family Tracking Invitation</p>
          </div>
          <div style="padding: 32px;">
            <p>Hello ${familyName || 'Family Member'},</p>
            <p><strong>${touristName}</strong> has invited you to become an authorized family member on Tourist Guardian.</p>
            <p>After accepting this invitation, you will be able to view the tourist's shared safety status and live location securely.</p>
            
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin: 24px 0;">
              <p style="margin: 0 0 8px 0;"><strong>TOURIST:</strong> ${touristName}</p>
              <p style="margin: 0 0 8px 0;"><strong>DIGITAL SAFETY ID:</strong> ${safetyId}</p>
              <p style="margin: 0;"><strong>INVITED BY:</strong> ${touristName}</p>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${inviteLink}" style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">ACCEPT FAMILY TRACKING</a>
            </div>

            <p style="color: #6b7280; font-size: 14px;">This invitation is private and intended only for the invited recipient. If you do not know this tourist, please ignore this email.</p>
          </div>
        </div>
      `
    } else if (action === 'sos') {
      subject = `🚨 EMERGENCY — ${touristName} has triggered SOS`
      htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #ef4444; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">TOURIST GUARDIAN</h1>
            <p style="margin: 8px 0 0 0; font-weight: bold;">EMERGENCY ALERT</p>
          </div>
          <div style="padding: 32px;">
            <p style="font-size: 18px; color: #ef4444; font-weight: bold;">An SOS emergency has been triggered by ${touristName}.</p>
            
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 6px; margin: 24px 0;">
              <p style="margin: 0 0 8px 0;"><strong>Tourist:</strong> ${touristName}</p>
              <p style="margin: 0 0 8px 0;"><strong>Digital Safety ID:</strong> ${safetyId}</p>
              <p style="margin: 0 0 8px 0;"><strong>Status:</strong> <span style="color: #ef4444; font-weight: bold;">SOS ACTIVE</span></p>
              <p style="margin: 0 0 8px 0;"><strong>Time:</strong> ${timestamp}</p>
              <p style="margin: 0 0 8px 0;"><strong>Current Location:</strong> ${location}</p>
              <p style="margin: 0;"><strong>Last Location Update:</strong> ${timestamp}</p>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${liveLink}" style="background-color: #ef4444; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">VIEW LIVE LOCATION</a>
            </div>
            
            <p style="text-align: center;">
              <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}" style="color: #3b82f6;">Open Coordinates in Map</a>
            </p>
          </div>
        </div>
      `
    } else {
      throw new Error('Invalid action')
    }

    // Development Mode Fallback
    if (!RESEND_API_KEY) {
      console.log('--- DEVELOPMENT EMAIL MOCK ---')
      console.log(`To: ${familyEmail}`)
      console.log(`Subject: ${subject}`)
      console.log(`Action: ${action}`)
      console.log(`Missing RESEND_API_KEY. Set it to actually send emails.`)
      
      return new Response(
        JSON.stringify({ 
          mocked: true, 
          message: 'Email provider not configured. Payload logged to Edge Function console.',
          recipient: familyEmail
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Send email via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: familyEmail,
        subject: subject,
        html: htmlContent,
      }),
    })

    const data = await res.json()
    
    if (res.ok) {
      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    } else {
      throw new Error(data.message || 'Error sending email')
    }

  } catch (err) {
    console.error('Edge Function Error:', err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
