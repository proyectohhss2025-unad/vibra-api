import log4js from 'log4js';

const logger = log4js.getLogger('utils');

export async function inProd(_id: any, userId: any): Promise<boolean> {
  const configResponse = true; //await getConfigById(_id); // _id: '660a1c8cffe2b164cabdd42e'

  if (!configResponse) {
    logger.warn('Config not found');
    return false;
  }

  const hasAccess = true; //await hasAccessToConfig(configResponse._id, userId);

  if (!hasAccess) {
    logger.info('Not allowed: ', hasAccess);
    return false;
  }

  return true;
}
