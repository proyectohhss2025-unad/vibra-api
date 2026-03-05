import sgMail from '@sendgrid/mail';
import * as dotenv from 'dotenv';
import log4js from "log4js";
import nodemailer from 'nodemailer';
import { envVars } from '../config/index';
import { formatDate } from "../utils/dates";
import { formatToLocalCurrency } from "../utils/money";

dotenv.config();
export const env = envVars.parse(process.env)

const logger = log4js.getLogger("default");

// Credenciales de OAuth2 obtenidas de Azure AD
const transporterWithHotmail = nodemailer.createTransport({
    service: 'hotmail',
    auth: {
        type: 'OAuth2',
        user: env.EMAIL_SEND,
        //pass: env.EMAIL_SECRET_SEND,
        clientId: env.CLIENT_ID,           // El Client ID de Azure AD
        clientSecret: env.CLIENT_SECRET,  // El Client Secret generado
        //refreshToken: 'REFRESH_TOKEN',  // Token de actualización si tienes uno (opcional)
        //accessToken: 'ACCESS_TOKEN',    // El token de acceso que obtuviste
        expires: 3599
    },
});

export const sendOTPEmail = async (email: string, otp: string, enDev = true) => {
    try {
        logger.info('Código OTP: ', { otp });
        if (!enDev) {
            sgMail.setApiKey(env.TWILIO_SENDGRID_API_KEY);
            const msg = {
                to: email,
                from: env.EMAIL_SEND, //INFO: Verified sender in sendgrid
                subject: 'Saludos desde la dashboard',
                text: 'Su código OTP se ha generado exitosamente!',
                html: `El OTP generado es: <b>${otp}</b>, por favor ingrese este código en su validación de inicio de sesión.`
            }
            sgMail.send(msg).then(() => {
                logger.info('Email enviado exitosamente');
            }).catch((error: any) => {
                logger.error('Error en el envio del correo de notificación de OTP', error, email);
            });
        }

        if (enDev) {
            logger.info('No es posible enviar el correo desde un ambiente de desarrollo');
        }
    } catch (error) {
        logger.log('Error sending email with OTP code: ', { error });
    }
};

export const sendPassGenerateAndSendEmail = async (email: string, passwordGenerate: string, enDev = true) => {
    try {
        if (!enDev) {
            sgMail.setApiKey(env.TWILIO_SENDGRID_API_KEY);
            const msg = {
                to: email,
                from: env.EMAIL_SEND, //INFO: Verified sender in sendgrid
                subject: 'Saludos desde la dashboard',
                text: 'Su nueva contraseña se ha generado exitosamente!',
                html: `Su contraseña generada es: <b>${passwordGenerate}</b>, por favor guarde esta contraseña en un lugar seguro.`
            }
            sgMail.send(msg).then(() => {
                logger.info('Email enviado exitosamente', { msg });
            }).catch((error: any) => {
                logger.error('Error en el envio del correo de notificación de nueva contraseña', error, email);
            });
        }

        if (enDev) {
            logger.info('No es posible enviar el correo desde un ambiente de desarrollo');
        }
    } catch (error) {
        logger.log('Error:', error);
    }
};

export const sendInfoJobs = async (email: string, message: string, enDev = true) => {
    try {
        if (!enDev) {
            sgMail.setApiKey(env.TWILIO_SENDGRID_API_KEY);
            const msg = {
                to: email,
                from: env.EMAIL_SEND, //INFO: Verified sender in sendgrid
                subject: 'Saludos desde la dashboard',
                text: 'La copia de seguridad se ha generado exitosamente!',
                html: `Nota: - <b>${message}</b>`
            }
            sgMail.send(msg).then(() => {
                logger.info('Email enviado exitosamente', { msg });
            }).catch((error: any) => {
                logger.error('Error en el envio del correo con la notificación del jobs generado', { error, email });
            });
        }

        if (enDev) {
            logger.info('No es posible enviar el correo desde un ambiente de desarrollo');
        }
    } catch (error) {
        logger.log('Error en sendInfoJobs method:', { error });
    }
};

export const sendInfoAccountsReceivable = async (email: string, message: string, accountsReceivable: any, amountTotalPayments: number, enDev = false) => {
    try {
        if (!enDev) {
            sgMail.setApiKey(env.TWILIO_SENDGRID_API_KEY);
            const msg = {
                to: email,
                from: env.EMAIL_SEND, //INFO: Verified sender in sendgrid
                subject: 'Saludos desde la dashboard',
                text: 'La cuenta de cobro se ha generado y notificado exitosamente!',
                html: `
        <div id='reportAccountReceivable' class="container">
            <h1 style="font:size: 2rem;">Cuenta de Cobro</h1>
            <div style="color:red;">
                <p>NIT:</p>
                <p>${accountsReceivable?.customer?.nit}</p>
            </div>
            <div className="info-section">
                <p className="label">Cliente:</p>
                <p>${accountsReceivable?.customer?.name}</p>
            </div>
            <div className="info-section">
                <p className="label">Fecha de Emisión:</p>
                <p>${formatDate(accountsReceivable?.dueDate, 'YYYY/MM/DD HH:mm:ss')}</p>
            </div>
            <h2>Detalles de la Factura</h2>
            <table>
                <thead>
                    <tr>
                        <th>Descripción</th>
                        <th>Cantidad</th>
                        <th>Valor Unitario</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>` +
                    (accountsReceivable?.invoice?.invoiceItems?.map((item) => (
                        `<tr>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td>${formatToLocalCurrency(item.unitPrice, 'es-CO')}</td>
                    <td>${formatToLocalCurrency(item.totalValue, 'es-CO')}</td>
                </tr>`
                    ))) +
                    `</tbody>
            </table>
            <div className="total">
                <p>Subtotal: ${formatToLocalCurrency(accountsReceivable?.invoice?.totalValue, 'en-US')}</p>
                <p>IVA (19%): ${formatToLocalCurrency((accountsReceivable?.invoice?.totalValue * 0.19), 'en-US')}</p>
                <p>Total: ${formatToLocalCurrency(accountsReceivable?.invoice?.totalValue, 'en-US')}</p>
            </div>
            <h2>Pagos</h2>
            <table>
                <thead>
                    <tr>
                        <th>Fecha de Pago</th>
                        <th>Valor</th>
                        <th>Método de Pago</th>
                    </tr>
                </thead>
                <tbody>` +
                    (accountsReceivable?.paymentsReceived?.map((payment) => (
                        `<tr>
                    <td>${formatDate(payment.paymentDate, 'YYYY/MM/DD HH:mm:ss')}</td>
                    <td>${formatToLocalCurrency(payment.amount, 'es-CO')}</td>
                    <td>${payment.paymentMethod}</td>
                </tr>`
                    ))) +
                    `</tbody>
            </table>
            <div className="total">
                <p>Total Pagado: ${formatToLocalCurrency(amountTotalPayments, 'en-US')}</p>
                <p>Saldo Pendiente: ${formatToLocalCurrency(Number(amountTotalPayments) - Number(accountsReceivable?.outstandingAmount), 'en-US')}</p>
            </div>
            <button className="button">Descargar Cuenta de Cobro</button>
        </div>`
            }
            sgMail.send(msg).then(() => {
                logger.info('Email enviado exitosamente', { msg });
            }).catch((error: any) => {
                logger.error('Error en el envio del correo con la notificación de cuenta de cobro', { error, email });
            });
        }
    } catch (error) {
        logger.log('Error:', error);
    }
};