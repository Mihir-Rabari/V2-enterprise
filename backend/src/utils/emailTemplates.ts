// ─────────────────────────────────────────────────────────────────────────────
//  V2 Fashion — Luxury Email Templates
//  Design target: clean, monochrome, typographically premium.
//  All fonts are web-safe or system. No external CDN dependencies.
// ─────────────────────────────────────────────────────────────────────────────

const BASE_STYLES = `
  body { margin: 0; padding: 0; background: #F5F4F0; font-family: Georgia, 'Times New Roman', serif; }
  table { border-collapse: collapse; }
  a { color: #C9A96E; text-decoration: none; }
  a:hover { text-decoration: underline; }
`;

const wrapper = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>V2 Fashion</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F0; padding: 40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">

        <!-- HEADER -->
        <tr>
          <td style="background:#0A0A0B; padding:36px 48px; text-align:center;">
            <div style="font-family:Georgia,serif; letter-spacing:0.6em; font-size:22px; color:#C9A96E; font-weight:400;">V2</div>
            <div style="font-family:Arial,sans-serif; letter-spacing:0.35em; font-size:9px; color:#666; text-transform:uppercase; margin-top:4px;">Fashion House</div>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="background:#FFFFFF; padding:52px 48px;">
            ${content}
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#0A0A0B; padding:28px 48px; text-align:center;">
            <p style="margin:0; font-family:Arial,sans-serif; font-size:9px; letter-spacing:0.25em; text-transform:uppercase; color:#555;">
              © 2026 V2 Fashion · <a href="mailto:hello@v2fashion.com" style="color:#C9A96E;">hello@v2fashion.com</a>
            </p>
            <p style="margin:8px 0 0; font-family:Arial,sans-serif; font-size:8px; letter-spacing:0.15em; text-transform:uppercase; color:#444;">
              Ground Floor, Bhavnagar, Gujarat
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
`;

const divider = () => `<hr style="border:none; border-top:1px solid #F0EDE6; margin:32px 0;" />`;

const sectionLabel = (text: string) => `
  <p style="margin:0 0 10px; font-family:Arial,sans-serif; font-size:9px; letter-spacing:0.3em; text-transform:uppercase; color:#C9A96E;">${text}</p>
