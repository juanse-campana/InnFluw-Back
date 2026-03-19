import { Resend } from 'resend';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const resend = config.email.apiKey ? new Resend(config.email.apiKey) : null;

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  if (!resend) {
    logger.warn('Email service not configured - skipping email send', { to: options.to });
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: config.email.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      logger.error('Failed to send email', { error, to: options.to });
      return false;
    }

    logger.info('Email sent successfully', { id: data?.id, to: options.to });
    return true;
  } catch (error) {
    logger.error('Email service error', { error });
    return false;
  }
};

export const sendWelcomeEmail = async (email: string, name: string): Promise<boolean> => {
  const html = `
    <h1>¡Bienvenido a Instant Drop, ${name}!</h1>
    <p>Gracias por registrarte. Estamos emocionados de tenerte aquí.</p>
    <p>Con Instant Drop puedes crear drops de productos increíbles para tu audiencia.</p>
    <p>¿Listo para empezar? Inicia sesión y crea tu primer drop.</p>
    <br />
    <p>¡Saludos,<br />El equipo de Instant Drop</p>
  `;

  return sendEmail({
    to: email,
    subject: '¡Bienvenido a Instant Drop! 🎉',
    html,
  });
};

export const sendOtpEmail = async (email: string, code: string): Promise<boolean> => {
  const html = `
    <h1>Tu código de verificación</h1>
    <p>Usa el siguiente código para iniciar sesión:</p>
    <div style="font-size: 32px; font-weight: bold; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px;">
      ${code}
    </div>
    <p>Este código expira en 5 minutos.</p>
    <p>Si no solicitaste este código, puedes ignorar este email.</p>
    <br />
    <p>¡Saludos,<br />El equipo de Instant Drop</p>
  `;

  return sendEmail({
    to: email,
    subject: 'Tu código de verificación de Instant Drop',
    html,
  });
};

export const sendOrderConfirmationToBuyer = async (
  email: string,
  buyerName: string,
  orderDetails: {
    orderId: string;
    dropTitle: string;
    total: number;
    confirmationToken: string;
  }
): Promise<boolean> => {
  const confirmationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/v1/orders/confirm/${orderDetails.confirmationToken}`;

  const html = `
    <h1>¡Gracias por tu compra, ${buyerName}!</h1>
    <p>Tu pedido ha sido recibido y está pendiente de confirmación.</p>
    
    <h2>Detalles del pedido</h2>
    <ul>
      <li><strong>Producto:</strong> ${orderDetails.dropTitle}</li>
      <li><strong>Total:</strong> $${orderDetails.total.toFixed(2)}</li>
      <li><strong>ID de pedido:</strong> ${orderDetails.orderId}</li>
    </ul>
    
    <p>Por favor, confirma tu compra haciendo clic en el siguiente enlace:</p>
    <a href="${confirmationUrl}" style="display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px;">
      Confirmar mi compra
    </a>
    <p>O copia este enlace: ${confirmationUrl}</p>
    
    <p>Si no confirmas tu compra en 24 horas, el pedido será cancelado.</p>
    <br />
    <p>¡Gracias por tu compra!</p>
  `;

  return sendEmail({
    to: email,
    subject: `Confirmación de tu pedido #${orderDetails.orderId}`,
    html,
  });
};

export const sendOrderNotificationToInfluencer = async (
  email: string,
  influencerName: string,
  orderDetails: {
    orderId: string;
    dropTitle: string;
    buyerName: string;
    buyerEmail: string;
    total: number;
    discount: number;
  }
): Promise<boolean> => {
  const html = `
    <h1>Nueva venta en ${orderDetails.dropTitle}!</h1>
    <p>¡Felicitaciones, ${influencerName}! Has recibido una nueva venta.</p>
    
    <h2>Detalles de la orden</h2>
    <ul>
      <li><strong>ID de orden:</strong> ${orderDetails.orderId}</li>
      <li><strong>Producto:</strong> ${orderDetails.dropTitle}</li>
      <li><strong>Comprador:</strong> ${orderDetails.buyerName}</li>
      <li><strong>Email del comprador:</strong> ${orderDetails.buyerEmail}</li>
      <li><strong>Subtotal:</strong> $${(orderDetails.total + orderDetails.discount).toFixed(2)}</li>
      ${orderDetails.discount > 0 ? `<li><strong>Descuento aplicado:</strong> -$${orderDetails.discount.toFixed(2)}</li>` : ''}
      <li><strong>Total:</strong> $${orderDetails.total.toFixed(2)}</li>
    </ul>
    
    <p>Revisa tu dashboard para más detalles.</p>
    <br />
    <p>¡Sigue así!<br />El equipo de Instant Drop</p>
  `;

  return sendEmail({
    to: email,
    subject: `🎉 ¡Nueva venta! - ${orderDetails.dropTitle}`,
    html,
  });
};

export const sendLowStockAlert = async (
  email: string,
  dropTitle: string,
  remainingStock: number
): Promise<boolean> => {
  const html = `
    <h1>⚠️ Alerta de stock bajo</h1>
    <p>Tu drop <strong>${dropTitle}</strong> está quedándose sin stock.</p>
    <p><strong>Stock restante: ${remainingStock}</strong></p>
    <p>Considera reponer el inventario para no perder ventas.</p>
    <br />
    <p>Saludos,<br />El equipo de Instant Drop</p>
  `;

  return sendEmail({
    to: email,
    subject: `⚠️ Alerta: Stock bajo en ${dropTitle}`,
    html,
  });
};
