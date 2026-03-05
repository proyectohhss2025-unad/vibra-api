import log4js from "log4js";
import moment from "moment";
import "moment-timezone";

declare module "moment" {
  interface Moment {
    tz: {
      setDefault(timezone: string): void;
    };
  }
}

const logger = log4js.getLogger("default");

//moment.tz.setDefault("America/Bogota");

export const validateDate = (
  dateString: string,
): { respDate: boolean; msg: string } => {
  if (!moment(dateString).isValid()) {
    logger.error(`The string "${dateString}" is not a valid date with moment.`);
    return {
      respDate: false,
      msg: `The string "${dateString}" is not a valid date with moment.`,
    };
  }

  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    logger.error(`The date "${dateString}" is not valid.`);
    return { respDate: false, msg: `The date "${dateString}" is not valid.` };
  }

  const today = new Date();
  const dateYesterday = new Date();
  dateYesterday.setDate(today.getDate() - 1);
  if (date < dateYesterday) {
    logger.error(`The date "${dateString}" cannot be in the past.`);
    return {
      respDate: false,
      msg: `The date "${dateString}" cannot be in the past.`,
    };
  }

  return { respDate: true, msg: "Validation success" };
};

export function convertDateToDateMongoose(fechaString: string): Date {
  // Validar si la cadena de fecha tiene el formato correcto
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(fechaString) && !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fechaString) &&
    !/^\d{4}\/\d{2}\/\d{2}$/.test(fechaString) && !/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(fechaString) &&
    !/^\d{4}\-\d{2}\-\d{2}$/.test(fechaString) && !/^\d{4}\-\d{1,2}\-\d{1,2}$/.test(fechaString)) {
    throw new Error('Formato de fecha inválido. Debe ser DD/MM/YYYY o D/M/YYYY o YYYY/MM/DD');
  }

  // Convertir la cadena de fecha a un objeto de fecha de JavaScript
  const fecha = moment(fechaString, ['DD/MM/YYYY', 'D/M/YYYY', 'YYYY/MM/DD', 'YYYY/M/D', 'YYYY-MM-DD', 'YYYY-M-D']);

  // Validar si la conversión fue exitosa
  if (!fecha.isValid()) {
    throw new Error('Fecha inválida');
  }

  // Devolver el objeto de fecha de JavaScript (que MongoDB entenderá)
  return fecha.toDate();
}


// Ejemplo de uso:
// const fechaParaGuardar = convertirFechaAMongoose('10/01/2024');