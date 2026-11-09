// ─── Envío de mails (Gmail u otro servidor SMTP) ────────────────────────────
// Variables: SMTP_USER (tu Gmail), SMTP_PASS (contraseña de aplicación de Google).
// Opcionales: SMTP_HOST (smtp.gmail.com), SMTP_PORT (465), MAIL_FROM.
import nodemailer from 'nodemailer';
import { ErrorApi } from './http.js';

let transporte = null;

function configurado() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function obtenerTransporte() {
  if (transporte) return transporte;
  const puerto = Number(process.env.SMTP_PORT || 465);
  transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: puerto,
    secure: puerto === 465,
    // Las contraseñas de aplicación de Google se muestran con espacios: se los sacamos
    auth: { user: process.env.SMTP_USER, pass: /gmail/.test(process.env.SMTP_HOST || 'smtp.gmail.com') ? process.env.SMTP_PASS.replace(/\s+/g, '') : process.env.SMTP_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });
  return transporte;
}

export async function enviarCorreo({ para, asunto, html, texto }) {
  if (!configurado()) {
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      throw new ErrorApi(503, 'El envío de mails todavía no está configurado. Avisale al administrador.');
    }
    // En desarrollo, sin SMTP, el mail se muestra en la consola
    console.log(`\n✉  [mail de prueba] Para: ${para}\n   Asunto: ${asunto}\n   ${texto.replace(/\n/g, '\n   ')}\n`);
    return;
  }
  const remitente = process.env.MAIL_FROM || `Plomada <${process.env.SMTP_USER}>`;
  try {
    await obtenerTransporte().sendMail({ from: remitente, to: para, subject: asunto, html, text: texto });
  } catch (e) {
    console.error('Error enviando mail:', e.message);
    throw new ErrorApi(502, 'No pudimos enviar el mail. Probá de nuevo en un minuto.');
  }
}

// ── Plantillas ─────────────────────────────────────────────────────────────
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function marco({ titulo, cuerpo, pie }) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)}</title></head>
<body style="margin:0;padding:0;background:#F3F0E8;font-family:Arial,Helvetica,sans-serif;color:#1C1E21;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F0E8;padding:32px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #E2DDD1;">
    <tr><td style="background:#1C1E21;padding:22px 28px;border-bottom:5px solid #F2B500;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:34px;height:34px;background:#F2B500;border-radius:8px;text-align:center;font-size:20px;line-height:34px;color:#1C1E21;font-weight:bold;">&#9660;</td>
        <td style="padding-left:12px;">
          <div style="color:#FFFFFF;font-size:20px;font-weight:bold;letter-spacing:3px;">PLOMADA</div>
          <div style="color:#A9ADB3;font-size:12px;margin-top:2px;">Costos de obra, a plomo</div>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:32px 28px 8px;">
      <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;color:#1C1E21;">${esc(titulo)}</h1>
      ${cuerpo}
    </td></tr>
    <tr><td style="padding:20px 28px 28px;color:#8C9097;font-size:12.5px;line-height:1.5;border-top:1px solid #EFEBE2;">
      ${pie}
    </td></tr>
  </table>
  <p style="color:#8C9097;font-size:11.5px;margin:16px 0 0;">Plomada · Gestión de costos para constructores</p>
</td></tr></table>
</body></html>`;
}

function cajaCodigo(codigo) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 18px;"><tr>
    <td style="background:#F3F0E8;border:1px dashed #D3CDBF;border-radius:10px;padding:16px 26px;font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:bold;letter-spacing:10px;color:#1C1E21;">${esc(codigo)}</td>
  </tr></table>`;
}

const TEXTOS = {
  registro: {
    asunto: (c) => `${c} es tu código para crear tu cuenta en Plomada`,
    titulo: 'Confirmá tu email',
    intro: (u) => `Hola <b>${esc(u)}</b>, ya casi está. Ingresá este código en Plomada para terminar de crear tu cuenta:`,
  },
  login: {
    asunto: (c) => `${c} es tu código para ingresar a Plomada`,
    titulo: 'Tu código para ingresar',
    intro: (u) => `Hola <b>${esc(u)}</b>, alguien (seguramente vos) está ingresando a tu cuenta. Usá este código para terminar:`,
  },
  recuperar: {
    asunto: (c) => `${c} es tu código para recuperar tu cuenta de Plomada`,
    titulo: 'Recuperá tu cuenta',
    intro: (u) => `Hola <b>${esc(u)}</b>, pediste cambiar tu contraseña. Ingresá este código y elegí una nueva:`,
  },
};

export function mailCodigo(proposito, codigo, usuario, minutos) {
  const t = TEXTOS[proposito];
  const cuerpo = `<p style="margin:0;font-size:15px;line-height:1.55;color:#3A4047;">${t.intro(usuario)}</p>
    ${cajaCodigo(codigo)}
    <p style="margin:0 0 8px;font-size:14px;color:#5F646B;">El código vence en <b>${minutos} minutos</b> y se puede usar una sola vez.</p>`;
  const pie = `Si no fuiste vos, ignorá este mail: nadie puede entrar a tu cuenta sin este código.${proposito === 'login' ? ' Te recomendamos cambiar tu contraseña.' : ''}<br>Nunca te vamos a pedir este código por teléfono ni por WhatsApp.`;
  return {
    asunto: t.asunto(codigo),
    html: marco({ titulo: t.titulo, cuerpo, pie }),
    texto: `${t.titulo}\n\nTu código es: ${codigo}\nVence en ${minutos} minutos.\n\nSi no fuiste vos, ignorá este mail.`,
  };
}

export function mailContrasenaCambiada(usuario) {
  const cuerpo = `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#3A4047;">Hola <b>${esc(usuario)}</b>, la contraseña de tu cuenta de Plomada se cambió recién y cerramos las sesiones abiertas en otros dispositivos.</p>`;
  const pie = 'Si no fuiste vos, recuperá tu cuenta ya mismo desde "¿Olvidaste tu contraseña?" en la pantalla de ingreso.';
  return {
    asunto: 'Tu contraseña de Plomada se cambió',
    html: marco({ titulo: 'Contraseña actualizada', cuerpo, pie }),
    texto: `Hola ${usuario}, la contraseña de tu cuenta de Plomada se cambió. Si no fuiste vos, recuperá tu cuenta desde "¿Olvidaste tu contraseña?".`,
  };
}
