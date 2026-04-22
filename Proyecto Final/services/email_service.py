from email.message import EmailMessage
import smtplib


class EmailService:
    def __init__(self, config):
        self.config = config

    def send_email(self, recipients: list[str], subject: str, body: str) -> tuple[bool, str]:
        cleaned = [email.strip() for email in recipients if email and email.strip()]
        if not cleaned:
            return False, "No hay destinatarios configurados."
        if not self.config.smtp_is_configured:
            return False, "SMTP no configurado. Completa las variables del .env para habilitar correos."

        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = self.config.smtp_from_email
        message["To"] = ", ".join(cleaned)
        message.set_content(body)

        try:
            with smtplib.SMTP(self.config.smtp_host, self.config.smtp_port) as server:
                server.ehlo()
                if self.config.smtp_use_tls:
                    server.starttls()
                    server.ehlo()
                server.login(self.config.smtp_user, self.config.smtp_password)
                server.send_message(message)
        except Exception as exc:
            return False, f"No fue posible enviar el correo: {exc}"

        return True, "Correo enviado correctamente."