`;

// ─────────────────────────────────────────────────────────────────────────────
//  1. FORGOT PASSWORD EMAIL
// ─────────────────────────────────────────────────────────────────────────────
export const forgotPasswordTemplate = (name: string, resetUrl: string) => {
    const content = `
    ${sectionLabel('Account Security')}
    <h1 style="margin:0 0 20px; font-family:Georgia,serif; font-size:28px; font-weight:400; color:#0A0A0B; letter-spacing:0.02em;">
      Password Reset
    </h1>
    <p style="margin:0 0 16px; font-family:Arial,sans-serif; font-size:14px; line-height:1.7; color:#555;">
      Hello ${name},
    </p>
    <p style="margin:0 0 32px; font-family:Arial,sans-serif; font-size:14px; line-height:1.7; color:#555;">
      We received a request to reset the password for your V2 account. Click the button below to create a new password. This link expires in <strong>1 hour</strong>.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:8px 0 40px;">
          <a href="${resetUrl}" style="display:inline-block; background:#0A0A0B; color:#C9A96E; font-family:Arial,sans-serif; font-size:10px; letter-spacing:0.35em; text-transform:uppercase; padding:18px 48px; text-decoration:none; border:1px solid #C9A96E;">
            Reset Password
          </a>
        </td>
      </tr>
    </table>

    ${divider()}
    <p style="margin:0; font-family:Arial,sans-serif; font-size:12px; line-height:1.7; color:#888;">
      If you didn't request a password reset, you can safely ignore this email. Your password will not change. For security, this link will only be active for 1 hour.
    </p>
    <p style="margin:16px 0 0; font-family:Arial,sans-serif; font-size:11px; color:#aaa; word-break:break-all;">
      Or copy this link: <a href="${resetUrl}" style="color:#C9A96E;">${resetUrl}</a>
    </p>
  `;
    return wrapper(content);
};

// ─────────────────────────────────────────────────────────────────────────────
//  2. ORDER PLACED EMAIL
// ─────────────────────────────────────────────────────────────────────────────
interface OrderItem {
    productName: string;
    productPhoto?: string;
    quantity: number;
    size?: string;
    color?: string;
    priceAtTime: number;
}
interface OrderEmailData {
    orderId: string;
    name: string;
    items: OrderItem[];
    total: number;
    discount: number;
    method: string;
    address: string;
    phone: string;
    createdAt?: Date;
}

export const orderPlacedTemplate = (data: OrderEmailData) => {
    const subtotal = data.total + data.discount;

    const itemRows = data.items.map(item => `
    <tr style="border-bottom:1px solid #F0EDE6;">
      <td style="padding:16px 0;">
        <p style="margin:0; font-family:Georgia,serif; font-size:14px; color:#0A0A0B;">${item.productName}</p>
        <p style="margin:4px 0 0; font-family:Arial,sans-serif; font-size:11px; color:#888; letter-spacing:0.1em;">
          ${[item.size && `SIZE: ${item.size}`, item.color && `COLOR: ${item.color}`].filter(Boolean).join(' · ')}
        </p>
      </td>
      <td style="padding:16px 0 16px 16px; text-align:right; font-family:Arial,sans-serif; font-size:13px; color:#0A0A0B; white-space:nowrap;">
        ₹${item.priceAtTime.toLocaleString('en-IN')} × ${item.quantity}
      </td>
    </tr>
  `).join('');

    const content = `
    ${sectionLabel('Order Confirmation')}
    <h1 style="margin:0 0 8px; font-family:Georgia,serif; font-size:28px; font-weight:400; color:#0A0A0B; letter-spacing:0.02em;">
      Thank You, ${data.name.split(' ')[0]}.
    </h1>
    <p style="margin:0 0 32px; font-family:Arial,sans-serif; font-size:14px; line-height:1.7; color:#555;">
      Your order has been received and is being processed. We'll update you as it moves through our atelier.
    </p>

    <!-- Order ID Box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F0; margin-bottom:32px;">
      <tr>
        <td style="padding:20px 24px;">
          <span style="font-family:Arial,sans-serif; font-size:9px; letter-spacing:0.3em; text-transform:uppercase; color:#888;">Order Reference</span>
          <p style="margin:6px 0 0; font-family:Georgia,serif; font-size:20px; color:#0A0A0B; letter-spacing:0.05em;">${data.orderId}</p>
        </td>
      </tr>
    </table>

    <!-- Items -->
    ${sectionLabel('Your Selection')}
    <table width="100%" cellpadding="0" cellspacing="0">
      ${itemRows}
    </table>

    <!-- Totals -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr>
        <td style="font-family:Arial,sans-serif; font-size:12px; color:#888; padding:6px 0;">Subtotal</td>
        <td style="font-family:Arial,sans-serif; font-size:12px; color:#888; padding:6px 0; text-align:right;">₹${subtotal.toLocaleString('en-IN')}</td>
      </tr>
      ${data.discount > 0 ? `
      <tr>
        <td style="font-family:Arial,sans-serif; font-size:12px; color:#C9A96E; padding:6px 0;">Discount</td>
        <td style="font-family:Arial,sans-serif; font-size:12px; color:#C9A96E; padding:6px 0; text-align:right;">−₹${data.discount.toLocaleString('en-IN')}</td>
      </tr>` : ''}
      <tr>
        <td colspan="2" style="padding:8px 0;"><hr style="border:none; border-top:1px solid #0A0A0B; margin:0;"/></td>
      </tr>
      <tr>
        <td style="font-family:Georgia,serif; font-size:16px; color:#0A0A0B; padding:8px 0; font-weight:bold;">Total</td>
        <td style="font-family:Georgia,serif; font-size:16px; color:#0A0A0B; padding:8px 0; text-align:right; font-weight:bold;">₹${data.total.toLocaleString('en-IN')}</td>
      </tr>
    </table>

    ${divider()}

    <!-- Shipping & Payment -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="50%" style="padding-right:16px; vertical-align:top;">
          ${sectionLabel('Shipping To')}
          <p style="margin:0; font-family:Arial,sans-serif; font-size:13px; line-height:1.7; color:#333;">${data.address}</p>
          <p style="margin:8px 0 0; font-family:Arial,sans-serif; font-size:12px; color:#888;">${data.phone}</p>
        </td>
        <td width="50%" style="padding-left:16px; vertical-align:top;">
          ${sectionLabel('Payment Method')}
          <p style="margin:0; font-family:Arial,sans-serif; font-size:13px; color:#333;">${data.method === 'cod' || data.method === 'COD' ? 'Cash on Delivery' : data.method === 'pickup' ? 'Store Pickup' : 'Prepaid – Razorpay'}</p>
        </td>
      </tr>
    </table>

    ${divider()}
    <p style="margin:0; font-family:Arial,sans-serif; font-size:12px; line-height:1.7; color:#888; text-align:center;">
      Questions? Reply to this email or contact us at <a href="mailto:hello@v2fashion.com" style="color:#C9A96E;">hello@v2fashion.com</a>
    </p>
  `;
    return wrapper(content);
};

// ─────────────────────────────────────────────────────────────────────────────
//  3. ORDER STATUS CHANGED EMAIL
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_DETAILS: Record<string, { label: string; color: string; message: string; icon: string }> = {
    CONFIRMED: {
        label: 'Order Confirmed',
        color: '#2D6A4F',
        message: 'Your order has been confirmed and is being prepared with care.',
        icon: '✓',
    },
    PROCESSING: {
        label: 'Being Prepared',
        color: '#C9A96E',
        message: 'Our team is carefully preparing your order for dispatch.',
        icon: '◎',
    },
    SHIPPED: {
        label: 'Dispatched',
        color: '#1D4E89',
        message: 'Your order has left our atelier and is on its way to you.',
        icon: '→',
    },
    DELIVERED: {
        label: 'Delivered',
        color: '#1B4332',
        message: 'Your order has been delivered. We hope you love it.',
        icon: '⬥',
    },
    CANCELLED: {
        label: 'Order Cancelled',
        color: '#7B2D2D',
        message: 'Your order has been cancelled. If this was unexpected, please contact us.',
        icon: '✕',
    },
    PENDING: {
        label: 'Pending',
        color: '#888',
        message: 'Your order is awaiting confirmation.',
        icon: '◌',
    },
};

export const orderStatusTemplate = (
    name: string,
    orderId: string,
    status: string,
    awbNumber?: string,
    trackingLink?: string
) => {
    const details = STATUS_DETAILS[status] || STATUS_DETAILS.PENDING;

    const trackingSection = (awbNumber || trackingLink) ? `
    ${divider()}
    ${sectionLabel('Tracking Information')}
    ${awbNumber ? `<p style="margin:0 0 8px; font-family:Arial,sans-serif; font-size:13px; color:#333;"><strong>AWB / Tracking No:</strong> ${awbNumber}</p>` : ''}
    ${trackingLink ? `<a href="${trackingLink}" style="display:inline-block; margin-top:8px; font-family:Arial,sans-serif; font-size:10px; letter-spacing:0.25em; text-transform:uppercase; color:#C9A96E; border-bottom:1px solid #C9A96E; padding-bottom:2px;">Track Your Order →</a>` : ''}
  ` : '';

    const content = `
    ${sectionLabel('Order Update')}
    <h1 style="margin:0 0 32px; font-family:Georgia,serif; font-size:28px; font-weight:400; color:#0A0A0B; letter-spacing:0.02em;">
      Hello, ${name.split(' ')[0]}.
    </h1>

    <!-- Status Badge -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="background:${details.color}1A; border-left:3px solid ${details.color}; padding:20px 24px;">
          <span style="font-family:Arial,sans-serif; font-size:10px; letter-spacing:0.3em; text-transform:uppercase; color:${details.color};">${details.icon} ${details.label}</span>
          <p style="margin:8px 0 0; font-family:Arial,sans-serif; font-size:13px; line-height:1.6; color:#444;">${details.message}</p>
        </td>
      </tr>
    </table>

    <!-- Order Ref -->
    <p style="margin:0 0 8px; font-family:Arial,sans-serif; font-size:12px; color:#888; letter-spacing:0.15em; text-transform:uppercase;">
      Order Reference
    </p>
    <p style="margin:0 0 32px; font-family:Georgia,serif; font-size:20px; color:#0A0A0B; letter-spacing:0.05em;">
      ${orderId}
    </p>

    ${trackingSection}

    ${divider()}
    <p style="margin:0; font-family:Arial,sans-serif; font-size:12px; line-height:1.7; color:#888; text-align:center;">
      Questions? Contact us at <a href="mailto:hello@v2fashion.com" style="color:#C9A96E;">hello@v2fashion.com</a>
    </p>
  `;
    return wrapper(content);
};

// ─────────────────────────────────────────────────────────────────────────────
//  4. WELCOME EMAIL
// ─────────────────────────────────────────────────────────────────────────────
export const welcomeTemplate = (name: string) => {
    const content = `
    ${sectionLabel('Welcome')}
    <h1 style="margin:0 0 20px; font-family:Georgia,serif; font-size:32px; font-weight:400; color:#0A0A0B; letter-spacing:0.02em; line-height:1.2;">
      Welcome to<br/>V2 Fashion.
    </h1>
    <p style="margin:0 0 16px; font-family:Arial,sans-serif; font-size:14px; line-height:1.8; color:#555;">
      Hello ${name},
    </p>
    <p style="margin:0 0 32px; font-family:Arial,sans-serif; font-size:14px; line-height:1.8; color:#555;">
      Your account has been created. Welcome to a world of considered design and premium craftsmanship. Explore our latest collections below.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:8px 0 40px;">
          <a href="https://v2fashion.com/shop" style="display:inline-block; background:#0A0A0B; color:#C9A96E; font-family:Arial,sans-serif; font-size:10px; letter-spacing:0.35em; text-transform:uppercase; padding:18px 48px; text-decoration:none; border:1px solid #C9A96E;">
            Explore Now
          </a>
        </td>
      </tr>
    </table>
  `;
    return wrapper(content);
};
