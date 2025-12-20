import FormData from "form-data"; // form-data v4.0.1
import Mailgun from "mailgun.js"; // mailgun.js v11.1.0

async function sendSimpleMessage() {
  const mailgun = new Mailgun(FormData);
  const mg = mailgun.client({
    username: "api",
    key: "2875bdccd64bb0821980e1f8309e1e4a-96164d60-93580bc5",
    // When you have an EU-domain, you must specify the endpoint:
    // url: "https://api.eu.mailgun.net"
  });
  try {
    const data = await mg.messages.create("sandbox60dd8d3be80e4e42a9f0646c2601da7a.mailgun.org", {
      from: "Mailgun Sandbox <postmaster@sandbox60dd8d3be80e4e42a9f0646c2601da7a.mailgun.org>",
      to: ["Briton cheruyot <mearstybriton@gmail.com>"],
      subject: "Hello Briton cheruyot",
      text: "Congratulations Briton cheruyot, you just sent an email with Mailgun! You are truly awesome!",
    });

    console.log(data); // logs response data
  } catch (error) {
    console.log(error); //logs any error
  }
}