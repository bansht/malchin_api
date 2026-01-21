// OTP utility functions
import axios from "axios";
import crypto from "crypto";

/**
 * Generate a 6-digit OTP code
 * @returns {string} 6-digit OTP code
 */
export function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Get OTP expiry time (5 minutes from now)
 * @returns {Date} OTP expiry timestamp
 */
export function getOTPExpiry() {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 5);
  return expiry;
}

/**
 * Send OTP via Skytel SMS API
 * @param {string} phone
 * @param {string} otp
 * @returns {Promise<boolean>}
 */
export async function sendOTPViaSMS(phone, otp) {
  const phoneFormats = [phone, phone.replace(/^0/, '976'), `976${phone}`];
  for (const phoneFormat of phoneFormats) {
    try {
      const message = `Tanii OTP code: ${otp}`;

      const response = await axios.get(
        `http://web2sms.skytel.mn/apiSend?token=5f280e58312cea53247b8ab011686190a1a5ebc1&sendto=${phoneFormat}&message=${encodeURIComponent(message)}`,
      );
      const data = response.data;

      if (data && data.sent_count > 0) {
        console.log(
          `✅ SUCCESS! SMS sent with format: ${phoneFormat}, count: ${data.sent_count}`,
        );
        return true;
      } else {
        console.log(
          `⚠️  Format ${phoneFormat} failed: ${data?.message || "sent_count = 0"}`,
        );
      }     
    } catch (error) {
      console.log(`❌ Format ${phoneFormat} error:`, error.message);
    }
  }

  throw new Error(
    `SMS илгээгдсэнгүй. Skytel token шалгана уу: https://web2sms.skytel.mn/`,
  );
}
/**
 * @param {string} providedOTP
 * @param {string} storedOTP 
 * @param {Date} otpExpiry 
 * @returns {boolean} 
 */
export function verifyOTP(providedOTP, storedOTP, otpExpiry) {
  if (!providedOTP || !storedOTP || !otpExpiry) {
    return false;
  }

  const now = new Date();
  if (now > new Date(otpExpiry)) {
    return false;
  }

  return providedOTP === storedOTP;
}
