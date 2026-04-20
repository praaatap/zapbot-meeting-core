import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { logger, emailSentTotal } from '@echomeet/shared';

const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.SES_ENDPOINT ? { endpoint: process.env.SES_ENDPOINT } : {})
});

export const sendMeetingReportEmail = async (
  recipientEmail: string, 
  pdfBuffer: Buffer, 
  meetingId: string,
  requestId: string
) => {
  try {
    logger.info(`Sending raw email via SES to ${recipientEmail}`, { requestId, meetingId });

    // Construct raw email with attachment
    // In a real app, use 'nodemailer' with SES transport for easier multi-part messages
    // but here we demonstrate the direct SDK usage as requested.
    const boundary = 'NextPart';
    const rawEmail = [
      `From: EchoMeet <${process.env.SES_FROM_EMAIL}>`,
      `To: ${recipientEmail}`,
      `Subject: Meeting Report Ready - ID ${meetingId}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      'Your meeting report is ready. Please find the attached PDF.',
      '',
      `--${boundary}`,
      `Content-Type: application/pdf; name="MeetingReport_${meetingId}.pdf"`,
      'Content-Description: Meeting Report PDF',
      'Content-Disposition: attachment; filename="MeetingReport_' + meetingId + '.pdf"; size=' + pdfBuffer.length,
      'Content-Transfer-Encoding: base64',
      '',
      pdfBuffer.toString('base64'),
      '',
      `--${boundary}--`
    ].join('\n');

    const command = new SendRawEmailCommand({
      RawMessage: {
        Data: Buffer.from(rawEmail)
      }
    });

    await sesClient.send(command);
    emailSentTotal.inc({ status: 'success' });
    logger.info('Email sent successfully', { requestId });
  } catch (error) {
    emailSentTotal.inc({ status: 'failed' });
    logger.error('Failed to send email', { requestId, error });
    throw error;
  }
};
