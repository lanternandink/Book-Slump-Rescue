export function sendNewsletter(recipients, subject, content, newsletterType) {
  let sentCount = 0;
  for (const recipient of recipients) {
    console.log(`Email sent to ${recipient.email} for ${newsletterType}`);
    sentCount++;
  }
  console.log(`Simulated newsletter sent to ${sentCount} recipients`);
  return sentCount;
}
